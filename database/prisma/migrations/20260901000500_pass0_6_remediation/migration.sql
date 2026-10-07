-- NEXORA ERP Pass 0–6 — Static compliance remediation.
-- Source-aligned security, feature/module control, vendor onboarding baseline,
-- stock count/cycle count baseline and inventory valuation layer foundation.

ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMPTZ(6);
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMPTZ(6);
ALTER TABLE "Role" ADD COLUMN "mfaRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Vendor" ALTER COLUMN "status" SET DEFAULT 'PENDING_ONBOARDING';

CREATE TABLE "PasswordResetToken" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL,
  "tokenHash" VARCHAR(128) NOT NULL, "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "usedAt" TIMESTAMPTZ(6), "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordResetToken_tokenHash_key" UNIQUE ("tokenHash")
);
CREATE INDEX "PasswordResetToken_userId_expiresAt_usedAt_idx" ON "PasswordResetToken"("userId","expiresAt","usedAt");
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FeatureFlag" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "key" VARCHAR(160) NOT NULL,
  "moduleKey" VARCHAR(100) NOT NULL, "name" VARCHAR(200) NOT NULL,
  "defaultEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FeatureFlag_key_key" UNIQUE ("key")
);
CREATE INDEX "FeatureFlag_moduleKey_key_idx" ON "FeatureFlag"("moduleKey","key");

CREATE TABLE "OrganizationFeature" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL,
  "featureFlagId" UUID NOT NULL, "enabled" BOOLEAN NOT NULL, "configJson" JSONB,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationFeature_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrganizationFeature_organizationId_featureFlagId_key" UNIQUE ("organizationId","featureFlagId")
);
CREATE INDEX "OrganizationFeature_organizationId_enabled_idx" ON "OrganizationFeature"("organizationId","enabled");
ALTER TABLE "OrganizationFeature" ADD CONSTRAINT "OrganizationFeature_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationFeature" ADD CONSTRAINT "OrganizationFeature_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "FeatureFlag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ModuleConfiguration" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL,
  "moduleKey" VARCHAR(100) NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT true,
  "configJson" JSONB, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModuleConfiguration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ModuleConfiguration_organizationId_moduleKey_key" UNIQUE ("organizationId","moduleKey")
);
CREATE INDEX "ModuleConfiguration_organizationId_enabled_idx" ON "ModuleConfiguration"("organizationId","enabled");
ALTER TABLE "ModuleConfiguration" ADD CONSTRAINT "ModuleConfiguration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SystemConfigurationHistory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL,
  "actorUserId" UUID, "subjectType" VARCHAR(100) NOT NULL, "subjectKey" VARCHAR(200) NOT NULL,
  "beforeJson" JSONB, "afterJson" JSONB,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemConfigurationHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SystemConfigurationHistory_organizationId_subjectType_subjectKey_createdAt_idx" ON "SystemConfigurationHistory"("organizationId","subjectType","subjectKey","createdAt");
CREATE INDEX "SystemConfigurationHistory_organizationId_actorUserId_createdAt_idx" ON "SystemConfigurationHistory"("organizationId","actorUserId","createdAt");
ALTER TABLE "SystemConfigurationHistory" ADD CONSTRAINT "SystemConfigurationHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SystemConfigurationHistory" ADD CONSTRAINT "SystemConfigurationHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SaaSPlan" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "key" VARCHAR(100) NOT NULL,
  "name" VARCHAR(200) NOT NULL, "moduleKeys" JSONB NOT NULL, "limitsJson" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaaSPlan_pkey" PRIMARY KEY ("id"), CONSTRAINT "SaaSPlan_key_key" UNIQUE ("key")
);
CREATE TABLE "SaaSSubscription" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL,
  "planId" UUID NOT NULL, "status" VARCHAR(50) NOT NULL,
  "startsAt" TIMESTAMPTZ(6) NOT NULL, "endsAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaaSSubscription_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SaaSSubscription_organizationId_status_startsAt_idx" ON "SaaSSubscription"("organizationId","status","startsAt");
