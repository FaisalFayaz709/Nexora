import { Prisma, withTransaction, type TransactionClient } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { BusinessEventWriter } from '../../core/events/business-event-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import { InventoryRepository } from './inventory.repository.js';
import { assertCanReserve } from './inventory-core-policy.js';
import { StockReservationRepository } from './stock-reservation.repository.js';

export class StockReservationService {
  constructor(
    private readonly inventory = new InventoryRepository(),
    private readonly reservations = new StockReservationRepository(),
    private readonly auditWriter = new AuditWriter(),
    private readonly eventWriter = new BusinessEventWriter(),
  ) {}

  async reserve(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    input: { productId: string; warehouseId: string; projectId: string; quantity: string },
  ) {
    await this.assertWarehouse(tenant, input.warehouseId);
    const product = await this.inventory.getProduct(tenant.organizationId, input.productId);
    if (!product) throw new AppError(400, 'INVENTORY_PRODUCT_INVALID', 'Product does not exist in the active organization.');
    const qty = new Prisma.Decimal(input.quantity);

    return withTransaction(async (tx) => {
      await this.inventory.assertStockNotFrozen(tx, { organizationId: tenant.organizationId, warehouseId: input.warehouseId });
      const balance = await this.inventory.lockBalance(tx, {
        organizationId: tenant.organizationId,
        warehouseId: input.warehouseId,
        productId: input.productId,
      });
      assertCanReserve(balance, qty);

      const nextReserved = balance.reserved.add(qty);
      await this.inventory.updateBalance(tx, balance.id, { reserved: nextReserved });

      const reservation = await this.reservations.withDb(tx).create({
        organizationId: tenant.organizationId,
        productId: input.productId,
        warehouseId: input.warehouseId,
        projectId: input.projectId,
        qty,
      });

      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'INVENTORY_RESERVATION_CREATED',
        subjectType: 'StockReservation',
        subjectId: reservation.id,
        afterJson: {
          productId: input.productId, warehouseId: input.warehouseId,
          projectId: input.projectId, qty: qty.toString(), status: reservation.status,
        },
        ip: actor.ip,
      });

      await this.eventWriter.append(tx, {
        organizationId: tenant.organizationId,
        type: 'stock.reservation.created',
        aggregateType: 'StockReservation',
        aggregateId: reservation.id,
        payload: {
          productId: input.productId,
          warehouseId: input.warehouseId,
          projectId: input.projectId,
          qty: qty.toString(),
        },
      });

      await this.appendLowStockEventIfNeeded(
        tx, tenant.organizationId, product, input.warehouseId, balance.onHand, nextReserved,
      );

      return {
        id: reservation.id, productId: reservation.productId,
        warehouseId: reservation.warehouseId, projectId: reservation.projectId,
        qty: reservation.qty.toString(), status: reservation.status,
      };
    });
  }

  async release(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
  ) {
    return withTransaction(async (tx) => {
      const reservation = await this.reservations.lockReservation(tx, tenant.organizationId, id);
      if (!reservation) throw new AppError(404, 'INVENTORY_RESERVATION_NOT_FOUND', 'Stock reservation not found.');
      if (reservation.status !== 'ACTIVE') {
        throw new AppError(409, 'INVENTORY_RESERVATION_INVALID_STATE', 'Only ACTIVE stock reservations can be released.');
      }

      await this.assertWarehouse(tenant, reservation.warehouseId);
      await this.inventory.assertStockNotFrozen(tx, { organizationId: tenant.organizationId, warehouseId: reservation.warehouseId });

      const balance = await this.inventory.lockBalance(tx, {
        organizationId: tenant.organizationId,
        warehouseId: reservation.warehouseId,
        productId: reservation.productId,
      });
      const nextReserved = balance.reserved.sub(reservation.qty);
      if (nextReserved.isNegative()) {
        throw new AppError(409, 'INVENTORY_RESERVATION_BALANCE_CORRUPT', 'Reservation balance would become negative.');
      }

      await this.inventory.updateBalance(tx, balance.id, { reserved: nextReserved });
      const released = await this.reservations.markReleased(tx, id);

      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'INVENTORY_RESERVATION_RELEASED',
        subjectType: 'StockReservation',
        subjectId: id,
        beforeJson: { status: 'ACTIVE', qty: reservation.qty.toString() },
        afterJson: { status: released.status },
        ip: actor.ip,
      });

      await this.eventWriter.append(tx, {
        organizationId: tenant.organizationId,
        type: 'stock.reservation.released',
        aggregateType: 'StockReservation',
        aggregateId: released.id,
        payload: {
          productId: released.productId,
          warehouseId: released.warehouseId,
          projectId: released.projectId,
          qty: released.qty.toString(),
        },
      });

      return {
        id: released.id, productId: released.productId,
        warehouseId: released.warehouseId, projectId: released.projectId,
        qty: released.qty.toString(), status: released.status,
      };
    });
  }

  private async assertWarehouse(tenant: TenantRequestContext, warehouseId: string) {
    const warehouse = await this.inventory.getWarehouse(tenant.organizationId, warehouseId);
    if (!warehouse) throw new AppError(404, 'INVENTORY_WAREHOUSE_NOT_FOUND', 'Warehouse not found.');
    if (warehouse.status !== 'ACTIVE') throw new AppError(409, 'INVENTORY_WAREHOUSE_INACTIVE', 'Warehouse is not active.');
    if (tenant.branchId && warehouse.branchId !== tenant.branchId) {
      throw new AppError(403, 'INVENTORY_BRANCH_SCOPE_DENIED', 'Warehouse is outside the active branch scope.');
    }
    return warehouse;
  }

  private async appendLowStockEventIfNeeded(
    tx: TransactionClient,
    organizationId: string,
    product: NonNullable<Awaited<ReturnType<InventoryRepository['getProduct']>>>,
    warehouseId: string,
    onHand: Prisma.Decimal,
    reserved: Prisma.Decimal,
  ) {
    if (!product.minStock) return;
    const available = onHand.sub(reserved);
    const minStock = new Prisma.Decimal(product.minStock.toString());
    if (available.greaterThanOrEqualTo(minStock)) return;
    await this.eventWriter.append(tx, {
      organizationId,
      type: 'stock.low',
      aggregateType: 'Product',
      aggregateId: product.id,
      payload: {
        warehouseId,
        available: available.toString(),
        minStock: minStock.toString(),
      },
    });
  }
}
