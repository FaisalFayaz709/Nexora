import { Prisma, withTransaction } from '@nexora/database';
import { AuditWriter } from '../../../core/audit/audit-writer.js';
import { AppError } from '../../../core/http/errors.js';
import type { TenantRequestContext } from '../../../core/tenant/tenant-context.js';
import { InventoryRepository } from '../inventory.repository.js';
import { StockCountRepository } from './stock-count.repository.js';

const STOCK_COUNT_ACTIVE_STATUSES = ['IN_PROGRESS', 'SUBMITTED'] as const;

function decimal(value: unknown): string {
  if (value instanceof Prisma.Decimal) return value.toFixed();
  return String(value ?? '0');
}

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

export class StockCountService {
  constructor(
    private readonly counts = new StockCountRepository(),
    private readonly inventory = new InventoryRepository(),
    private readonly auditWriter = new AuditWriter(),
  ) {}

  async list(
    tenant: TenantRequestContext,
    query: { page?: number; pageSize?: number; warehouseId?: string; locationId?: string; status?: string; countType?: 'FULL' | 'CYCLE' },
  ) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 25, 100);
    const result = await this.counts.list({
      organizationId: tenant.organizationId,
      branchId: tenant.branchId ?? null,
      warehouseId: query.warehouseId,
      locationId: query.locationId,
      status: query.status,
      countType: query.countType,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { rows: result.rows.map((row) => this.dto(row)), page, pageSize, total: result.total };
  }

  async get(tenant: TenantRequestContext, id: string) {
    const row = await this.counts.detail(tenant.organizationId, id, tenant.branchId ?? null);
    if (!row) throw new AppError(404, 'STOCK_COUNT_NOT_FOUND', 'Stock count not found.');
    return this.detailDto(row);
  }

  async countSheet(tenant: TenantRequestContext, id: string) {
    const row = await this.counts.countSheet(tenant.organizationId, id, tenant.branchId ?? null);
    if (!row) throw new AppError(404, 'STOCK_COUNT_NOT_FOUND', 'Stock count not found.');
    if (row.status === 'DRAFT') {
      throw new AppError(409, 'STOCK_COUNT_NOT_STARTED', 'Start the stock count before downloading or editing the count sheet.');
    }
    return {
      stockCountId: row.id,
      warehouseId: row.warehouseId,
      locationId: row.locationId,
      status: row.status,
      frozenAt: iso(row.frozenAt),
      lines: row.lines.map((line) => this.lineDto(line)),
    };
  }

  async create(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    input: { warehouseId: string; locationId?: string | null; countType: 'FULL' | 'CYCLE'; productIds?: string[] },
  ) {
    await this.assertWarehouseAndLocation(tenant, input.warehouseId, input.locationId ?? null);
    if (input.productIds) {
      for (const productId of [...new Set(input.productIds)]) {
        if (!(await this.inventory.getProduct(tenant.organizationId, productId))) {
          throw new AppError(400, 'STOCK_COUNT_PRODUCT_INVALID', 'Stock count contains a product outside the active organization.');
        }
      }
    }

    return withTransaction(async (tx) => {
      const row = await this.counts.withDb(tx).create({
        organizationId: tenant.organizationId,
        warehouseId: input.warehouseId,
        locationId: input.locationId ?? null,
        countType: input.countType,
        createdByUserId: actor.userId,
      });
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'STOCK_COUNT_CREATED',
        subjectType: 'StockCount', subjectId: row.id,
        afterJson: { warehouseId: row.warehouseId, locationId: row.locationId, countType: row.countType, status: row.status, productIds: input.productIds ?? null },
        ip: actor.ip,
      });
      return this.dto(row);
    });
  }

  async start(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
    productIds?: string[],
  ) {
    return withTransaction(async (tx) => {
      const count = await this.counts.lock(tx, tenant.organizationId, id);
      if (!count) throw new AppError(404, 'STOCK_COUNT_NOT_FOUND', 'Stock count not found.');
      if (count.status !== 'DRAFT') throw new AppError(409, 'STOCK_COUNT_INVALID_STATE', 'Only DRAFT stock counts can be started.');
      await this.assertWarehouseAndLocation(tenant, count.warehouseId, count.locationId);

      const conflict = await this.counts.withDb(tx).conflictingActiveCount({
        organizationId: tenant.organizationId, warehouseId: count.warehouseId, locationId: count.locationId,
      });
      if (conflict && conflict.id !== count.id) {
        throw new AppError(409, 'STOCK_COUNT_FREEZE_CONFLICT', 'Another active count already freezes this stock scope.');
      }

      if (productIds) {
        for (const productId of [...new Set(productIds)]) {
          if (!(await this.inventory.getProduct(tenant.organizationId, productId))) {
            throw new AppError(400, 'STOCK_COUNT_PRODUCT_INVALID', 'Stock count contains a product outside the active organization.');
          }
        }
      }

      const balances = await this.counts.snapshotBalances(tx, {
        organizationId: tenant.organizationId, warehouseId: count.warehouseId,
        locationId: count.locationId, ...(productIds ? { productIds: [...new Set(productIds)] } : {}),
      });
      if (!balances.length) throw new AppError(409, 'STOCK_COUNT_NO_STOCK_SCOPE', 'No stock balances exist in the selected count scope.');
      await this.counts.createLines(tx, count.id, balances.map((b) => ({ productId: b.productId, systemQty: b.onHand })));
      const started = await this.counts.markStarted(tx, count.id);
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId, actorUserId: actor.userId,
        action: 'STOCK_COUNT_STARTED', subjectType: 'StockCount', subjectId: count.id,
        beforeJson: { status: 'DRAFT' }, afterJson: { status: 'IN_PROGRESS', frozenAt: started.frozenAt?.toISOString(), lineCount: balances.length, activeStatuses: STOCK_COUNT_ACTIVE_STATUSES }, ip: actor.ip,
      });
      return this.dto(started);
    });
  }

  async submit(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
    input: { lines: Array<{ lineId: string; countedQty: string }> },
  ) {
    return withTransaction(async (tx) => {
      const count = await this.counts.lock(tx, tenant.organizationId, id);
      if (!count) throw new AppError(404, 'STOCK_COUNT_NOT_FOUND', 'Stock count not found.');
      if (count.status !== 'IN_PROGRESS') throw new AppError(409, 'STOCK_COUNT_INVALID_STATE', 'Only IN_PROGRESS stock counts can be submitted.');
      await this.assertWarehouseAndLocation(tenant, count.warehouseId, count.locationId);

      const lines = await this.counts.lines(tx, count.id);
      const submitted = new Map(input.lines.map((line) => [line.lineId, new Prisma.Decimal(line.countedQty)]));
      if (submitted.size !== input.lines.length) {
        throw new AppError(400, 'STOCK_COUNT_DUPLICATE_LINE', 'Each count line can be submitted only once.');
      }
      if (submitted.size !== lines.length || lines.some((line) => !submitted.has(line.id))) {
        throw new AppError(400, 'STOCK_COUNT_LINES_INCOMPLETE', 'Every count line must be submitted exactly once.');
      }

      for (const line of lines) {
        const countedQty = submitted.get(line.id)!;
        const varianceQty = countedQty.sub(line.systemQty);
        await this.counts.updateLineCount(tx, line.id, countedQty, varianceQty);
        if (varianceQty.isZero()) await this.counts.deleteVariance(tx, line.id);
        else await this.counts.upsertVariance(tx, {
          stockCountId: count.id, lineId: line.id, systemQty: line.systemQty, countedQty, varianceQty,
        });
      }
      const row = await this.counts.markSubmitted(tx, count.id);
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId, actorUserId: actor.userId,
        action: 'STOCK_COUNT_SUBMITTED', subjectType: 'StockCount', subjectId: count.id,
        beforeJson: { status: 'IN_PROGRESS' }, afterJson: { status: 'SUBMITTED', submittedLineCount: lines.length }, ip: actor.ip,
      });
      return this.dto(row);
    });
  }

  async post(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
    comment?: string | null,
  ) {
    return withTransaction(async (tx) => {
      const count = await this.counts.lock(tx, tenant.organizationId, id);
      if (!count) throw new AppError(404, 'STOCK_COUNT_NOT_FOUND', 'Stock count not found.');
      if (count.status !== 'SUBMITTED') throw new AppError(409, 'STOCK_COUNT_INVALID_STATE', 'Only SUBMITTED stock counts can be approved and posted.');
      if (count.createdByUserId === actor.userId) {
        throw new AppError(403, 'STOCK_COUNT_MAKER_CHECKER_REQUIRED', 'The creator cannot approve/post their own physical stock count.');
      }
      await this.assertWarehouseAndLocation(tenant, count.warehouseId, count.locationId);
      const lines = await this.counts.lines(tx, count.id);
      if (lines.some((line) => line.countedQty === null || line.varianceQty === null)) {
        throw new AppError(409, 'STOCK_COUNT_LINES_NOT_SUBMITTED', 'All count lines must contain counted and variance quantities.');
      }

      await this.counts.createApproval(tx, { stockCountId: count.id, approverUserId: actor.userId, comment: comment ?? null });
      const adjustment = await this.counts.createAdjustment(tx, {
        organizationId: tenant.organizationId, warehouseId: count.warehouseId,
        reason: `Physical stock count ${count.id} variance posting`,
      });

      for (const line of lines) {
        const variance = line.varianceQty!;
        if (variance.isZero()) continue;
        await this.counts.createAdjustmentLine(tx, {
          stockAdjustmentId: adjustment.id, productId: line.productId,
          locationId: count.locationId, qtyDelta: variance,
        });
        await this.inventory.applyOnHandDelta(tx, {
          organizationId: tenant.organizationId, warehouseId: count.warehouseId,
          locationId: count.locationId, productId: line.productId, delta: variance,
          bypassFreeze: true,
        });
        await this.inventory.createTransaction(tx, {
          organizationId: tenant.organizationId, warehouseId: count.warehouseId,
          locationId: count.locationId, productId: line.productId,
          type: 'ADJUSTMENT', qty: variance,
          referenceType: 'StockCount', referenceId: count.id,
        });
      }

      await this.counts.markAdjustmentPosted(tx, adjustment.id);
      await this.counts.createPosting(tx, { stockCountId: count.id, stockAdjustmentId: adjustment.id, postedByUserId: actor.userId });
      const posted = await this.counts.markPosted(tx, count.id);
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId, actorUserId: actor.userId,
        action: 'STOCK_COUNT_POSTED', subjectType: 'StockCount', subjectId: count.id,
        beforeJson: { status: 'SUBMITTED' },
        afterJson: { status: 'POSTED', stockAdjustmentId: adjustment.id, postedLineCount: lines.filter((line) => !line.varianceQty!.isZero()).length, comment: comment ?? null }, ip: actor.ip,
      });
      return this.dto(posted);
    });
  }

  private async assertWarehouseAndLocation(tenant: TenantRequestContext, warehouseId: string, locationId: string | null) {
    const warehouse = await this.inventory.getWarehouse(tenant.organizationId, warehouseId);
    if (!warehouse) throw new AppError(404, 'INVENTORY_WAREHOUSE_NOT_FOUND', 'Warehouse not found.');
    if (tenant.branchId && warehouse.branchId !== tenant.branchId) throw new AppError(403, 'INVENTORY_BRANCH_SCOPE_DENIED', 'Warehouse is outside the active branch scope.');
    if (locationId && !(await this.inventory.locationBelongsToWarehouse(warehouseId, locationId))) {
      throw new AppError(400, 'INVENTORY_LOCATION_INVALID', 'Location does not belong to the stock-count warehouse.');
    }
  }

  private dto(row: { id: string; warehouseId: string; locationId: string | null; countType: string; status: string; createdAt?: Date | string; frozenAt?: Date | string | null; submittedAt?: Date | string | null; postedAt?: Date | string | null }) {
    return {
      id: row.id,
      warehouseId: row.warehouseId,
      locationId: row.locationId,
      countType: row.countType,
      status: row.status,
      ...(row.createdAt ? { createdAt: iso(row.createdAt)! } : {}),
      ...(row.frozenAt !== undefined ? { frozenAt: iso(row.frozenAt) } : {}),
      ...(row.submittedAt !== undefined ? { submittedAt: iso(row.submittedAt) } : {}),
      ...(row.postedAt !== undefined ? { postedAt: iso(row.postedAt) } : {}),
    };
  }

  private lineDto(line: { id: string; productId: string; systemQty: Prisma.Decimal; countedQty: Prisma.Decimal | null; varianceQty: Prisma.Decimal | null }) {
    return {
      id: line.id,
      productId: line.productId,
      systemQty: decimal(line.systemQty),
      countedQty: line.countedQty === null ? null : decimal(line.countedQty),
      varianceQty: line.varianceQty === null ? null : decimal(line.varianceQty),
    };
  }

  private detailDto(row: {
    id: string; warehouseId: string; locationId: string | null; countType: string; status: string;
    createdAt: Date | string; frozenAt: Date | string | null; submittedAt: Date | string | null; postedAt: Date | string | null;
    lines: Array<{ id: string; productId: string; systemQty: Prisma.Decimal; countedQty: Prisma.Decimal | null; varianceQty: Prisma.Decimal | null }>;
    variances: Array<{ id: string; lineId: string; systemQty: Prisma.Decimal; countedQty: Prisma.Decimal; varianceQty: Prisma.Decimal }>;
    posting: { stockAdjustmentId: string; postedByUserId: string; postedAt: Date | string } | null;
  }) {
    return {
      ...this.dto(row),
      lines: row.lines.map((line) => this.lineDto(line)),
      variances: row.variances.map((variance) => ({
        id: variance.id,
        lineId: variance.lineId,
        systemQty: decimal(variance.systemQty),
        countedQty: decimal(variance.countedQty),
        varianceQty: decimal(variance.varianceQty),
      })),
      posting: row.posting ? {
        stockAdjustmentId: row.posting.stockAdjustmentId,
        postedByUserId: row.posting.postedByUserId,
        postedAt: iso(row.posting.postedAt)!,
      } : null,
    };
  }
}
