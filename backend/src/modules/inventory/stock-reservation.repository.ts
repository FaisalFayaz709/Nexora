import { Prisma, prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class StockReservationRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new StockReservationRepository(db); }

  create(data: {
    organizationId: string;
    productId: string;
    warehouseId: string;
    projectId: string;
    qty: Prisma.Decimal;
  }) {
    return this.db.stockReservation.create({ data });
  }

  async lockReservation(tx: TransactionClient, organizationId: string, id: string) {
    const rows = await tx.$queryRaw<Array<{
      id: string;
      organizationId: string;
      productId: string;
      warehouseId: string;
      projectId: string;
      qty: Prisma.Decimal;
      status: string;
    }>>`
      SELECT "id","organizationId","productId","warehouseId","projectId","qty","status"
      FROM "StockReservation"
      WHERE "id" = ${id}::uuid
        AND "organizationId" = ${organizationId}::uuid
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  async lockActive(tx: TransactionClient, organizationId: string, id: string) {
    const row = await this.lockReservation(tx, organizationId, id);
    return row?.status === 'ACTIVE' ? row : null;
  }

  markReleased(tx: TransactionClient, id: string) {
    return tx.stockReservation.update({
      where: { id },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });
  }

  release(tx: TransactionClient, id: string) {
    return this.markReleased(tx, id);
  }
}
