import { Prisma, prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class StockAdjustmentRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new StockAdjustmentRepository(db); }

  createHeader(tx: TransactionClient, data: {
    organizationId: string; warehouseId: string; reason: string;
  }) {
    return tx.stockAdjustment.create({ data });
  }

  createLine(tx: TransactionClient, data: {
    stockAdjustmentId: string; productId: string; locationId: string | null;
    qtyDelta: Prisma.Decimal; serialNumbersJson: unknown; batchesJson: unknown;
  }) {
    return tx.stockAdjustmentLine.create({
      data: {
        stockAdjustmentId: data.stockAdjustmentId,
        productId: data.productId,
        locationId: data.locationId,
        qtyDelta: data.qtyDelta,
        serialNumbersJson: data.serialNumbersJson as never,
        batchesJson: data.batchesJson as never,
      },
    });
  }

  async lockAdjustment(tx: TransactionClient, organizationId: string, id: string) {
    const rows = await tx.$queryRaw<Array<{
      id: string; organizationId: string; warehouseId: string; reason: string;
      status: string; approvalRequestId: string | null;
    }>>`
      SELECT "id","organizationId","warehouseId","reason","status","approvalRequestId"
      FROM "StockAdjustment"
      WHERE "id" = ${id}::uuid AND "organizationId" = ${organizationId}::uuid
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  lines(tx: TransactionClient, adjustmentId: string) {
    return tx.stockAdjustmentLine.findMany({
      where: { stockAdjustmentId: adjustmentId },
      orderBy: { id: 'asc' },
      include: { product: { select: { trackingType: true } } },
    });
  }

  markPosted(tx: TransactionClient, id: string) {
    return tx.stockAdjustment.update({
      where: { id },
      data: { status: 'POSTED', postedAt: new Date() },
    });
  }

  async lockBatch(
    tx: TransactionClient,
    organizationId: string,
    productId: string,
    lotNo: string,
  ) {
    const rows = await tx.$queryRaw<Array<{ id: string; qtyRemaining: Prisma.Decimal }>>`
      SELECT "id","qtyRemaining"
      FROM "BatchLot"
      WHERE "organizationId" = ${organizationId}::uuid
        AND "productId" = ${productId}::uuid
        AND "lotNo" = ${lotNo}
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  upsertBatchForPositive(tx: TransactionClient, input: {
    organizationId: string; productId: string; lotNo: string;
    manufactureDate: Date | null; expiryDate: Date | null; qty: Prisma.Decimal;
  }) {
    return tx.batchLot.upsert({
      where: {
        organizationId_productId_lotNo: {
          organizationId: input.organizationId,
          productId: input.productId,
          lotNo: input.lotNo,
        },
      },
      update: {
        qtyRemaining: { increment: input.qty },
        ...(input.manufactureDate ? { manufactureDate: input.manufactureDate } : {}),
        ...(input.expiryDate ? { expiryDate: input.expiryDate } : {}),
      },
      create: {
        organizationId: input.organizationId,
        productId: input.productId,
        lotNo: input.lotNo,
        manufactureDate: input.manufactureDate,
        expiryDate: input.expiryDate,
        qtyRemaining: input.qty,
      },
    });
  }
}
