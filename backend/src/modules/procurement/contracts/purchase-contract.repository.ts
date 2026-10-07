import { Prisma, prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class PurchaseContractRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new PurchaseContractRepository(db); }

  async lockContract(tx: TransactionClient, organizationId: string, id: string) {
    const rows = await tx.$queryRaw<Array<{
      id: string;
      organizationId: string;
      branchId: string | null;
      vendorId: string;
      contractNo: string;
      status: string;
      startDate: Date;
      endDate: Date;
      maxValue: Prisma.Decimal | null;
      releasedValue: Prisma.Decimal;
      createdById: string;
      approvedById: string | null;
    }>>`
      SELECT "id","organizationId","branchId","vendorId","contractNo","status",
             "startDate","endDate","maxValue","releasedValue","createdById","approvedById"
      FROM "PurchaseContract"
      WHERE "id" = ${id}::uuid
        AND "organizationId" = ${organizationId}::uuid
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  getContract(organizationId: string, id: string) {
    return this.db.purchaseContract.findFirst({
      where: { organizationId, id },
      include: { items: true, releaseOrders: { orderBy: { createdAt: 'desc' } } },
    });
  }

  createContract(tx: TransactionClient, data: {
    organizationId: string;
    branchId: string | null;
    vendorId: string;
    contractNo: string;
    startDate: Date;
    endDate: Date;
    maxValue: Prisma.Decimal | null;
    termsJson: unknown;
    notes: string | null;
    createdById: string;
    items: Array<{
      productId: string;
      agreedRate: Prisma.Decimal;
      maxQuantity: Prisma.Decimal | null;
      maxValue: Prisma.Decimal | null;
    }>;
  }) {
    return tx.purchaseContract.create({
      data: {
        organizationId: data.organizationId,
        branchId: data.branchId,
        vendorId: data.vendorId,
        contractNo: data.contractNo,
        status: 'DRAFT',
        startDate: data.startDate,
        endDate: data.endDate,
        maxValue: data.maxValue,
        termsJson: (data.termsJson ?? null) as never,
        notes: data.notes,
        createdById: data.createdById,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            agreedRate: item.agreedRate,
            maxQuantity: item.maxQuantity,
            maxValue: item.maxValue,
          })),
        },
      },
      include: { items: true },
    });
  }

  activateContract(tx: TransactionClient, id: string, actorUserId: string) {
    return tx.purchaseContract.update({
      where: { id },
      data: { status: 'ACTIVE', approvedById: actorUserId, approvedAt: new Date() },
      include: { items: true },
    });
  }

  contractItems(tx: TransactionClient, purchaseContractId: string) {
    return tx.purchaseContractItem.findMany({
      where: { purchaseContractId },
      orderBy: { id: 'asc' },
    });
  }

  incrementContractItemRelease(
    tx: TransactionClient,
    id: string,
    quantity: Prisma.Decimal,
    value: Prisma.Decimal,
  ) {
    return tx.purchaseContractItem.update({
      where: { id },
      data: {
        releasedQuantity: { increment: quantity },
        releasedValue: { increment: value },
      },
    });
  }

  incrementContractReleaseValue(tx: TransactionClient, id: string, value: Prisma.Decimal) {
    return tx.purchaseContract.update({
      where: { id },
      data: { releasedValue: { increment: value } },
    });
  }

  createReleaseOrder(tx: TransactionClient, data: {
    organizationId: string;
    branchId: string | null;
    purchaseContractId: string;
    vendorId: string;
    releaseOrderNo: string;
    releaseDate: Date;
    expectedDate: Date;
    totalValue: Prisma.Decimal;
    notes: string | null;
    createdById: string;
    items: Array<{
      contractItemId: string;
      productId: string;
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }>;
  }) {
    return tx.purchaseReleaseOrder.create({
      data: {
        organizationId: data.organizationId,
        branchId: data.branchId,
        purchaseContractId: data.purchaseContractId,
        vendorId: data.vendorId,
        releaseOrderNo: data.releaseOrderNo,
        releaseDate: data.releaseDate,
        expectedDate: data.expectedDate,
        totalValue: data.totalValue,
        notes: data.notes,
        createdById: data.createdById,
        status: 'CREATED',
        items: {
          create: data.items.map((item) => ({
            contractItemId: item.contractItemId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: { items: true },
    });
  }
}