ALTER TABLE "SaaSSubscription" ADD CONSTRAINT "SaaSSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SaaSSubscription" ADD CONSTRAINT "SaaSSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SaaSPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "VendorOnboardingRequest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL,
  "vendorId" UUID NOT NULL, "approvalRequestId" UUID,
  "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT', "requestedByUserId" UUID NOT NULL,
  "submittedByUserId" UUID, "approvedByUserId" UUID,
  "submittedAt" TIMESTAMPTZ(6), "approvedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VendorOnboardingRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VendorOnboardingRequest_status_check" CHECK ("status" IN ('DRAFT','SUBMITTED','APPROVED','REJECTED'))
);
CREATE INDEX "VendorOnboardingRequest_organizationId_status_createdAt_idx" ON "VendorOnboardingRequest"("organizationId","status","createdAt");
CREATE INDEX "VendorOnboardingRequest_organizationId_vendorId_status_idx" ON "VendorOnboardingRequest"("organizationId","vendorId","status");
ALTER TABLE "VendorOnboardingRequest" ADD CONSTRAINT "VendorOnboardingRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorOnboardingRequest" ADD CONSTRAINT "VendorOnboardingRequest_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorOnboardingRequest" ADD CONSTRAINT "VendorOnboardingRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorOnboardingRequest" ADD CONSTRAINT "VendorOnboardingRequest_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorOnboardingRequest" ADD CONSTRAINT "VendorOnboardingRequest_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "StockCount" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL,
  "warehouseId" UUID NOT NULL, "locationId" UUID, "countType" VARCHAR(40) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'DRAFT', "createdByUserId" UUID NOT NULL,
  "frozenAt" TIMESTAMPTZ(6), "submittedAt" TIMESTAMPTZ(6), "postedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockCount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockCount_type_check" CHECK ("countType" IN ('FULL','CYCLE')),
  CONSTRAINT "StockCount_status_check" CHECK ("status" IN ('DRAFT','IN_PROGRESS','SUBMITTED','POSTED','CANCELLED'))
);
CREATE INDEX "StockCount_organizationId_warehouseId_status_idx" ON "StockCount"("organizationId","warehouseId","status");
CREATE INDEX "StockCount_organizationId_locationId_status_idx" ON "StockCount"("organizationId","locationId","status");
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "StockCountLine" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "stockCountId" UUID NOT NULL,
  "productId" UUID NOT NULL, "systemQty" DECIMAL(18,4) NOT NULL,
  "countedQty" DECIMAL(18,4), "varianceQty" DECIMAL(18,4),
  CONSTRAINT "StockCountLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockCountLine_stockCountId_productId_key" UNIQUE ("stockCountId","productId"),
  CONSTRAINT "StockCountLine_nonnegative_count_check" CHECK ("countedQty" IS NULL OR "countedQty" >= 0)
);
CREATE INDEX "StockCountLine_productId_idx" ON "StockCountLine"("productId");
ALTER TABLE "StockCountLine" ADD CONSTRAINT "StockCountLine_stockCountId_fkey" FOREIGN KEY ("stockCountId") REFERENCES "StockCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockCountLine" ADD CONSTRAINT "StockCountLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "StockCountVariance" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "stockCountId" UUID NOT NULL,
  "lineId" UUID NOT NULL, "systemQty" DECIMAL(18,4) NOT NULL,
  "countedQty" DECIMAL(18,4) NOT NULL, "varianceQty" DECIMAL(18,4) NOT NULL,
  CONSTRAINT "StockCountVariance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockCountVariance_lineId_key" UNIQUE ("lineId")
);
CREATE INDEX "StockCountVariance_stockCountId_idx" ON "StockCountVariance"("stockCountId");
ALTER TABLE "StockCountVariance" ADD CONSTRAINT "StockCountVariance_stockCountId_fkey" FOREIGN KEY ("stockCountId") REFERENCES "StockCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockCountVariance" ADD CONSTRAINT "StockCountVariance_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "StockCountLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StockCountApproval" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "stockCountId" UUID NOT NULL,
  "approverUserId" UUID NOT NULL, "decision" VARCHAR(40) NOT NULL, "comment" TEXT,
  "approvedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockCountApproval_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StockCountApproval_stockCountId_approvedAt_idx" ON "StockCountApproval"("stockCountId","approvedAt");
ALTER TABLE "StockCountApproval" ADD CONSTRAINT "StockCountApproval_stockCountId_fkey" FOREIGN KEY ("stockCountId") REFERENCES "StockCount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockCountApproval" ADD CONSTRAINT "StockCountApproval_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "StockCountPosting" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "stockCountId" UUID NOT NULL,
  "stockAdjustmentId" UUID NOT NULL, "postedByUserId" UUID NOT NULL,
  "postedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockCountPosting_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockCountPosting_stockCountId_key" UNIQUE ("stockCountId")
);
CREATE INDEX "StockCountPosting_stockAdjustmentId_idx" ON "StockCountPosting"("stockAdjustmentId");
ALTER TABLE "StockCountPosting" ADD CONSTRAINT "StockCountPosting_stockCountId_fkey" FOREIGN KEY ("stockCountId") REFERENCES "StockCount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockCountPosting" ADD CONSTRAINT "StockCountPosting_stockAdjustmentId_fkey" FOREIGN KEY ("stockAdjustmentId") REFERENCES "StockAdjustment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockCountPosting" ADD CONSTRAINT "StockCountPosting_postedByUserId_fkey" FOREIGN KEY ("postedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "InventoryCostLayer" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL,
  "warehouseId" UUID NOT NULL, "productId" UUID NOT NULL,
  "sourceType" VARCHAR(100) NOT NULL, "sourceId" UUID NOT NULL,
  "quantityReceived" DECIMAL(18,4) NOT NULL, "quantityRemaining" DECIMAL(18,4) NOT NULL,
  "unitCost" DECIMAL(18,4) NOT NULL, "valuationMethod" VARCHAR(50) NOT NULL,
  "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryCostLayer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryCostLayer_qty_check" CHECK ("quantityReceived" >= 0 AND "quantityRemaining" >= 0 AND "quantityRemaining" <= "quantityReceived")
);
CREATE INDEX "InventoryCostLayer_organizationId_warehouseId_productId_receivedAt_idx" ON "InventoryCostLayer"("organizationId","warehouseId","productId","receivedAt");
CREATE INDEX "InventoryCostLayer_organizationId_sourceType_sourceId_idx" ON "InventoryCostLayer"("organizationId","sourceType","sourceId");
ALTER TABLE "InventoryCostLayer" ADD CONSTRAINT "InventoryCostLayer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCostLayer" ADD CONSTRAINT "InventoryCostLayer_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCostLayer" ADD CONSTRAINT "InventoryCostLayer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
