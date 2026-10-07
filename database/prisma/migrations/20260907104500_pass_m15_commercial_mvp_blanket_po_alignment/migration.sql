-- NEXORA ERP Pass M15 - Commercial MVP blanket purchase order alignment
-- Closes the Appendix F.2 traceability gap for BlanketPurchaseOrder and
-- BlanketPurchaseOrderItem without changing the locked route catalog.

CREATE TABLE IF NOT EXISTS "BlanketPurchaseOrder" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "branchId" UUID,
  "purchaseContractId" UUID NOT NULL,
  "vendorId" UUID NOT NULL,
  "blanketPoNo" VARCHAR(160) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "maxValue" DECIMAL(18,2),
  "releasedValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "termsJson" JSONB,
  "notes" TEXT,
  "createdById" UUID NOT NULL,
  "approvedById" UUID,
  "approvedAt" TIMESTAMPTZ(6),
  "closedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlanketPurchaseOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BlanketPurchaseOrder_organizationId_blanketPoNo_key" UNIQUE ("organizationId", "blanketPoNo"),
  CONSTRAINT "BlanketPurchaseOrder_status_check" CHECK ("status" IN ('DRAFT','ACTIVE','CLOSED','CANCELLED')),
  CONSTRAINT "BlanketPurchaseOrder_dates_check" CHECK ("endDate" >= "startDate"),
  CONSTRAINT "BlanketPurchaseOrder_max_value_check" CHECK ("maxValue" IS NULL OR "maxValue" > 0),
  CONSTRAINT "BlanketPurchaseOrder_released_value_check" CHECK ("releasedValue" >= 0)
);

CREATE TABLE IF NOT EXISTS "BlanketPurchaseOrderItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "blanketPurchaseOrderId" UUID NOT NULL,
  "purchaseContractItemId" UUID,
  "productId" UUID NOT NULL,
  "agreedRate" DECIMAL(18,4) NOT NULL,
  "maxQuantity" DECIMAL(18,4),
  "releasedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "maxValue" DECIMAL(18,2),
  "releasedValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlanketPurchaseOrderItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BlanketPurchaseOrderItem_blanketPurchaseOrderId_productId_key" UNIQUE ("blanketPurchaseOrderId", "productId"),
  CONSTRAINT "BlanketPurchaseOrderItem_rate_check" CHECK ("agreedRate" >= 0),
  CONSTRAINT "BlanketPurchaseOrderItem_limit_check" CHECK ("maxQuantity" IS NOT NULL OR "maxValue" IS NOT NULL),
  CONSTRAINT "BlanketPurchaseOrderItem_quantity_check" CHECK ("maxQuantity" IS NULL OR "maxQuantity" > 0),
  CONSTRAINT "BlanketPurchaseOrderItem_value_check" CHECK ("maxValue" IS NULL OR "maxValue" > 0),
  CONSTRAINT "BlanketPurchaseOrderItem_released_check" CHECK ("releasedQuantity" >= 0 AND "releasedValue" >= 0)
);

ALTER TABLE "PurchaseReleaseOrder"
  ADD COLUMN IF NOT EXISTS "blanketPurchaseOrderId" UUID;

CREATE INDEX IF NOT EXISTS "BlanketPurchaseOrder_organizationId_branchId_status_idx" ON "BlanketPurchaseOrder"("organizationId", "branchId", "status");
CREATE INDEX IF NOT EXISTS "BlanketPurchaseOrder_organizationId_purchaseContractId_idx" ON "BlanketPurchaseOrder"("organizationId", "purchaseContractId");
CREATE INDEX IF NOT EXISTS "BlanketPurchaseOrder_organizationId_vendorId_status_idx" ON "BlanketPurchaseOrder"("organizationId", "vendorId", "status");
CREATE INDEX IF NOT EXISTS "BlanketPurchaseOrder_organizationId_startDate_endDate_idx" ON "BlanketPurchaseOrder"("organizationId", "startDate", "endDate");
CREATE INDEX IF NOT EXISTS "BlanketPurchaseOrderItem_purchaseContractItemId_idx" ON "BlanketPurchaseOrderItem"("purchaseContractItemId");
CREATE INDEX IF NOT EXISTS "BlanketPurchaseOrderItem_productId_idx" ON "BlanketPurchaseOrderItem"("productId");
CREATE INDEX IF NOT EXISTS "PurchaseReleaseOrder_organizationId_blanketPurchaseOrderId_idx" ON "PurchaseReleaseOrder"("organizationId", "blanketPurchaseOrderId");

DO $$ BEGIN
  ALTER TABLE "BlanketPurchaseOrder" ADD CONSTRAINT "BlanketPurchaseOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "BlanketPurchaseOrder" ADD CONSTRAINT "BlanketPurchaseOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "BlanketPurchaseOrder" ADD CONSTRAINT "BlanketPurchaseOrder_purchaseContractId_fkey" FOREIGN KEY ("purchaseContractId") REFERENCES "PurchaseContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "BlanketPurchaseOrder" ADD CONSTRAINT "BlanketPurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "BlanketPurchaseOrder" ADD CONSTRAINT "BlanketPurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "BlanketPurchaseOrder" ADD CONSTRAINT "BlanketPurchaseOrder_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "BlanketPurchaseOrderItem" ADD CONSTRAINT "BlanketPurchaseOrderItem_blanketPurchaseOrderId_fkey" FOREIGN KEY ("blanketPurchaseOrderId") REFERENCES "BlanketPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "BlanketPurchaseOrderItem" ADD CONSTRAINT "BlanketPurchaseOrderItem_purchaseContractItemId_fkey" FOREIGN KEY ("purchaseContractItemId") REFERENCES "PurchaseContractItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "BlanketPurchaseOrderItem" ADD CONSTRAINT "BlanketPurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PurchaseReleaseOrder" ADD CONSTRAINT "PurchaseReleaseOrder_blanketPurchaseOrderId_fkey" FOREIGN KEY ("blanketPurchaseOrderId") REFERENCES "BlanketPurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
