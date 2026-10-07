-- NEXORA ERP Pass 6 — Inventory
CREATE TABLE "StockBalance" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "warehouseId" UUID NOT NULL,
  "locationId" UUID,
  "locationScopeKey" VARCHAR(64) NOT NULL,
  "productId" UUID NOT NULL,
  "onHand" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "reserved" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockBalance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockBalance_scope_key" UNIQUE ("organizationId","warehouseId","locationScopeKey","productId"),
  CONSTRAINT "StockBalance_nonnegative_check" CHECK ("onHand" >= 0 AND "reserved" >= 0 AND "reserved" <= "onHand")
);
CREATE TABLE "StockTransaction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "warehouseId" UUID NOT NULL,
  "locationId" UUID,
  "type" VARCHAR(80) NOT NULL,
  "qty" DECIMAL(18,4) NOT NULL,
  "referenceType" VARCHAR(100) NOT NULL,
  "referenceId" UUID NOT NULL,
  "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockTransaction_nonzero_qty_check" CHECK ("qty" <> 0),
  CONSTRAINT "StockTransaction_type_check" CHECK ("type" IN (
    'PURCHASE_RECEIPT','STOCK_TRANSFER','PROJECT_ISSUE','PROJECT_RETURN',
    'TECHNICIAN_ISSUE','TECHNICIAN_RETURN','SALES_ISSUE','DAMAGED',
    'ADJUSTMENT','CUSTOMER_INSTALLATION'
  ))
);
CREATE TABLE "StockReservation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "warehouseId" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "qty" DECIMAL(18,4) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMPTZ(6),
  CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockReservation_positive_qty_check" CHECK ("qty" > 0),
  CONSTRAINT "StockReservation_status_check" CHECK ("status" IN ('ACTIVE','RELEASED','CONSUMED'))
);
CREATE TABLE "StockTransfer" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "fromWarehouseId" UUID NOT NULL,
  "toWarehouseId" UUID NOT NULL,
  "transferNo" VARCHAR(160) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dispatchedAt" TIMESTAMPTZ(6),
  "receivedAt" TIMESTAMPTZ(6),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockTransfer_organizationId_transferNo_key" UNIQUE ("organizationId","transferNo"),
  CONSTRAINT "StockTransfer_different_warehouses_check" CHECK ("fromWarehouseId" <> "toWarehouseId"),
  CONSTRAINT "StockTransfer_status_check" CHECK ("status" IN ('DRAFT','IN_TRANSIT','RECEIVED'))
);
CREATE TABLE "StockTransferItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "transferId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "qty" DECIMAL(18,4) NOT NULL,
  "receivedQty" DECIMAL(18,4) NOT NULL DEFAULT 0,
  CONSTRAINT "StockTransferItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockTransferItem_qty_check" CHECK ("qty" > 0 AND "receivedQty" >= 0 AND "receivedQty" <= "qty")
);
CREATE TABLE "SerialNumber" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "serialNo" VARCHAR(200) NOT NULL,
  "status" VARCHAR(50) NOT NULL,
  "currentWarehouseId" UUID,
  "assetId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SerialNumber_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SerialNumber_organizationId_serialNo_key" UNIQUE ("organizationId","serialNo")
);
CREATE TABLE "BatchLot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "lotNo" VARCHAR(160) NOT NULL,
  "manufactureDate" DATE,
  "expiryDate" DATE,
  "qtyRemaining" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BatchLot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BatchLot_organizationId_productId_lotNo_key" UNIQUE ("organizationId","productId","lotNo"),
  CONSTRAINT "BatchLot_nonnegative_check" CHECK ("qtyRemaining" >= 0)
);
CREATE TABLE "StockTransferItemSerial" (
  "transferItemId" UUID NOT NULL,
  "serialNumberId" UUID NOT NULL,
  CONSTRAINT "StockTransferItemSerial_pkey" PRIMARY KEY ("transferItemId","serialNumberId")
);
CREATE TABLE "StockTransferItemBatch" (
  "transferItemId" UUID NOT NULL,
  "batchLotId" UUID NOT NULL,
  "qty" DECIMAL(18,4) NOT NULL,
  CONSTRAINT "StockTransferItemBatch_pkey" PRIMARY KEY ("transferItemId","batchLotId"),
  CONSTRAINT "StockTransferItemBatch_positive_qty_check" CHECK ("qty" > 0)
);
CREATE TABLE "StockTransactionSerial" (
  "stockTransactionId" UUID NOT NULL,
  "serialNumberId" UUID NOT NULL,
  CONSTRAINT "StockTransactionSerial_pkey" PRIMARY KEY ("stockTransactionId","serialNumberId")
);
CREATE TABLE "StockTransactionBatch" (
  "stockTransactionId" UUID NOT NULL,
  "batchLotId" UUID NOT NULL,
  "qty" DECIMAL(18,4) NOT NULL,
  CONSTRAINT "StockTransactionBatch_pkey" PRIMARY KEY ("stockTransactionId","batchLotId"),
  CONSTRAINT "StockTransactionBatch_positive_qty_check" CHECK ("qty" > 0)
);
CREATE TABLE "StockAdjustment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "warehouseId" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  "approvalRequestId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "postedAt" TIMESTAMPTZ(6),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockAdjustment_status_check" CHECK ("status" IN ('DRAFT','POSTED'))
);
CREATE TABLE "StockAdjustmentLine" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stockAdjustmentId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "locationId" UUID,
  "qtyDelta" DECIMAL(18,4) NOT NULL,
  "serialNumbersJson" JSONB,
  "batchesJson" JSONB,
  CONSTRAINT "StockAdjustmentLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockAdjustmentLine_nonzero_qty_check" CHECK ("qtyDelta" <> 0)
);

