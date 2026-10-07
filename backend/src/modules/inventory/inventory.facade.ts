import { Prisma, type TransactionClient } from '@nexora/database';
import { AppError } from '../../core/http/errors.js';
import { InventoryRepository } from './inventory.repository.js';
import { StockReservationRepository } from './stock-reservation.repository.js';

function decimalMax(left: Prisma.Decimal, right: Prisma.Decimal): Prisma.Decimal {
  return left.greaterThan(right) ? left : right;
}

/**
 * Public synchronous stock mutation boundary for Procurement, Projects, Assets,
 * Field Service and Maintenance. Caller supplies its existing transaction so
 * stock + owning business aggregate remain atomic.
 */
export class InventoryFacade {
  constructor(
    private readonly repository = new InventoryRepository(),
    private readonly reservations = new StockReservationRepository(),
  ) {}

  async getWarehouseForProcurement(organizationId: string, warehouseId: string) {
    const row = await this.repository.getWarehouse(organizationId, warehouseId);
    if (!row) throw new AppError(404, 'INVENTORY_WAREHOUSE_NOT_FOUND', 'Warehouse not found.');
    return row;
  }

  async getProductForProcurement(organizationId: string, productId: string) {
    const row = await this.repository.getProduct(organizationId, productId);
    if (!row) throw new AppError(404, 'INVENTORY_PRODUCT_NOT_FOUND', 'Product not found.');
    return row;
  }


  async freeStockForProject(
    organizationId: string,
    productIds: readonly string[],
  ): Promise<Map<string, Prisma.Decimal>> {
    const rows = await this.repository.freeStockAcrossOrganization(organizationId, productIds);
    return new Map(
      rows.map((row) => [
        row.productId,
        decimalMax(row.onHand.sub(row.reserved), new Prisma.Decimal(0)),
      ]),
    );
  }


  async registerSerializedAsset(
    tx: TransactionClient,
    input: {
      organizationId: string;
      serialNo: string;
    },
  ) {
    const serial = await this.repository.lockSerialForAsset(
      tx,
      input.organizationId,
      input.serialNo,
    );
    if (!serial) {
      throw new AppError(
        404,
        'ASSET_SERIAL_NOT_FOUND',
        'Serialized stock unit was not found.',
      );
    }
    if (
      serial.status !== 'AVAILABLE' ||
      !serial.currentWarehouseId ||
      serial.assetId
    ) {
      throw new AppError(
        409,
        'ASSET_SERIAL_NOT_ELIGIBLE',
        'Serialized stock unit is not eligible for asset registration.',
        {
          serialNo: serial.serialNo,
          status: serial.status,
          currentWarehouseId: serial.currentWarehouseId,
          assetId: serial.assetId,
        },
      );
    }
    return serial;
  }

  async linkSerializedAsset(
    tx: TransactionClient,
    input: {
      serialNumberId: string;
      assetId: string;
    },
  ) {
    return this.repository.setSerialAsset(
      tx,
      input.serialNumberId,
      input.assetId,
    );
  }


