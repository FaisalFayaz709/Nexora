import { Prisma, prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class StockCountRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new StockCountRepository(db); }

  list(input: {
    organizationId: string;
    branchId: string | null;
    warehouseId?: string | undefined;
    locationId?: string | undefined;
    status?: string | undefined;
    countType?: string | undefined;
    skip: number;
    take: number;
  }) {
    const where = {
      organizationId: input.organizationId,
      ...(input.warehouseId ? { warehouseId: input.warehouseId } : {}),
      ...(input.locationId ? { locationId: input.locationId } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.countType ? { countType: input.countType } : {}),
      ...(input.branchId ? { warehouse: { branchId: input.branchId } } : {}),
    };
    return Promise.all([
      this.db.stockCount.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: input.skip,
        take: input.take,
      }),
      this.db.stockCount.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  }

  detail(organizationId: string, id: string, branchId: string | null) {
    return this.db.stockCount.findFirst({
      where: {
        id,
        organizationId,
        ...(branchId ? { warehouse: { branchId } } : {}),
      },
      include: {
        lines: { orderBy: { productId: 'asc' } },
        variances: { orderBy: { lineId: 'asc' } },
        posting: true,
        approvals: { orderBy: { approvedAt: 'desc' } },
      },
    });
  }

  countSheet(organizationId: string, id: string, branchId: string | null) {
    return this.db.stockCount.findFirst({
      where: {
        id,
        organizationId,
        ...(branchId ? { warehouse: { branchId } } : {}),
      },
      include: {
        lines: { orderBy: { productId: 'asc' } },
      },
    });
  }

  conflictingActiveCount(input: { organizationId: string; warehouseId: string; locationId?: string | null }) {
    return this.db.stockCount.findFirst({
      where: {
        organizationId: input.organizationId,
        warehouseId: input.warehouseId,
        status: { in: ['IN_PROGRESS', 'SUBMITTED'] },
        OR: input.locationId
          ? [{ locationId: null }, { locationId: input.locationId }]
          : [{ locationId: null }, { locationId: { not: null } }],
      },
      select: { id: true },
    });
  }

  create(data: {
    organizationId: string; warehouseId: string; locationId: string | null;
    countType: string; createdByUserId: string;
  }) { return this.db.stockCount.create({ data }); }

  async lock(tx: TransactionClient, organizationId: string, id: string) {
    const rows = await tx.$queryRaw<Array<{
      id: string; organizationId: string; warehouseId: string; locationId: string | null;
      countType: string; status: string; createdByUserId: string;
    }>>`
      SELECT "id","organizationId","warehouseId","locationId","countType","status","createdByUserId"
      FROM "StockCount"
      WHERE "id" = ${id}::uuid AND "organizationId" = ${organizationId}::uuid
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  snapshotBalances(tx: TransactionClient, input: {
    organizationId: string; warehouseId: string; locationId: string | null; productIds?: string[];
  }) {
    return tx.stockBalance.findMany({
      where: {
        organizationId: input.organizationId,
        warehouseId: input.warehouseId,
        ...(input.locationId
          ? { locationId: input.locationId }
          : { locationScopeKey: 'WAREHOUSE' }),
        ...(input.productIds?.length ? { productId: { in: input.productIds } } : {}),
      },
      select: { productId: true, onHand: true },
      orderBy: { productId: 'asc' },
    });
  }

  createLines(tx: TransactionClient, stockCountId: string, rows: Array<{ productId: string; systemQty: Prisma.Decimal }>) {
    return tx.stockCountLine.createMany({
      data: rows.map((row) => ({ stockCountId, productId: row.productId, systemQty: row.systemQty })),
      skipDuplicates: true,
    });
  }

  markStarted(tx: TransactionClient, id: string) {
    return tx.stockCount.update({ where: { id }, data: { status: 'IN_PROGRESS', frozenAt: new Date() } });
  }

  lines(tx: TransactionClient, stockCountId: string) {
    return tx.stockCountLine.findMany({ where: { stockCountId }, orderBy: { id: 'asc' } });
  }

  updateLineCount(tx: TransactionClient, id: string, countedQty: Prisma.Decimal, varianceQty: Prisma.Decimal) {
    return tx.stockCountLine.update({ where: { id }, data: { countedQty, varianceQty } });
  }

  upsertVariance(tx: TransactionClient, input: {
    stockCountId: string; lineId: string; systemQty: Prisma.Decimal;
    countedQty: Prisma.Decimal; varianceQty: Prisma.Decimal;
  }) {
    return tx.stockCountVariance.upsert({
      where: { lineId: input.lineId },
      update: { systemQty: input.systemQty, countedQty: input.countedQty, varianceQty: input.varianceQty },
      create: input,
    });
  }

  deleteVariance(tx: TransactionClient, lineId: string) {
    return tx.stockCountVariance.deleteMany({ where: { lineId } });
  }

  markSubmitted(tx: TransactionClient, id: string) {
    return tx.stockCount.update({ where: { id }, data: { status: 'SUBMITTED', submittedAt: new Date() } });
  }

  createApproval(tx: TransactionClient, input: { stockCountId: string; approverUserId: string; comment: string | null }) {
    return tx.stockCountApproval.create({
      data: { stockCountId: input.stockCountId, approverUserId: input.approverUserId, decision: 'APPROVED', comment: input.comment },
    });
  }

  createAdjustment(tx: TransactionClient, input: { organizationId: string; warehouseId: string; reason: string }) {
    return tx.stockAdjustment.create({ data: { organizationId: input.organizationId, warehouseId: input.warehouseId, reason: input.reason } });
  }

  createAdjustmentLine(tx: TransactionClient, input: {
    stockAdjustmentId: string; productId: string; locationId: string | null; qtyDelta: Prisma.Decimal;
  }) {
    return tx.stockAdjustmentLine.create({ data: { ...input, serialNumbersJson: [], batchesJson: [] } });
  }

  markAdjustmentPosted(tx: TransactionClient, id: string) {
    return tx.stockAdjustment.update({ where: { id }, data: { status: 'POSTED', postedAt: new Date() } });
  }

  createPosting(tx: TransactionClient, input: { stockCountId: string; stockAdjustmentId: string; postedByUserId: string }) {
    return tx.stockCountPosting.create({ data: input });
  }

  markPosted(tx: TransactionClient, id: string) {
    return tx.stockCount.update({ where: { id }, data: { status: 'POSTED', postedAt: new Date() } });
  }
}
