import { Prisma, withTransaction, type TransactionClient } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { BusinessEventWriter } from '../../core/events/business-event-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { NumberSequenceFacade } from '../platform/number-sequence/index.js';
import { InventoryRepository } from './inventory.repository.js';
import { StockTransferRepository } from './stock-transfer.repository.js';

function decimalSum(values: Prisma.Decimal[]): Prisma.Decimal {
  return values.reduce((sum, value) => sum.add(value), new Prisma.Decimal(0));
}

function requireWholeNumber(value: Prisma.Decimal): number {
  if (!value.isInteger()) {
    throw new AppError(400, 'INVENTORY_SERIAL_QUANTITY_INVALID', 'Serial-tracked quantity must be a whole number.');
  }
  return value.toNumber();
}

export class StockTransferService {
  constructor(
    private readonly numberSequences: NumberSequenceFacade,
    private readonly inventory = new InventoryRepository(),
    private readonly transfers = new StockTransferRepository(),
    private readonly auditWriter = new AuditWriter(),
    private readonly eventWriter = new BusinessEventWriter(),
  ) {}

  async create(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    input: {
      fromWarehouseId: string;
      toWarehouseId: string;
      items: Array<{
        productId: string;
        quantity: string;
        serialNumbers?: string[];
        batches?: Array<{ lotNo: string; quantity: string }>;
      }>;
    },
  ) {
    if (input.fromWarehouseId === input.toWarehouseId) {
      throw new AppError(400, 'INVENTORY_TRANSFER_SAME_WAREHOUSE', 'Source and destination warehouses must differ.');
    }

    const from = await this.assertWarehouse(tenant, input.fromWarehouseId);
    await this.assertWarehouse(tenant, input.toWarehouseId);

    const prepared: Array<{
      productId: string;
      trackingType: string;
      qty: Prisma.Decimal;
      serialNumbers: string[];
      batches: Array<{ lotNo: string; qty: Prisma.Decimal }>;
    }> = [];

    for (const item of input.items) {
      const product = await this.inventory.getProduct(tenant.organizationId, item.productId);
      if (!product) throw new AppError(400, 'INVENTORY_PRODUCT_INVALID', 'Transfer product does not exist in the active organization.');

      const qty = new Prisma.Decimal(item.quantity);
      const serialNumbers = [...new Set(item.serialNumbers ?? [])];
      const batches = (item.batches ?? []).map((batch) => ({
        lotNo: batch.lotNo,
        qty: new Prisma.Decimal(batch.quantity),
      }));

      if (product.trackingType === 'SERIAL') {
        if (serialNumbers.length !== requireWholeNumber(qty)) {
          throw new AppError(400, 'INVENTORY_SERIAL_COUNT_MISMATCH', 'Serial count must equal transfer quantity.');
        }
      }
      if (product.trackingType === 'BATCH') {
        if (!decimalSum(batches.map((batch) => batch.qty)).equals(qty)) {
          throw new AppError(400, 'INVENTORY_BATCH_QUANTITY_MISMATCH', 'Batch allocation total must equal transfer quantity.');
        }
      }

      prepared.push({
        productId: product.id,
        trackingType: product.trackingType,
        qty,
        serialNumbers,
        batches,
      });
    }

    return this.numberSequences.withBusinessNumber({
      organizationId: tenant.organizationId,
      branchId: from.branchId,
      entityType: 'STOCK_TRANSFER',
      fiscalYear: new Date().getUTCFullYear(),
      targetType: 'StockTransfer',
      createTarget: async (tx, transferNo) => {
        const header = await this.transfers.createHeader(tx, {
          organizationId: tenant.organizationId,
          fromWarehouseId: input.fromWarehouseId,
          toWarehouseId: input.toWarehouseId,
          transferNo,
        });

        for (const item of prepared) {
          const row = await this.transfers.createItem(tx, {
            transferId: header.id,
            productId: item.productId,
            qty: item.qty,
          });

          if (item.serialNumbers.length) {
            const serialRows = await this.inventory.findSerialsByNumbers(
              tx, tenant.organizationId, item.productId, item.serialNumbers,
            );
            if (serialRows.length !== item.serialNumbers.length) {
              throw new AppError(400, 'INVENTORY_SERIAL_INVALID', 'One or more transfer serial numbers do not exist for the product.');
            }
            await this.transfers.attachSerials(tx, row.id, serialRows.map((serial) => serial.id));
          }

          if (item.batches.length) {
            const batchRows = [];
            for (const batch of item.batches) {
              const rowBatch = await this.inventory.findBatch(
                tx, tenant.organizationId, item.productId, batch.lotNo,
              );
              if (!rowBatch) {
                throw new AppError(400, 'INVENTORY_BATCH_INVALID', `Batch ${batch.lotNo} does not exist for the product.`);
              }
              batchRows.push({ batchLotId: rowBatch.id, qty: batch.qty });
            }
            await this.transfers.attachBatches(tx, row.id, batchRows);
          }
        }

        await this.auditWriter.append(tx, {
          organizationId: tenant.organizationId,
          actorUserId: actor.userId,
          action: 'INVENTORY_TRANSFER_CREATED',
          subjectType: 'StockTransfer',
          subjectId: header.id,
          afterJson: {
            transferNo, fromWarehouseId: input.fromWarehouseId,
            toWarehouseId: input.toWarehouseId, status: header.status,
          },
          ip: actor.ip,
        });

        return header;
      },
    }).then(({ target }) => ({
      id: target.id,
      transferNo: target.transferNo,
      fromWarehouseId: target.fromWarehouseId,
      toWarehouseId: target.toWarehouseId,
      status: target.status,
    }));
  }