CREATE INDEX "StockBalance_organizationId_warehouseId_productId_idx" ON "StockBalance"("organizationId","warehouseId","productId");
CREATE INDEX "StockBalance_organizationId_productId_idx" ON "StockBalance"("organizationId","productId");
CREATE INDEX "StockTransaction_organizationId_warehouseId_productId_occurredAt_idx" ON "StockTransaction"("organizationId","warehouseId","productId","occurredAt");
CREATE INDEX "StockTransaction_organizationId_type_occurredAt_idx" ON "StockTransaction"("organizationId","type","occurredAt");
CREATE INDEX "StockTransaction_organizationId_referenceType_referenceId_idx" ON "StockTransaction"("organizationId","referenceType","referenceId");
CREATE INDEX "StockReservation_organizationId_warehouseId_productId_status_idx" ON "StockReservation"("organizationId","warehouseId","productId","status");
CREATE INDEX "StockReservation_organizationId_projectId_status_idx" ON "StockReservation"("organizationId","projectId","status");
CREATE INDEX "StockTransfer_organizationId_status_createdAt_idx" ON "StockTransfer"("organizationId","status","createdAt");
CREATE INDEX "StockTransfer_organizationId_fromWarehouseId_status_idx" ON "StockTransfer"("organizationId","fromWarehouseId","status");
CREATE INDEX "StockTransfer_organizationId_toWarehouseId_status_idx" ON "StockTransfer"("organizationId","toWarehouseId","status");
CREATE INDEX "StockTransferItem_transferId_productId_idx" ON "StockTransferItem"("transferId","productId");
CREATE INDEX "SerialNumber_organizationId_productId_status_idx" ON "SerialNumber"("organizationId","productId","status");
CREATE INDEX "SerialNumber_organizationId_currentWarehouseId_status_idx" ON "SerialNumber"("organizationId","currentWarehouseId","status");
CREATE INDEX "BatchLot_organizationId_productId_expiryDate_idx" ON "BatchLot"("organizationId","productId","expiryDate");
CREATE INDEX "StockTransferItemSerial_serialNumberId_idx" ON "StockTransferItemSerial"("serialNumberId");
CREATE INDEX "StockTransferItemBatch_batchLotId_idx" ON "StockTransferItemBatch"("batchLotId");
CREATE INDEX "StockTransactionSerial_serialNumberId_idx" ON "StockTransactionSerial"("serialNumberId");
CREATE INDEX "StockTransactionBatch_batchLotId_idx" ON "StockTransactionBatch"("batchLotId");
CREATE INDEX "StockAdjustment_organizationId_warehouseId_status_idx" ON "StockAdjustment"("organizationId","warehouseId","status");
CREATE INDEX "StockAdjustment_organizationId_approvalRequestId_idx" ON "StockAdjustment"("organizationId","approvalRequestId");
CREATE INDEX "StockAdjustmentLine_stockAdjustmentId_productId_idx" ON "StockAdjustmentLine"("stockAdjustmentId","productId");
CREATE INDEX "StockAdjustmentLine_locationId_idx" ON "StockAdjustmentLine"("locationId");

ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SerialNumber" ADD CONSTRAINT "SerialNumber_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SerialNumber" ADD CONSTRAINT "SerialNumber_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SerialNumber" ADD CONSTRAINT "SerialNumber_currentWarehouseId_fkey" FOREIGN KEY ("currentWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BatchLot" ADD CONSTRAINT "BatchLot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BatchLot" ADD CONSTRAINT "BatchLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransferItemSerial" ADD CONSTRAINT "StockTransferItemSerial_transferItemId_fkey" FOREIGN KEY ("transferItemId") REFERENCES "StockTransferItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockTransferItemSerial" ADD CONSTRAINT "StockTransferItemSerial_serialNumberId_fkey" FOREIGN KEY ("serialNumberId") REFERENCES "SerialNumber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransferItemBatch" ADD CONSTRAINT "StockTransferItemBatch_transferItemId_fkey" FOREIGN KEY ("transferItemId") REFERENCES "StockTransferItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockTransferItemBatch" ADD CONSTRAINT "StockTransferItemBatch_batchLotId_fkey" FOREIGN KEY ("batchLotId") REFERENCES "BatchLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransactionSerial" ADD CONSTRAINT "StockTransactionSerial_stockTransactionId_fkey" FOREIGN KEY ("stockTransactionId") REFERENCES "StockTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransactionSerial" ADD CONSTRAINT "StockTransactionSerial_serialNumberId_fkey" FOREIGN KEY ("serialNumberId") REFERENCES "SerialNumber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransactionBatch" ADD CONSTRAINT "StockTransactionBatch_stockTransactionId_fkey" FOREIGN KEY ("stockTransactionId") REFERENCES "StockTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransactionBatch" ADD CONSTRAINT "StockTransactionBatch_batchLotId_fkey" FOREIGN KEY ("batchLotId") REFERENCES "BatchLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockAdjustmentLine" ADD CONSTRAINT "StockAdjustmentLine_stockAdjustmentId_fkey" FOREIGN KEY ("stockAdjustmentId") REFERENCES "StockAdjustment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockAdjustmentLine" ADD CONSTRAINT "StockAdjustmentLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockAdjustmentLine" ADD CONSTRAINT "StockAdjustmentLine_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION nexora_reject_stock_transaction_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'StockTransaction is immutable; append a correcting transaction instead';
END;
$$;
CREATE TRIGGER "StockTransaction_immutable"
BEFORE UPDATE OR DELETE ON "StockTransaction"
FOR EACH ROW EXECUTE FUNCTION nexora_reject_stock_transaction_mutation();
