import { Prisma, prisma, type TransactionClient } from '@nexora/database';
import { normalizeAssetHistoryEvent } from './asset-lifecycle-policy.js';

type Db = typeof prisma | TransactionClient;

export class AssetRepository {
  constructor(private readonly db: Db = prisma) {}

  withDb(db: TransactionClient) {
    return new AssetRepository(db);
  }

  async list(input: {
    organizationId: string;
    status?: string;
    customerId?: string;
    siteId?: string;
    projectId?: string;
    productId?: string;
    skip: number;
    take: number;
  }) {
    const where = {
      organizationId: input.organizationId,
      ...(input.status ? { status: input.status } : {}),
      ...(input.customerId ? { customerId: input.customerId } : {}),
      ...(input.siteId ? { siteId: input.siteId } : {}),
      ...(input.projectId ? { projectId: input.projectId } : {}),
      ...(input.productId ? { productId: input.productId } : {}),
    };

    const [rows, total] = await Promise.all([
      this.db.asset.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: input.skip,
        take: input.take,
        include: {
          warranties: { orderBy: { createdAt: 'desc' }, take: 1 },
          qrTag: true,
        },
      }),
      this.db.asset.count({ where }),
    ]);

    return { rows, total };
  }

  async listBySite(input: {
    organizationId: string;
    siteId: string;
    status?: string;
    projectId?: string;
    skip: number;
    take: number;
  }) {
    const where = {
      organizationId: input.organizationId,
      siteId: input.siteId,
      ...(input.status ? { status: input.status } : {}),
      ...(input.projectId ? { projectId: input.projectId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.asset.findMany({
        where,
        orderBy: [{ assetNo: 'asc' }, { id: 'asc' }],
        skip: input.skip,
        take: input.take,
      }),
      this.db.asset.count({ where }),
    ]);
    return { rows, total };
  }

  get(organizationId: string, id: string) {
    return this.db.asset.findFirst({
      where: { id, organizationId },
      include: {
        serialNumber: true,
        warranties: { orderBy: { createdAt: 'desc' } },
        qrTag: true,
        rmas: { orderBy: { createdAt: 'desc' } },
        installations: { orderBy: { installedAt: 'desc' } },
        replacedBy: { select: { id: true, assetNo: true, status: true } },
        replaces: { select: { id: true, assetNo: true, status: true } },
      },
    });
  }

  async lockAsset(tx: TransactionClient, organizationId: string, id: string) {
    const rows = await tx.$queryRaw<Array<{
      id: string;
      organizationId: string;
      assetNo: string;
      productId: string;
      serialNumberId: string | null;
      customerId: string;
      siteId: string;
      areaId: string | null;
      projectId: string;
      status: string;
      installedAt: Date | null;
      purchaseCost: Prisma.Decimal | null;
      supplierVendorId: string | null;
      replacedByAssetId: string | null;
    }>>`
      SELECT "id","organizationId","assetNo","productId","serialNumberId","customerId",
             "siteId","areaId","projectId","status","installedAt","purchaseCost",
             "supplierVendorId","replacedByAssetId"
      FROM "Asset"
      WHERE "id" = ${id}::uuid
        AND "organizationId" = ${organizationId}::uuid
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  create(tx: TransactionClient, data: {
    organizationId: string;
    assetNo: string;
    productId: string;
    serialNumberId: string | null;
    customerId: string;
    siteId: string;
    areaId: string | null;
    projectId: string;
    status: string;
    purchaseCost: Prisma.Decimal | null;
    supplierVendorId: string | null;
  }) {
    return tx.asset.create({ data });
  }

  update(tx: TransactionClient, id: string, data: Record<string, unknown>) {
    return tx.asset.update({ where: { id }, data });
  }

  createInstallation(tx: TransactionClient, data: {
    organizationId: string;
    assetId: string;
    projectId: string;
    technicianId: string;
    installedAt: Date;
    locationText: string;
    checklistId: string | null;
  }) {
    return tx.assetInstallation.create({ data });
  }

  createHistory(tx: TransactionClient, data: {
    organizationId: string;
    assetId: string;
    eventType: string;
    oldStatus?: string | null;
    newStatus?: string | null;
    referenceType?: string | null;
    referenceId?: string | null;
    detailsJson?: unknown;
    occurredAt?: Date;
  }) {
    const normalized = normalizeAssetHistoryEvent({
      eventType: data.eventType,
      oldStatus: data.oldStatus as never,
      newStatus: data.newStatus as never,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
    });
    return tx.assetHistory.create({
      data: {
        organizationId: data.organizationId,
        assetId: data.assetId,
        eventType: normalized.eventType,
        oldStatus: normalized.oldStatus,
        newStatus: normalized.newStatus,
        referenceType: normalized.referenceType,
        referenceId: normalized.referenceId,
        detailsJson: (data.detailsJson ?? null) as never,
        occurredAt: data.occurredAt ?? new Date(),
      },
    });
  }

  async history(input: {
    organizationId: string;
    assetId: string;
    eventType?: string;
    skip: number;
    take: number;
  }) {
    const where = {
      organizationId: input.organizationId,
      assetId: input.assetId,
      ...(input.eventType ? { eventType: input.eventType } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.assetHistory.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip: input.skip,
        take: input.take,
      }),
      this.db.assetHistory.count({ where }),
    ]);
    return { rows, total };
  }

  createWarranty(tx: TransactionClient, data: {
    organizationId: string;
    assetId: string;
    vendorId: string;
    startsAt: Date;
    expiresAt: Date;
    terms: string | null;
    documentId: string | null;
    status: string;
  }) {
    return tx.assetWarranty.create({ data });
  }

  upsertQr(tx: TransactionClient, data: {
    organizationId: string;
    assetId: string;
    token: string;
    generatedAt: Date;
    expiresAt: Date | null;
  }) {
    return tx.assetQrTag.upsert({
      where: { assetId: data.assetId },
      update: {
        token: data.token,
        generatedAt: data.generatedAt,
        expiresAt: data.expiresAt,
        revokedAt: null,
      },
      create: {
        organizationId: data.organizationId,
        assetId: data.assetId,
        token: data.token,
        generatedAt: data.generatedAt,
        expiresAt: data.expiresAt,
        revokedAt: null,
      },
    });
  }

  revokeQr(tx: TransactionClient, assetId: string) {
    return tx.assetQrTag.updateMany({
      where: { assetId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  resolveQr(organizationId: string, token: string) {
    return this.db.assetQrTag.findFirst({
      where: {
        organizationId,
        token,
        revokedAt: null,
      },
      include: {
        asset: {
          include: {
            warranties: { orderBy: { createdAt: 'desc' }, take: 1 },
            installations: { orderBy: { installedAt: 'desc' }, take: 1 },
          },
        },
      },
    });
  }

  createRma(tx: TransactionClient, data: {
    organizationId: string;
    assetId: string;
    vendorId: string;
    rmaNo: string;
    status: string;
    reason: string;
  }) {
    return tx.assetRMA.create({ data });
  }
}