  async dispatch(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
  ) {
    return withTransaction(async (tx) => {
      const transfer = await this.transfers.lockTransfer(tx, tenant.organizationId, id);
      if (!transfer) throw new AppError(404, 'INVENTORY_TRANSFER_NOT_FOUND', 'Stock transfer not found.');
      if (transfer.status !== 'DRAFT') {
        throw new AppError(409, 'INVENTORY_TRANSFER_INVALID_STATE', 'Only DRAFT transfers can be dispatched.');
      }

      await this.assertWarehouse(tenant, transfer.fromWarehouseId);
      await this.assertWarehouse(tenant, transfer.toWarehouseId);
      await this.inventory.assertStockNotFrozen(tx, { organizationId: tenant.organizationId, warehouseId: transfer.fromWarehouseId });

      const items = await this.transfers.items(tx, transfer.id);
      for (const item of items) {
        await this.inventory.applyOnHandDelta(tx, {
          organizationId: tenant.organizationId,
          warehouseId: transfer.fromWarehouseId,
          productId: item.productId,
          delta: item.qty.negated(),
        });

        const ledger = await this.inventory.createTransaction(tx, {
          organizationId: tenant.organizationId,
          productId: item.productId,
          warehouseId: transfer.fromWarehouseId,
          type: 'STOCK_TRANSFER',
          qty: item.qty.negated(),
          referenceType: 'StockTransfer',
          referenceId: transfer.id,
        });

        const serialIds = item.serials.map((entry) => entry.serialNumberId);
        if (serialIds.length) {
          const locked = await this.transfers.lockSerials(tx, tenant.organizationId, serialIds);
          if (locked.length !== serialIds.length) {
            throw new AppError(409, 'INVENTORY_SERIAL_LOCK_FAILED', 'One or more serials could not be loaded.');
          }
          for (const serial of locked) {
            if (
              serial.productId !== item.productId ||
              serial.currentWarehouseId !== transfer.fromWarehouseId ||
              serial.status !== 'AVAILABLE'
            ) {
              throw new AppError(409, 'INVENTORY_SERIAL_NOT_AVAILABLE',
                'A transfer serial is not available in the source warehouse.', { serialNo: serial.serialNo });
            }
            await this.transfers.setSerialInTransit(tx, serial.id);
          }
          await this.inventory.linkTransactionSerials(tx, ledger.id, serialIds);
        }

        await this.inventory.linkTransactionBatches(
          tx,
          ledger.id,
          item.batches.map((entry) => ({ batchLotId: entry.batchLotId, qty: entry.qty })),
        );

        await this.lowStockIfNeeded(tx, tenant.organizationId, item.productId, transfer.fromWarehouseId);
      }

      const updated = await this.transfers.markDispatched(tx, transfer.id);
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'INVENTORY_TRANSFER_DISPATCHED',
        subjectType: 'StockTransfer',
        subjectId: transfer.id,
        beforeJson: { status: transfer.status },
        afterJson: { status: updated.status, dispatchedAt: updated.dispatchedAt?.toISOString() },
        ip: actor.ip,
      });

      return {
        id: updated.id, transferNo: updated.transferNo,
        fromWarehouseId: updated.fromWarehouseId, toWarehouseId: updated.toWarehouseId,
        status: updated.status,
      };
    });
  }

  async receive(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
  ) {
    return withTransaction(async (tx) => {
      const transfer = await this.transfers.lockTransfer(tx, tenant.organizationId, id);
      if (!transfer) throw new AppError(404, 'INVENTORY_TRANSFER_NOT_FOUND', 'Stock transfer not found.');
      if (transfer.status !== 'IN_TRANSIT') {
        throw new AppError(409, 'INVENTORY_TRANSFER_INVALID_STATE', 'Only IN_TRANSIT transfers can be received.');
      }

      await this.assertWarehouse(tenant, transfer.fromWarehouseId);
      await this.assertWarehouse(tenant, transfer.toWarehouseId);
      await this.inventory.assertStockNotFrozen(tx, { organizationId: tenant.organizationId, warehouseId: transfer.toWarehouseId });

      const items = await this.transfers.items(tx, transfer.id);
      for (const item of items) {
        await this.inventory.applyOnHandDelta(tx, {
          organizationId: tenant.organizationId,
          warehouseId: transfer.toWarehouseId,
          productId: item.productId,
          delta: item.qty,
        });

        const ledger = await this.inventory.createTransaction(tx, {
          organizationId: tenant.organizationId,
          productId: item.productId,
          warehouseId: transfer.toWarehouseId,
          type: 'STOCK_TRANSFER',
          qty: item.qty,
          referenceType: 'StockTransfer',
          referenceId: transfer.id,
        });

        const serialIds = item.serials.map((entry) => entry.serialNumberId);
        if (serialIds.length) {
          const locked = await this.transfers.lockSerials(tx, tenant.organizationId, serialIds);
          if (locked.length !== serialIds.length) {
            throw new AppError(409, 'INVENTORY_SERIAL_LOCK_FAILED', 'One or more serials could not be loaded.');
          }
          for (const serial of locked) {
            if (serial.productId !== item.productId || serial.status !== 'IN_TRANSIT') {
              throw new AppError(409, 'INVENTORY_SERIAL_NOT_IN_TRANSIT',
                'A transfer serial is not in transit.', { serialNo: serial.serialNo });
            }
            await this.transfers.setSerialReceived(tx, serial.id, transfer.toWarehouseId);
          }
          await this.inventory.linkTransactionSerials(tx, ledger.id, serialIds);
        }

        await this.inventory.linkTransactionBatches(
          tx,
          ledger.id,
          item.batches.map((entry) => ({ batchLotId: entry.batchLotId, qty: entry.qty })),
        );
        await this.transfers.markItemReceived(tx, item.id, item.qty);
      }

      const updated = await this.transfers.markReceived(tx, transfer.id);
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'INVENTORY_TRANSFER_RECEIVED',
        subjectType: 'StockTransfer',
        subjectId: transfer.id,
        beforeJson: { status: transfer.status },
        afterJson: { status: updated.status, receivedAt: updated.receivedAt?.toISOString() },
        ip: actor.ip,
      });
      await this.eventWriter.append(tx, {
        organizationId: tenant.organizationId,
        type: 'stock.transfer.received',
        aggregateType: 'StockTransfer',
        aggregateId: transfer.id,
        payload: {
          transferNo: transfer.transferNo,
          fromWarehouseId: transfer.fromWarehouseId,
          toWarehouseId: transfer.toWarehouseId,
        },
      });

      return {
        id: updated.id, transferNo: updated.transferNo,
        fromWarehouseId: updated.fromWarehouseId, toWarehouseId: updated.toWarehouseId,
        status: updated.status,
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

  private async lowStockIfNeeded(
    tx: TransactionClient,
    organizationId: string,
    productId: string,
    warehouseId: string,
  ) {
    const product = await this.inventory.productMinStock(tx, productId);
    if (!product?.minStock) return;
    const balance = await this.inventory.aggregateBalance(tx, organizationId, warehouseId, productId);
    if (!balance) return;
    const available = balance.onHand.sub(balance.reserved);
    if (available.greaterThanOrEqualTo(product.minStock)) return;
    await this.eventWriter.append(tx, {
      organizationId,
      type: 'stock.low',
      aggregateType: 'Product',
      aggregateId: productId,
      payload: { warehouseId, available: available.toString(), minStock: product.minStock.toString() },
    });
  }
}
