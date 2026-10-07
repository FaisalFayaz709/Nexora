import { Prisma, prisma, type TransactionClient } from '@nexora/database';
import { AppError } from '../../core/http/errors.js';
import type { InventoryProduct, InventoryWarehouse } from './inventory.types.js';

type Db = typeof prisma | TransactionClient;
const WAREHOUSE_SCOPE = 'WAREHOUSE';

export class InventoryRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new InventoryRepository(db); }

  getWarehouse(organizationId: string, warehouseId: string): Promise<InventoryWarehouse | null> {
    return this.db.warehouse.findFirst({
      where: { id: warehouseId, organizationId },
      select: { id: true, organizationId: true, branchId: true, status: true },
    });
  }

  getProduct(organizationId: string, productId: string): Promise<InventoryProduct | null> {
    return this.db.product.findFirst({
      where: { id: productId, organizationId },
      select: { id: true, organizationId: true, trackingType: true, minStock: true },
    });
  }

  productMinStock(tx: TransactionClient, productId: string) {
    return tx.product.findUnique({ where: { id: productId }, select: { minStock: true } });
  }

  async locationBelongsToWarehouse(warehouseId: string, locationId: string): Promise<boolean> {
    return (await this.db.warehouseLocation.count({ where: { id: locationId, warehouseId } })) === 1;
  }

  async listBalances(input: {
    organizationId: string; branchId: string | null; warehouseId?: string;
    locationId?: string; productId?: string; skip: number; take: number;
  }) {
    const where = {
      organizationId: input.organizationId,
      ...(input.warehouseId ? { warehouseId: input.warehouseId } : {}),
      ...(input.locationId ? { locationId: input.locationId } : {}),
      ...(input.productId ? { productId: input.productId } : {}),
      ...(input.branchId ? { warehouse: { branchId: input.branchId } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.stockBalance.findMany({
        where,
        orderBy: [{ warehouseId: 'asc' }, { productId: 'asc' }, { locationScopeKey: 'asc' }],
        skip: input.skip, take: input.take,
      }),
      this.db.stockBalance.count({ where }),
    ]);
    return { rows, total };
  }

  async listLedger(input: {
    organizationId: string; branchId: string | null; warehouseId?: string;
    locationId?: string; productId?: string; type?: string; referenceType?: string;
    referenceId?: string; from?: Date; to?: Date; skip: number; take: number;
  }) {
    const where = {
      organizationId: input.organizationId,
      ...(input.warehouseId ? { warehouseId: input.warehouseId } : {}),
      ...(input.locationId ? { locationId: input.locationId } : {}),
      ...(input.productId ? { productId: input.productId } : {}),
      ...(input.type ? { type: input.type } : {}),
      ...(input.referenceType ? { referenceType: input.referenceType } : {}),
      ...(input.referenceId ? { referenceId: input.referenceId } : {}),
      ...(input.from || input.to ? { occurredAt: {
        ...(input.from ? { gte: input.from } : {}),
        ...(input.to ? { lte: input.to } : {}),
      }} : {}),
      ...(input.branchId ? { warehouse: { branchId: input.branchId } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.stockTransaction.findMany({
        where, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip: input.skip, take: input.take,
      }),
      this.db.stockTransaction.count({ where }),
    ]);
    return { rows, total };
  }


  async freeStockAcrossOrganization(
    organizationId: string,
    productIds: readonly string[],
  ): Promise<Array<{ productId: string; onHand: Prisma.Decimal; reserved: Prisma.Decimal }>> {
    if (!productIds.length) return [];
    const rows = await this.db.stockBalance.groupBy({
      by: ['productId'],
      where: {
        organizationId,
        productId: { in: [...productIds] },
        locationScopeKey: WAREHOUSE_SCOPE,
      },
      _sum: { onHand: true, reserved: true },
    });

    return rows.map((row) => ({
      productId: row.productId,
      onHand: row._sum.onHand ?? new Prisma.Decimal(0),
      reserved: row._sum.reserved ?? new Prisma.Decimal(0),
    }));
  }


  async lockSerialForAsset(
    tx: TransactionClient,
    organizationId: string,
    serialNo: string,
  ) {
    const rows = await tx.$queryRaw<Array<{
      id: string;
      organizationId: string;
      productId: string;
      serialNo: string;
      status: string;
      currentWarehouseId: string | null;
      assetId: string | null;
    }>>`
      SELECT "id","organizationId","productId","serialNo","status","currentWarehouseId","assetId"
      FROM "SerialNumber"
      WHERE "organizationId" = ${organizationId}::uuid
        AND "serialNo" = ${serialNo}
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  async lockSerialByIdForAsset(
    tx: TransactionClient,
    organizationId: string,
    serialNumberId: string,
  ) {
    const rows = await tx.$queryRaw<Array<{
      id: string;
      organizationId: string;
      productId: string;
      serialNo: string;
      status: string;
      currentWarehouseId: string | null;
      assetId: string | null;
    }>>`
      SELECT "id","organizationId","productId","serialNo","status","currentWarehouseId","assetId"
      FROM "SerialNumber"
      WHERE "organizationId" = ${organizationId}::uuid
        AND "id" = ${serialNumberId}::uuid
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  setSerialAsset(
    tx: TransactionClient,
    serialNumberId: string,
    assetId: string,
  ) {
    return tx.serialNumber.update({
      where: { id: serialNumberId },
      data: { assetId },
    });
  }

  findSerial(organizationId: string, serialNo: string) {
    return this.db.serialNumber.findUnique({
      where: { organizationId_serialNo: { organizationId, serialNo } },
    });
  }

  findSerialsByNumbers(
    tx: TransactionClient,
    organizationId: string,
    productId: string,
    serialNumbers: readonly string[],
  ) {
    return tx.serialNumber.findMany({
      where: { organizationId, productId, serialNo: { in: [...serialNumbers] } },
      select: { id: true, serialNo: true },
    });
  }

  async lockBatchForService(tx: TransactionClient, organizationId: string, productId: string, lotNo: string) {
    const rows = await tx.$queryRaw<Array<{ id:string; organizationId:string; productId:string; lotNo:string; qtyRemaining:Prisma.Decimal }>>`
      SELECT "id","organizationId","productId","lotNo","qtyRemaining"
      FROM "BatchLot"
      WHERE "organizationId"=${organizationId}::uuid AND "productId"=${productId}::uuid AND "lotNo"=${lotNo}
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  findBatch(tx: TransactionClient, organizationId: string, productId: string, lotNo: string) {
    return tx.batchLot.findUnique({
      where: { organizationId_productId_lotNo: { organizationId, productId, lotNo } },
    });
  }

  createSerial(tx: TransactionClient, data: {
    organizationId: string; productId: string; serialNo: string;
    status: string; currentWarehouseId: string | null;
  }) {
    return tx.serialNumber.create({ data });
  }

  findSerialByNo(tx: TransactionClient, organizationId: string, serialNo: string) {
    return tx.serialNumber.findUnique({
      where: { organizationId_serialNo: { organizationId, serialNo } },
    });
  }

  updateSerial(tx: TransactionClient, id: string, data: { status?: string; currentWarehouseId?: string | null }) {
    return tx.serialNumber.update({ where: { id }, data });
  }

  upsertBatch(tx: TransactionClient, input: {
    organizationId: string; productId: string; lotNo: string; qty: Prisma.Decimal;
    manufactureDate?: Date | null; expiryDate?: Date | null;
  }) {
    return tx.batchLot.upsert({
      where: { organizationId_productId_lotNo: {
        organizationId: input.organizationId, productId: input.productId, lotNo: input.lotNo,
      }},
      update: { qtyRemaining: { increment: input.qty } },
      create: {
        organizationId: input.organizationId, productId: input.productId, lotNo: input.lotNo,
        manufactureDate: input.manufactureDate ?? null, expiryDate: input.expiryDate ?? null,
        qtyRemaining: input.qty,
      },
    });
  }

  updateBatchRemaining(tx: TransactionClient, id: string, qtyRemaining: Prisma.Decimal) {
    return tx.batchLot.update({ where: { id }, data: { qtyRemaining } });
  }

  createCostLayer(tx: TransactionClient, input: {
    organizationId: string; warehouseId: string; productId: string;
    sourceType: string; sourceId: string; qty: Prisma.Decimal;
    unitCost: Prisma.Decimal; valuationMethod: string;
  }) {
    return tx.inventoryCostLayer.create({ data: {
      organizationId: input.organizationId, warehouseId: input.warehouseId,
      productId: input.productId, sourceType: input.sourceType, sourceId: input.sourceId,
      quantityReceived: input.qty, quantityRemaining: input.qty,
      unitCost: input.unitCost, valuationMethod: input.valuationMethod,
    }});
  }

  async assertStockNotFrozen(tx: TransactionClient, input: {
    organizationId: string; warehouseId: string; locationId?: string | null;
  }): Promise<void> {
    const freeze = await tx.stockCount.findFirst({
      where: {
        organizationId: input.organizationId,
        warehouseId: input.warehouseId,
        status: { in: ['IN_PROGRESS', 'SUBMITTED'] },
        ...(input.locationId ? { OR: [{ locationId: null }, { locationId: input.locationId }] } : {}),
      },
      select: { id: true },
    });
    if (freeze) {
      throw new AppError(409, 'INVENTORY_STOCK_FROZEN', 'Stock mutation is blocked while a physical stock count is active.', {
        stockCountId: freeze.id,
      });
    }
  }

  async lockBalance(tx: TransactionClient, input: {
    organizationId: string; warehouseId: string; locationId?: string | null; productId: string;
  }): Promise<{ id: string; onHand: Prisma.Decimal; reserved: Prisma.Decimal }> {
    const scopeKey = input.locationId ?? WAREHOUSE_SCOPE;
    await tx.$executeRaw`
      INSERT INTO "StockBalance"
        ("id","organizationId","warehouseId","locationId","locationScopeKey","productId","onHand","reserved","updatedAt")
      VALUES
        (gen_random_uuid(), ${input.organizationId}::uuid, ${input.warehouseId}::uuid,
         ${input.locationId ?? null}::uuid, ${scopeKey}, ${input.productId}::uuid, 0, 0, CURRENT_TIMESTAMP)
      ON CONFLICT ("organizationId","warehouseId","locationScopeKey","productId") DO NOTHING
    `;
    const rows = await tx.$queryRaw<Array<{ id: string; onHand: Prisma.Decimal; reserved: Prisma.Decimal }>>`
      SELECT "id","onHand","reserved"
      FROM "StockBalance"
      WHERE "organizationId" = ${input.organizationId}::uuid
        AND "warehouseId" = ${input.warehouseId}::uuid
        AND "locationScopeKey" = ${scopeKey}
        AND "productId" = ${input.productId}::uuid
      FOR UPDATE
    `;
    const row = rows[0];
    if (!row) throw new Error('Stock balance row could not be locked');
    return row;
  }

  aggregateBalance(tx: TransactionClient, organizationId: string, warehouseId: string, productId: string) {
    return tx.stockBalance.findFirst({
      where: { organizationId, warehouseId, productId, locationScopeKey: WAREHOUSE_SCOPE },
    });
  }

  updateBalance(tx: TransactionClient, id: string, data: { onHand?: Prisma.Decimal; reserved?: Prisma.Decimal }) {
    return tx.stockBalance.update({ where: { id }, data });
  }

  /**
   * Canonical balance mutation. Warehouse aggregate is always changed. When a
   * location is supplied, the matching location balance is changed in the same
   * transaction. This prevents aggregate/location divergence.
   */
  async applyOnHandDelta(tx: TransactionClient, input: {
    organizationId: string; warehouseId: string; locationId?: string | null;
    productId: string; delta: Prisma.Decimal; bypassFreeze?: boolean;
  }) {
    if (!input.bypassFreeze) await this.assertStockNotFrozen(tx, input);

    const aggregate = await this.lockBalance(tx, {
      organizationId: input.organizationId, warehouseId: input.warehouseId, productId: input.productId,
    });
    const location = input.locationId
      ? await this.lockBalance(tx, {
          organizationId: input.organizationId, warehouseId: input.warehouseId,
          locationId: input.locationId, productId: input.productId,
        })
      : aggregate;

    const nextAggregate = aggregate.onHand.add(input.delta);
    const nextLocation = location.onHand.add(input.delta);
    if (nextAggregate.isNegative() || nextAggregate.lessThan(aggregate.reserved)) {
      throw new AppError(409, 'INVENTORY_INSUFFICIENT_AVAILABLE_STOCK', 'Warehouse balance would fall below reserved stock.');
    }
    if (nextLocation.isNegative() || nextLocation.lessThan(location.reserved)) {
      throw new AppError(409, 'INVENTORY_LOCATION_INSUFFICIENT_STOCK', 'Location balance would fall below reserved stock.');
    }

    await this.updateBalance(tx, aggregate.id, { onHand: nextAggregate });
    if (location.id !== aggregate.id) await this.updateBalance(tx, location.id, { onHand: nextLocation });
    return { aggregate: { ...aggregate, onHand: nextAggregate }, location: { ...location, onHand: nextLocation } };
  }

  createTransaction(tx: TransactionClient, data: {
    organizationId: string; productId: string; warehouseId: string; locationId?: string | null;
    type: string; qty: Prisma.Decimal; referenceType: string; referenceId: string;
  }) {
    return tx.stockTransaction.create({ data: { ...data, locationId: data.locationId ?? null } });
  }

  async linkTransactionSerials(tx: TransactionClient, stockTransactionId: string, serialNumberIds: readonly string[]) {
    if (!serialNumberIds.length) return;
    await tx.stockTransactionSerial.createMany({
      data: serialNumberIds.map((serialNumberId) => ({ stockTransactionId, serialNumberId })),
      skipDuplicates: true,
    });
  }

  async linkTransactionBatches(
    tx: TransactionClient,
    stockTransactionId: string,
    batches: readonly { batchLotId: string; qty: Prisma.Decimal }[],
  ) {
    if (!batches.length) return;
    await tx.stockTransactionBatch.createMany({
      data: batches.map((batch) => ({ stockTransactionId, batchLotId: batch.batchLotId, qty: batch.qty })),
      skipDuplicates: true,
    });
  }
}