  async installSerializedAsset(
    tx: TransactionClient,
    input: {
      organizationId: string;
      serialNumberId: string;
      assetId: string;
      referenceId: string;
    },
  ) {
    const serial = await this.repository.lockSerialByIdForAsset(
      tx,
      input.organizationId,
      input.serialNumberId,
    );
    if (!serial) {
      throw new AppError(404, 'ASSET_SERIAL_NOT_FOUND', 'Serialized stock unit was not found.');
    }
    if (
      serial.assetId !== input.assetId ||
      serial.status !== 'AVAILABLE' ||
      !serial.currentWarehouseId
    ) {
      throw new AppError(
        409,
        'ASSET_SERIAL_NOT_INSTALLABLE',
        'Serialized unit is not available in warehouse stock for this asset.',
        {
          serialNo: serial.serialNo,
          status: serial.status,
          currentWarehouseId: serial.currentWarehouseId,
          assetId: serial.assetId,
        },
      );
    }

    const qty = new Prisma.Decimal(1);
    await this.repository.applyOnHandDelta(tx, {
      organizationId: input.organizationId,
      warehouseId: serial.currentWarehouseId,
      productId: serial.productId,
      delta: qty.negated(),
    });

    const ledger = await this.repository.createTransaction(tx, {
      organizationId: input.organizationId,
      productId: serial.productId,
      warehouseId: serial.currentWarehouseId,
      locationId: null,
      type: 'CUSTOMER_INSTALLATION',
      qty: qty.negated(),
      referenceType: 'AssetInstallation',
      referenceId: input.referenceId,
    });

    await this.repository.updateSerial(tx, serial.id, {
      status: 'INSTALLED',
      currentWarehouseId: null,
    });
    await this.repository.linkTransactionSerials(tx, ledger.id, [serial.id]);

    return {
      ledgerId: ledger.id,
      productId: serial.productId,
      serialNo: serial.serialNo,
      sourceWarehouseId: serial.currentWarehouseId,
    };
  }

  async validateServicePartSource(organizationId: string, input: { warehouseId:string; locationId?:string|null; productId:string }) {
    const warehouse = await this.repository.getWarehouse(organizationId, input.warehouseId);
    if (!warehouse) throw new AppError(404,'INVENTORY_WAREHOUSE_NOT_FOUND','Service-part source warehouse was not found.');
    if (input.locationId && !(await this.repository.locationBelongsToWarehouse(input.warehouseId,input.locationId))) {
      throw new AppError(400,'INVENTORY_LOCATION_INVALID','Service-part source location does not belong to the warehouse.');
    }
    const product = await this.repository.getProduct(organizationId,input.productId);
    if (!product) throw new AppError(404,'INVENTORY_PRODUCT_NOT_FOUND','Service-part product was not found.');
    return { warehouse, product };
  }

  async consumeServicePart(tx: TransactionClient, input: {
    organizationId:string; warehouseId:string; locationId?:string|null; productId:string; qty:Prisma.Decimal;
    referenceId:string; batches?:Array<{lotNo:string;qty:Prisma.Decimal}>;
  }) {
    if (!input.qty.isPositive()) throw new AppError(400,'INVENTORY_QUANTITY_INVALID','Service-part quantity must be positive.');
    const product = await this.repository.getProduct(input.organizationId,input.productId);
    if (!product) throw new AppError(404,'INVENTORY_PRODUCT_NOT_FOUND','Product not found.');
    if (product.trackingType === 'SERIAL') throw new AppError(409,'SERVICE_SERIAL_PART_REQUIRES_ASSET_WORKFLOW','Serialized equipment cannot be consumed anonymously as a service part; use the Asset install/replace workflow.');
    const batches=input.batches??[];
    if (product.trackingType==='BATCH') {
      const total=batches.reduce((s,r)=>s.add(r.qty),new Prisma.Decimal(0));
      if (!total.eq(input.qty)) throw new AppError(400,'SERVICE_BATCH_ALLOCATION_MISMATCH','Batch allocations must equal service-part quantity.');
    } else if (batches.length) throw new AppError(400,'SERVICE_BATCH_NOT_ALLOWED','Batch allocations are only valid for batch-tracked products.');
    await this.repository.applyOnHandDelta(tx,{organizationId:input.organizationId,warehouseId:input.warehouseId,locationId:input.locationId??null,productId:input.productId,delta:input.qty.negated()});
    const ledger=await this.repository.createTransaction(tx,{organizationId:input.organizationId,productId:input.productId,warehouseId:input.warehouseId,locationId:input.locationId??null,type:'TECHNICIAN_ISSUE',qty:input.qty.negated(),referenceType:'ServiceReport',referenceId:input.referenceId});
    const links=[] as Array<{batchLotId:string;qty:Prisma.Decimal}>;
    for (const a of batches) {
      const lot=await this.repository.lockBatchForService(tx,input.organizationId,input.productId,a.lotNo);
      if (!lot || lot.qtyRemaining.lt(a.qty)) throw new AppError(409,'SERVICE_BATCH_INSUFFICIENT','Batch lot does not contain enough remaining quantity.',{lotNo:a.lotNo});
      await this.repository.updateBatchRemaining(tx,lot.id,lot.qtyRemaining.sub(a.qty));
      links.push({batchLotId:lot.id,qty:a.qty.negated()});
    }
    await this.repository.linkTransactionBatches(tx,ledger.id,links);
    return ledger;
  }


