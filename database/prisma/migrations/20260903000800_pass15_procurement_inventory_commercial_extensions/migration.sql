-- NEXORA ERP Pass 15 - Procurement & Inventory Commercial Extensions
-- Appendix F.2/F.4: Vendor onboarding & risk, stock-count completion hardening,
-- purchase contracts, blanket POs and release orders.

ALTER TABLE "Vendor"
  ADD COLUMN IF NOT EXISTS "riskScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "riskRating" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "bankVerifiedAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "documentsVerifiedAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "approvedCategoryIdsJson" JSONB,
  ADD COLUMN IF NOT EXISTS "blacklistedAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "blacklistReason" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedByOnboardingRequestId" UUID;

ALTER TABLE "Vendor"
  ADD CONSTRAINT IF NOT EXISTS "Vendor_risk_score_check"
  CHECK ("riskScore" IS NULL OR ("riskScore" >= 0 AND "riskScore" <= 100));

ALTER TABLE "VendorOnboardingRequest"
  ADD COLUMN IF NOT EXISTS "documentEvidenceJson" JSONB,
  ADD COLUMN IF NOT EXISTS "bankEvidenceJson" JSONB,
  ADD COLUMN IF NOT EXISTS "categoryIdsJson" JSONB,
  ADD COLUMN IF NOT EXISTS "documentsVerifiedAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "bankVerifiedAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "riskScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "riskRating" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "approvedCategoryIdsJson" JSONB,
  ADD COLUMN IF NOT EXISTS "blacklistReason" TEXT,
  ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMPTZ(6);

ALTER TABLE "VendorOnboardingRequest"
  ADD CONSTRAINT IF NOT EXISTS "VendorOnboardingRequest_risk_score_check"
  CHECK ("riskScore" IS NULL OR ("riskScore" >= 0 AND "riskScore" <= 100));

CREATE TABLE "VendorRiskAssessment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "vendorId" UUID NOT NULL,
  "onboardingRequestId" UUID,
  "assessorUserId" UUID NOT NULL,
  "riskScore" INTEGER NOT NULL,
  "riskRating" VARCHAR(40) NOT NULL,
  "documentsVerified" BOOLEAN NOT NULL DEFAULT false,
  "bankVerified" BOOLEAN NOT NULL DEFAULT false,
  "approvedCategoryIdsJson" JSONB,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VendorRiskAssessment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VendorRiskAssessment_score_check" CHECK ("riskScore" >= 0 AND "riskScore" <= 100),
  CONSTRAINT "VendorRiskAssessment_rating_check" CHECK ("riskRating" IN ('LOW','MEDIUM','HIGH','BLACKLISTED'))
);

CREATE TABLE "PurchaseContract" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "branchId" UUID,
  "vendorId" UUID NOT NULL,
  "contractNo" VARCHAR(160) NOT NULL,
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
  CONSTRAINT "PurchaseContract_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseContract_organizationId_contractNo_key" UNIQUE ("organizationId","contractNo"),
  CONSTRAINT "PurchaseContract_status_check" CHECK ("status" IN ('DRAFT','ACTIVE','EXPIRED','CLOSED','CANCELLED')),
  CONSTRAINT "PurchaseContract_dates_check" CHECK ("endDate" >= "startDate"),
  CONSTRAINT "PurchaseContract_max_value_check" CHECK ("maxValue" IS NULL OR "maxValue" > 0),
  CONSTRAINT "PurchaseContract_released_value_check" CHECK ("releasedValue" >= 0)
);

CREATE TABLE "PurchaseContractItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "purchaseContractId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "agreedRate" DECIMAL(18,4) NOT NULL,
  "maxQuantity" DECIMAL(18,4),
  "releasedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "maxValue" DECIMAL(18,2),
  "releasedValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
  CONSTRAINT "PurchaseContractItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseContractItem_purchaseContractId_productId_key" UNIQUE ("purchaseContractId","productId"),
  CONSTRAINT "PurchaseContractItem_rate_check" CHECK ("agreedRate" >= 0),
  CONSTRAINT "PurchaseContractItem_limit_check" CHECK ("maxQuantity" IS NOT NULL OR "maxValue" IS NOT NULL),
  CONSTRAINT "PurchaseContractItem_quantity_check" CHECK ("maxQuantity" IS NULL OR "maxQuantity" > 0),
  CONSTRAINT "PurchaseContractItem_value_check" CHECK ("maxValue" IS NULL OR "maxValue" > 0),
  CONSTRAINT "PurchaseContractItem_released_check" CHECK ("releasedQuantity" >= 0 AND "releasedValue" >= 0)
);

CREATE TABLE "PurchaseReleaseOrder" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "branchId" UUID,
  "purchaseContractId" UUID NOT NULL,
  "vendorId" UUID NOT NULL,
  "releaseOrderNo" VARCHAR(160) NOT NULL,
  "releaseDate" DATE NOT NULL,
  "expectedDate" DATE NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'CREATED',
  "totalValue" DECIMAL(18,2) NOT NULL,
  "notes" TEXT,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseReleaseOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseReleaseOrder_organizationId_releaseOrderNo_key" UNIQUE ("organizationId","releaseOrderNo"),
  CONSTRAINT "PurchaseReleaseOrder_status_check" CHECK ("status" IN ('CREATED','CANCELLED','FULFILLED')),
  CONSTRAINT "PurchaseReleaseOrder_total_check" CHECK ("totalValue" > 0),
  CONSTRAINT "PurchaseReleaseOrder_dates_check" CHECK ("expectedDate" >= "releaseDate")
);

