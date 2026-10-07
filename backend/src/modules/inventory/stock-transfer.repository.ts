import { Prisma, prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class StockTransferRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new StockTransferRepository(db); }

  createHeader(tx: TransactionClient, data: {
    organizationId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    transferNo: string;
  }) {
    return tx.stockTransfer.create({ data });
  }

  createItem(tx: TransactionClient, data: {
    transferId: string;
    productId: string;
    qty: Prisma.Decimal;
  }) {
    return tx.stockTransferItem.create({ data });
  }

  async attachSerials(tx: TransactionClient, transferItemId: string, serialNumberIds: string[]) {
    if (!serialNumberIds.length) return;
    await tx.stockTransferItemSerial.createMany({
      data: serialNumberIds.map((serialNumberId) => ({ transferItemId, serialNumberId })),
      skipDuplicates: true,
    });
  }

  async attachBatches(
    tx: TransactionClient,
    transferItemId: string,
    batches: Array<{ batchLotId: string; qty: Prisma.Decimal }>,
  ) {
    if (!batches.length) return;
    await tx.stockTransferItemBatch.createMany({
      data: batches.map((batch) => ({ transferItemId, batchLotId: batch.batchLotId, qty: batch.qty })),
      skipDuplicates: true,
    });
  }

  async lockTransfer(tx: TransactionClient, organizationId: string, id: string) {
    const rows = await tx.$queryRaw<Array<{
      id: string; organizationId: string; fromWarehouseId: string; toWarehouseId: string;
      transferNo: string; status: string;
    }>>`
      SELECT "id","organizationId","fromWarehouseId","toWarehouseId","transferNo","status"
      FROM "StockTransfer"
      WHERE "id" = ${id}::uuid AND "organizationId" = ${organizationId}::uuid
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  items(tx: TransactionClient, transferId: string) {
    return tx.stockTransferItem.findMany({
      where: { transferId },
      orderBy: { id: 'asc' },
      include: {
        product: { select: { trackingType: true } },
        serials: { include: { serialNumber: true } },
        batches: { include: { batchLot: true } },
      },
    });
  }

  markDispatched(tx: TransactionClient, id: string) {
    return tx.stockTransfer.update({
      where: { id },
      data: { status: 'IN_TRANSIT', dispatchedAt: new Date() },
    });
  }

  markReceived(tx: TransactionClient, id: string) {
    return tx.stockTransfer.update({
      where: { id },
      data: { status: 'RECEIVED', receivedAt: new Date() },
    });
  }

  markItemReceived(tx: TransactionClient, id: string, qty: Prisma.Decimal) {
    return tx.stockTransferItem.update({ where: { id }, data: { receivedQty: qty } });
  }

  async lockSerials(tx: TransactionClient, organizationId: string, serialIds: string[]) {
    if (!serialIds.length) return [];
    const rows = await tx.serialNumber.findMany({
      where: { organizationId, id: { in: serialIds } },
      orderBy: { id: 'asc' },
    });
    // Balance/transfer row locks serialize the stock command. Serial state is
    // rechecked immediately before mutation inside that same transaction.
    return rows;
  }

  setSerialInTransit(tx: TransactionClient, id: string) {
    return tx.serialNumber.update({ where: { id }, data: { status: 'IN_TRANSIT' } });
  }

  setSerialReceived(tx: TransactionClient, id: string, warehouseId: string) {
    return tx.serialNumber.update({
      where: { id },
      data: { status: 'AVAILABLE', currentWarehouseId: warehouseId },
    });
  }
}