  async consumeMaintenancePart(
    tx: TransactionClient,
    input: {
      organizationId: string;
      warehouseId: string;
      locationId?: string | null;
      productId: string;
      qty: Prisma.Decimal;
      referenceId: string;
      batches?: Array<{ lotNo: string; qty: Prisma.Decimal }>;
    },
  ) {
    if (!input.qty.isPositive()) {
      throw new AppError(
        400,
        'MAINTENANCE_PART_QUANTITY_INVALID',
        'Maintenance part quantity must be positive.',
      );
    }

    const product = await this.repository.getProduct(
      input.organizationId,
      input.productId,
    );
    if (!product) {
      throw new AppError(404, 'INVENTORY_PRODUCT_NOT_FOUND', 'Product not found.');
    }
    if (product.trackingType === 'SERIAL') {
      throw new AppError(
        409,
        'MAINTENANCE_SERIAL_PART_REQUIRES_ASSET_WORKFLOW',
        'Serialized equipment must use the Asset replacement workflow rather than anonymous maintenance part consumption.',
      );
    }

    const batches = input.batches ?? [];
    if (product.trackingType === 'BATCH') {
      const total = batches.reduce(
        (sum, row) => sum.add(row.qty),
        new Prisma.Decimal(0),
      );
      if (!total.eq(input.qty)) {
        throw new AppError(
          400,
          'MAINTENANCE_BATCH_ALLOCATION_MISMATCH',
          'Batch allocations must equal maintenance part quantity.',
        );
      }
    } else if (batches.length) {
      throw new AppError(
        400,
        'MAINTENANCE_BATCH_NOT_ALLOWED',
        'Batch allocations are only valid for batch-tracked products.',
      );
    }

    await this.repository.applyOnHandDelta(tx, {
      organizationId: input.organizationId,
      warehouseId: input.warehouseId,
      locationId: input.locationId ?? null,
      productId: input.productId,
      delta: input.qty.negated(),
    });

    const ledger = await this.repository.createTransaction(tx, {
      organizationId: input.organizationId,
      productId: input.productId,
      warehouseId: input.warehouseId,
      locationId: input.locationId ?? null,
      type: 'TECHNICIAN_ISSUE',
      qty: input.qty.negated(),
      referenceType: 'MaintenanceExecution',
      referenceId: input.referenceId,
    });

    const batchLinks: Array<{ batchLotId: string; qty: Prisma.Decimal }> = [];
    for (const allocation of batches) {
      const lot = await this.repository.lockBatchForService(
        tx,
        input.organizationId,
        input.productId,
        allocation.lotNo,
      );
      if (!lot || lot.qtyRemaining.lt(allocation.qty)) {
        throw new AppError(
          409,
          'MAINTENANCE_BATCH_INSUFFICIENT',
          'Batch lot does not contain enough remaining quantity.',
          { lotNo: allocation.lotNo },
        );
      }
      await this.repository.updateBatchRemaining(
        tx,
        lot.id,
        lot.qtyRemaining.sub(allocation.qty),
      );
      batchLinks.push({
        batchLotId: lot.id,
        qty: allocation.qty.negated(),
      });
    }

    await this.repository.linkTransactionBatches(tx, ledger.id, batchLinks);
    return ledger;
  }


