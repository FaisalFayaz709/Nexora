import { Prisma, withTransaction } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { BusinessEventWriter } from '../../core/events/business-event-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import { InventoryRepository } from './inventory.repository.js';
import { StockAdjustmentRepository } from './stock-adjustment.repository.js';

function decimalSum(values: Prisma.Decimal[]): Prisma.Decimal {
  return values.reduce((sum, value) => sum.add(value), new Prisma.Decimal(0));
}
function absolute(value: Prisma.Decimal) {
  return value.isNegative() ? value.negated() : value;
}

export class StockAdjustmentService {
  constructor(
    private readonly inventory = new InventoryRepository(),
    private readonly adjustments = new StockAdjustmentRepository(),
    private readonly auditWriter = new AuditWriter(),
    private readonly eventWriter = new BusinessEventWriter(),
  ) {}

  async create(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    input: {
      warehouseId: string;
      reason: string;
      lines: Array<{
        productId: string;
        locationId?: string | null;
        quantityDelta: string;
        serialNumbers?: string[];
        batches?: Array<{
          lotNo: string; quantity: string;
          manufactureDate?: string | null; expiryDate?: string | null;
        }>;
      }>;
    },
  ) {
    await this.assertWarehouse(tenant, input.warehouseId);
    const prepared: Array<{
      productId: string;
      trackingType: string;
      qtyDelta: Prisma.Decimal;
      serialNumbers: string[];
      batches: Array<{ lotNo: string; quantity: string; manufactureDate?: string | null; expiryDate?: string | null }>;
      locationId: string | null;
    }> = [];

    for (const line of input.lines) {
      const product = await this.inventory.getProduct(tenant.organizationId, line.productId);
      if (!product) throw new AppError(400, 'INVENTORY_PRODUCT_INVALID', 'Adjustment product does not exist in the active organization.');
      if (line.locationId && !(await this.inventory.locationBelongsToWarehouse(input.warehouseId, line.locationId))) {
        throw new AppError(400, 'INVENTORY_LOCATION_INVALID', 'Adjustment location does not belong to the selected warehouse.');
      }

      const qtyDelta = new Prisma.Decimal(line.quantityDelta);
      const serialNumbers = [...new Set(line.serialNumbers ?? [])];
      const batches = line.batches ?? [];

      if (product.trackingType === 'SERIAL') {
        if (!absolute(qtyDelta).isInteger()) {
          throw new AppError(400, 'INVENTORY_SERIAL_QUANTITY_INVALID', 'Serial-tracked adjustment quantity must be a whole number.');
        }
        if (serialNumbers.length !== absolute(qtyDelta).toNumber()) {
          throw new AppError(400, 'INVENTORY_SERIAL_COUNT_MISMATCH', 'Serial count must equal absolute adjustment quantity.');
        }
      }

      if (product.trackingType === 'BATCH') {
        const total = decimalSum(batches.map((batch) => new Prisma.Decimal(batch.quantity)));
        if (!total.equals(absolute(qtyDelta))) {
          throw new AppError(400, 'INVENTORY_BATCH_QUANTITY_MISMATCH', 'Batch allocation total must equal absolute adjustment quantity.');
        }
      }

      prepared.push({
        productId: product.id,
        trackingType: product.trackingType,
        qtyDelta,
        serialNumbers,
        batches,
        locationId: line.locationId ?? null,
      });
    }

    return withTransaction(async (tx) => {
      const header = await this.adjustments.createHeader(tx, {
        organizationId: tenant.organizationId,
        warehouseId: input.warehouseId,
        reason: input.reason,
      });

      for (const line of prepared) {
        await this.adjustments.createLine(tx, {
          stockAdjustmentId: header.id,
          productId: line.productId,
          locationId: line.locationId,
          qtyDelta: line.qtyDelta,
          serialNumbersJson: line.serialNumbers,
          batchesJson: line.batches,
        });
      }

      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'INVENTORY_ADJUSTMENT_CREATED',
        subjectType: 'StockAdjustment',
        subjectId: header.id,
        afterJson: {
          warehouseId: header.warehouseId,
          reason: header.reason,
          status: header.status,
          lineCount: prepared.length,
        },
        ip: actor.ip,
      });

      return {
        id: header.id, warehouseId: header.warehouseId, reason: header.reason,
        status: header.status, approvalRequestId: header.approvalRequestId,
      };
    });
  }

  async post(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
  ) {
    return withTransaction(async (tx) => {
      const adjustment = await this.adjustments.lockAdjustment(tx, tenant.organizationId, id);
      if (!adjustment) throw new AppError(404, 'INVENTORY_ADJUSTMENT_NOT_FOUND', 'Stock adjustment not found.');
      if (adjustment.status !== 'DRAFT') {
        throw new AppError(409, 'INVENTORY_ADJUSTMENT_INVALID_STATE', 'Only DRAFT adjustments can be posted.');
      }
      if (adjustment.approvalRequestId) {
        throw new AppError(
          409,
          'INVENTORY_ADJUSTMENT_APPROVAL_REQUIRED',
          'Adjustment is linked to an approval request and cannot post until the Approval Engine verifies approval.',
        );
      }

      await this.assertWarehouse(tenant, adjustment.warehouseId);
      const lines = await this.adjustments.lines(tx, adjustment.id);

      for (const line of lines) {
        const balances = await this.inventory.applyOnHandDelta(tx, {
          organizationId: tenant.organizationId,
          warehouseId: adjustment.warehouseId,
          locationId: line.locationId,
          productId: line.productId,
          delta: line.qtyDelta,
        });
        const nextAggregateOnHand = balances.aggregate.onHand;
        const aggregateReserved = balances.aggregate.reserved;
        const ledger = await this.inventory.createTransaction(tx, {
          organizationId: tenant.organizationId,
          productId: line.productId,
          warehouseId: adjustment.warehouseId,
          locationId: line.locationId,
          type: 'ADJUSTMENT',
          qty: line.qtyDelta,
          referenceType: 'StockAdjustment',
          referenceId: adjustment.id,
        });

        const serials = Array.isArray(line.serialNumbersJson)
          ? line.serialNumbersJson.filter((value): value is string => typeof value === 'string')
          : [];
        const batchInputs = Array.isArray(line.batchesJson)
          ? line.batchesJson.filter((value): value is Record<string, unknown> => typeof value === 'object' && value !== null)
          : [];

        if (line.product.trackingType === 'SERIAL') {
          const serialIds: string[] = [];
          if (line.qtyDelta.isPositive()) {
            for (const serialNo of serials) {
              const serial = await this.inventory.createSerial(tx, {
                organizationId: tenant.organizationId,
                productId: line.productId,
                serialNo,
                status: 'AVAILABLE',
                currentWarehouseId: adjustment.warehouseId,
              });
              serialIds.push(serial.id);
            }
          } else {
            for (const serialNo of serials) {
              const serial = await this.inventory.findSerialByNo(tx, tenant.organizationId, serialNo);
              if (
                !serial ||
                serial.productId !== line.productId ||
                serial.currentWarehouseId !== adjustment.warehouseId ||
                serial.status !== 'AVAILABLE'
              ) {
                throw new AppError(409, 'INVENTORY_SERIAL_NOT_AVAILABLE',
                  `Serial ${serialNo} is not available in the adjustment warehouse.`);
              }
              await this.inventory.updateSerial(tx, serial.id, {
                status: 'REMOVED', currentWarehouseId: null,
              });
              serialIds.push(serial.id);
            }
          }
          await this.inventory.linkTransactionSerials(tx, ledger.id, serialIds);
        }

        if (line.product.trackingType === 'BATCH') {
          const batchLinks: Array<{ batchLotId: string; qty: Prisma.Decimal }> = [];
          for (const input of batchInputs) {
            const lotNo = String(input.lotNo ?? '');
            const qty = new Prisma.Decimal(String(input.quantity ?? '0'));
            if (line.qtyDelta.isPositive()) {
              const batch = await this.adjustments.upsertBatchForPositive(tx, {
                organizationId: tenant.organizationId,
                productId: line.productId,
                lotNo,
                manufactureDate: input.manufactureDate
                  ? new Date(`${String(input.manufactureDate)}T00:00:00Z`) : null,
                expiryDate: input.expiryDate
                  ? new Date(`${String(input.expiryDate)}T00:00:00Z`) : null,
                qty,
              });
              batchLinks.push({ batchLotId: batch.id, qty });
            } else {
              const batch = await this.adjustments.lockBatch(
                tx, tenant.organizationId, line.productId, lotNo,
              );
              if (!batch || batch.qtyRemaining.lessThan(qty)) {
                throw new AppError(409, 'INVENTORY_BATCH_INSUFFICIENT',
                  `Batch ${lotNo} does not contain enough remaining quantity.`);
              }
              await this.inventory.updateBatchRemaining(tx, batch.id, batch.qtyRemaining.sub(qty));
              batchLinks.push({ batchLotId: batch.id, qty });
            }
          }
          await this.inventory.linkTransactionBatches(tx, ledger.id, batchLinks);
        }

        const product = await this.inventory.productMinStock(tx, line.productId);
        if (product?.minStock) {
          const available = nextAggregateOnHand.sub(aggregateReserved);
          if (available.lessThan(product.minStock)) {
            await this.eventWriter.append(tx, {
              organizationId: tenant.organizationId,
              type: 'stock.low',
              aggregateType: 'Product',
              aggregateId: line.productId,
              payload: {
                warehouseId: adjustment.warehouseId,
                locationId: line.locationId,
                available: available.toString(),
                minStock: product.minStock.toString(),
              },
            });
          }
        }
      }

      const posted = await this.adjustments.markPosted(tx, adjustment.id);
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'INVENTORY_ADJUSTMENT_POSTED',
        subjectType: 'StockAdjustment',
        subjectId: adjustment.id,
        beforeJson: { status: adjustment.status },
        afterJson: { status: posted.status, postedAt: posted.postedAt?.toISOString() },
        ip: actor.ip,
      });

      return {
        id: posted.id, warehouseId: posted.warehouseId, reason: posted.reason,
        status: posted.status, approvalRequestId: posted.approvalRequestId,
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
}