CREATE TABLE "PurchaseReleaseOrderItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "releaseOrderId" UUID NOT NULL,
  "contractItemId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL,
  "unitPrice" DECIMAL(18,4) NOT NULL,
  "lineTotal" DECIMAL(18,2) NOT NULL,
  CONSTRAINT "PurchaseReleaseOrderItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseReleaseOrderItem_qty_check" CHECK ("quantity" > 0),
  CONSTRAINT "PurchaseReleaseOrderItem_price_check" CHECK ("unitPrice" >= 0),
  CONSTRAINT "PurchaseReleaseOrderItem_total_check" CHECK ("lineTotal" >= 0)
);

CREATE INDEX "VendorRiskAssessment_organizationId_vendorId_createdAt_idx" ON "VendorRiskAssessment"("organizationId","vendorId","createdAt");
CREATE INDEX "VendorRiskAssessment_organizationId_riskRating_createdAt_idx" ON "VendorRiskAssessment"("organizationId","riskRating","createdAt");
CREATE INDEX "Vendor_organizationId_riskRating_idx" ON "Vendor"("organizationId","riskRating");
CREATE INDEX "Vendor_organizationId_blacklistedAt_idx" ON "Vendor"("organizationId","blacklistedAt");
CREATE INDEX "PurchaseContract_organizationId_branchId_status_idx" ON "PurchaseContract"("organizationId","branchId","status");
CREATE INDEX "PurchaseContract_organizationId_vendorId_status_idx" ON "PurchaseContract"("organizationId","vendorId","status");
CREATE INDEX "PurchaseContract_organizationId_startDate_endDate_idx" ON "PurchaseContract"("organizationId","startDate","endDate");
CREATE INDEX "PurchaseContractItem_productId_idx" ON "PurchaseContractItem"("productId");
CREATE INDEX "PurchaseReleaseOrder_organizationId_branchId_status_idx" ON "PurchaseReleaseOrder"("organizationId","branchId","status");
CREATE INDEX "PurchaseReleaseOrder_organizationId_purchaseContractId_idx" ON "PurchaseReleaseOrder"("organizationId","purchaseContractId");
CREATE INDEX "PurchaseReleaseOrder_organizationId_vendorId_idx" ON "PurchaseReleaseOrder"("organizationId","vendorId");
CREATE INDEX "PurchaseReleaseOrderItem_releaseOrderId_idx" ON "PurchaseReleaseOrderItem"("releaseOrderId");
CREATE INDEX "PurchaseReleaseOrderItem_contractItemId_idx" ON "PurchaseReleaseOrderItem"("contractItemId");

ALTER TABLE "VendorRiskAssessment" ADD CONSTRAINT "VendorRiskAssessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorRiskAssessment" ADD CONSTRAINT "VendorRiskAssessment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorRiskAssessment" ADD CONSTRAINT "VendorRiskAssessment_onboardingRequestId_fkey" FOREIGN KEY ("onboardingRequestId") REFERENCES "VendorOnboardingRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorRiskAssessment" ADD CONSTRAINT "VendorRiskAssessment_assessorUserId_fkey" FOREIGN KEY ("assessorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseContract" ADD CONSTRAINT "PurchaseContract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseContract" ADD CONSTRAINT "PurchaseContract_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseContract" ADD CONSTRAINT "PurchaseContract_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseContract" ADD CONSTRAINT "PurchaseContract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseContract" ADD CONSTRAINT "PurchaseContract_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseContractItem" ADD CONSTRAINT "PurchaseContractItem_purchaseContractId_fkey" FOREIGN KEY ("purchaseContractId") REFERENCES "PurchaseContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseContractItem" ADD CONSTRAINT "PurchaseContractItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseReleaseOrder" ADD CONSTRAINT "PurchaseReleaseOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReleaseOrder" ADD CONSTRAINT "PurchaseReleaseOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReleaseOrder" ADD CONSTRAINT "PurchaseReleaseOrder_purchaseContractId_fkey" FOREIGN KEY ("purchaseContractId") REFERENCES "PurchaseContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReleaseOrder" ADD CONSTRAINT "PurchaseReleaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReleaseOrder" ADD CONSTRAINT "PurchaseReleaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReleaseOrderItem" ADD CONSTRAINT "PurchaseReleaseOrderItem_releaseOrderId_fkey" FOREIGN KEY ("releaseOrderId") REFERENCES "PurchaseReleaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseReleaseOrderItem" ADD CONSTRAINT "PurchaseReleaseOrderItem_contractItemId_fkey" FOREIGN KEY ("contractItemId") REFERENCES "PurchaseContractItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReleaseOrderItem" ADD CONSTRAINT "PurchaseReleaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