  async recordLandedCostLayer(
    tx: TransactionClient,
    input: {
      organizationId: string;
      warehouseId: string;
      productId: string;
      quantity: Prisma.Decimal;
      unitCostDelta: Prisma.Decimal;
      landedCostId: string;
      allocationId: string;
    },
  ) {
    if (!input.quantity.isPositive()) {
      throw new AppError(400, 'LANDED_COST_LAYER_QUANTITY_INVALID', 'Landed cost layer quantity must be positive.');
    }
    if (input.unitCostDelta.isNegative()) {
      throw new AppError(400, 'LANDED_COST_UNIT_DELTA_INVALID', 'Landed cost unit delta cannot be negative.');
    }
    return this.repository.createCostLayer(tx, {
      organizationId: input.organizationId,
      warehouseId: input.warehouseId,
      productId: input.productId,
      sourceType: 'LandedCost',
      sourceId: input.allocationId,
      qty: input.quantity,
      unitCost: input.unitCostDelta,
      valuationMethod: 'WEIGHTED_AVERAGE',
    });
  }

  async receiveIntoWarehouse(tx: TransactionClient, input: {
    organizationId: string; warehouseId: string; locationId?: string | null;
    productId: string; qty: Prisma.Decimal; referenceType: string; referenceId: string;
    serialNumbers?: string[];
    batches?: Array<{ lotNo: string; qty: Prisma.Decimal; manufactureDate?: Date | null; expiryDate?: Date | null }>;
    unitCost?: Prisma.Decimal; valuationMethod?: 'FIFO' | 'WEIGHTED_AVERAGE';
  }) {
    await this.repository.applyOnHandDelta(tx, {
      organizationId: input.organizationId, warehouseId: input.warehouseId,
      locationId: input.locationId ?? null, productId: input.productId, delta: input.qty,
    });

    const ledger = await this.repository.createTransaction(tx, {
      organizationId: input.organizationId, productId: input.productId,
      warehouseId: input.warehouseId, locationId: input.locationId ?? null,
      type: 'PURCHASE_RECEIPT', qty: input.qty,
      referenceType: input.referenceType, referenceId: input.referenceId,
    });

    const serialIds: string[] = [];
    for (const serialNo of input.serialNumbers ?? []) {
      const serial = await this.repository.createSerial(tx, {
        organizationId: input.organizationId, productId: input.productId, serialNo,
        status: 'AVAILABLE', currentWarehouseId: input.warehouseId,
      });
      serialIds.push(serial.id);
    }
    await this.repository.linkTransactionSerials(tx, ledger.id, serialIds);

    const batchLinks: Array<{ batchLotId: string; qty: Prisma.Decimal }> = [];
    for (const batch of input.batches ?? []) {
      const row = await this.repository.upsertBatch(tx, {
        organizationId: input.organizationId, productId: input.productId, lotNo: batch.lotNo,
        qty: batch.qty, manufactureDate: batch.manufactureDate ?? null, expiryDate: batch.expiryDate ?? null,
      });
      batchLinks.push({ batchLotId: row.id, qty: batch.qty });
    }
    await this.repository.linkTransactionBatches(tx, ledger.id, batchLinks);

    if (input.unitCost) {
      await this.repository.createCostLayer(tx, {
        organizationId: input.organizationId, warehouseId: input.warehouseId,
        productId: input.productId, sourceType: input.referenceType, sourceId: input.referenceId,
        qty: input.qty, unitCost: input.unitCost,
        valuationMethod: input.valuationMethod ?? 'WEIGHTED_AVERAGE',
      });
    }
    return ledger;
  }

  async receivePurchaseReceipt(tx: TransactionClient, input: {
    organizationId: string;
    warehouseId: string;
    locationId?: string | null;
    productId: string;
    qty: Prisma.Decimal;
    goodsReceiptId: string;
    serialNumbers?: string[];
    batches?: Array<{ lotNo: string; qty: Prisma.Decimal; manufactureDate?: Date | null; expiryDate?: Date | null }>;
    unitCost?: Prisma.Decimal;
  }) {
    return this.receiveIntoWarehouse(tx, {
      organizationId: input.organizationId,
      warehouseId: input.warehouseId,
      locationId: input.locationId ?? null,
      productId: input.productId,
      qty: input.qty,
      referenceType: 'GoodsReceipt',
      referenceId: input.goodsReceiptId,
      serialNumbers: input.serialNumbers,
      batches: input.batches,
      unitCost: input.unitCost,
    });
  }

  async issueToProject(tx: TransactionClient, input: {
    organizationId: string;
    warehouseId: string;
    locationId?: string | null;
    productId: string;
    qty: Prisma.Decimal;
    projectId: string;
  }) {
    return this.consumeFromWarehouse(tx, {
      organizationId: input.organizationId,
      warehouseId: input.warehouseId,
      locationId: input.locationId ?? null,
      productId: input.productId,
      qty: input.qty,
      type: 'PROJECT_ISSUE',
      referenceType: 'PROJECT',
      referenceId: input.projectId,
    });
  }

  async consumeForServiceReport(tx: TransactionClient, input: {
    organizationId: string;
    warehouseId: string;
    locationId?: string | null;
    productId: string;
    qty: Prisma.Decimal;
    serviceReportId: string;
    batches?: Array<{ lotNo: string; qty: Prisma.Decimal }>;
  }) {
    return this.consumeServicePart(tx, {
      organizationId: input.organizationId,
      warehouseId: input.warehouseId,
      locationId: input.locationId ?? null,
      productId: input.productId,
      qty: input.qty,
      referenceId: input.serviceReportId,
      batches: input.batches,
    });
  }

  async releaseProjectReservation(tx: TransactionClient, input: {
    organizationId: string;
    reservationId: string;
  }) {
    const reservation = await this.reservations.lockReservation(
      tx,
      input.organizationId,
      input.reservationId,
    );
    if (!reservation) {
      throw new AppError(404, 'INVENTORY_RESERVATION_NOT_FOUND', 'Stock reservation not found.');
    }
    if (reservation.status !== 'ACTIVE') {
      throw new AppError(409, 'INVENTORY_RESERVATION_INVALID_STATE', 'Only ACTIVE stock reservations can be released.');
    }

    const balance = await this.repository.lockBalance(tx, {
      organizationId: input.organizationId,
      warehouseId: reservation.warehouseId,
      productId: reservation.productId,
    });
    const nextReserved = balance.reserved.sub(reservation.qty);
    if (nextReserved.isNegative()) {
      throw new AppError(409, 'INVENTORY_RESERVATION_BALANCE_CORRUPT', 'Reservation balance would become negative.');
    }
    await this.repository.updateBalance(tx, balance.id, { reserved: nextReserved });
    return this.reservations.markReleased(tx, reservation.id);
  }

  async consumeFromWarehouse(tx: TransactionClient, input: {
    organizationId: string; warehouseId: string; locationId?: string | null;
    productId: string; qty: Prisma.Decimal;
    type: 'PROJECT_ISSUE' | 'TECHNICIAN_ISSUE' | 'SALES_ISSUE' | 'DAMAGED' | 'CUSTOMER_INSTALLATION';
    referenceType: string; referenceId: string;
  }) {
    if (!input.qty.isPositive()) throw new AppError(400, 'INVENTORY_QUANTITY_INVALID', 'Quantity must be positive.');
    await this.repository.applyOnHandDelta(tx, {
      organizationId: input.organizationId, warehouseId: input.warehouseId,
      locationId: input.locationId ?? null, productId: input.productId, delta: input.qty.negated(),
    });
    return this.repository.createTransaction(tx, {
      organizationId: input.organizationId, productId: input.productId,
      warehouseId: input.warehouseId, locationId: input.locationId ?? null,
      type: input.type, qty: input.qty.negated(),
      referenceType: input.referenceType, referenceId: input.referenceId,
    });
  }
}
