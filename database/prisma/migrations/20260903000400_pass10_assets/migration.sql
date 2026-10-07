-- NEXORA ERP Pass 10 - Assets
-- Source asset catalog + implementation-support fields for cost history, warranty document reference,
-- QR expiry/access controls and replacement linkage.

CREATE TABLE "Asset" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "assetNo" VARCHAR(160) NOT NULL,
  "productId" UUID NOT NULL,
  "serialNumberId" UUID,
  "customerId" UUID NOT NULL,
  "siteId" UUID NOT NULL,
  "areaId" UUID,
  "projectId" UUID NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'PROCURED',
  "installedAt" TIMESTAMPTZ(6),
  "purchaseCost" DECIMAL(18,2),
  "supplierVendorId" UUID,
  "replacedByAssetId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Asset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Asset_organizationId_assetNo_key" UNIQUE ("organizationId","assetNo"),
  CONSTRAINT "Asset_serialNumberId_key" UNIQUE ("serialNumberId"),
  CONSTRAINT "Asset_replacedByAssetId_key" UNIQUE ("replacedByAssetId"),
  CONSTRAINT "Asset_purchase_cost_check" CHECK ("purchaseCost" IS NULL OR "purchaseCost" >= 0),
  CONSTRAINT "Asset_status_check" CHECK ("status" IN (
    'PROCURED','IN_WAREHOUSE','ALLOCATED','ISSUED','INSTALLED','ACTIVE',
    'UNDER_MAINTENANCE','REPAIRED','REPLACED','RETIRED'
  ))
);

CREATE TABLE "AssetInstallation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "assetId" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "technicianId" UUID NOT NULL,
  "installedAt" TIMESTAMPTZ(6) NOT NULL,
  "locationText" VARCHAR(500) NOT NULL,
  "checklistId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetInstallation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetHistory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "assetId" UUID NOT NULL,
  "eventType" VARCHAR(120) NOT NULL,
  "oldStatus" VARCHAR(50),
  "newStatus" VARCHAR(50),
  "referenceType" VARCHAR(120),
  "referenceId" UUID,
  "detailsJson" JSONB,
  "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetWarranty" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "assetId" UUID NOT NULL,
  "vendorId" UUID NOT NULL,
  "startsAt" DATE NOT NULL,
  "expiresAt" DATE NOT NULL,
  "terms" TEXT,
  "documentId" UUID,
  "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetWarranty_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssetWarranty_dates_check" CHECK ("expiresAt" >= "startsAt"),
  CONSTRAINT "AssetWarranty_status_check" CHECK ("status" IN ('ACTIVE','EXPIRING','EXPIRED','VOID'))
);

CREATE TABLE "AssetQrTag" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "assetId" UUID NOT NULL,
  "token" VARCHAR(128) NOT NULL,
  "generatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(6),
  "revokedAt" TIMESTAMPTZ(6),
  CONSTRAINT "AssetQrTag_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssetQrTag_assetId_key" UNIQUE ("assetId"),
  CONSTRAINT "AssetQrTag_token_key" UNIQUE ("token")
);

CREATE TABLE "AssetRMA" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "assetId" UUID NOT NULL,
  "vendorId" UUID NOT NULL,
  "rmaNo" VARCHAR(160) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'REQUESTED',
  "reason" TEXT,
  "sentAt" TIMESTAMPTZ(6),
  "returnedAt" TIMESTAMPTZ(6),
  "resolution" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetRMA_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssetRMA_organizationId_rmaNo_key" UNIQUE ("organizationId","rmaNo"),
  CONSTRAINT "AssetRMA_status_check" CHECK ("status" IN (
    'REQUESTED','SUPPLIER_APPROVED','SENT','REPAIRED','REPLACED','RECEIVED','CLOSED','CANCELLED'
  ))
);

CREATE INDEX "Asset_organizationId_customerId_status_idx" ON "Asset"("organizationId","customerId","status");
CREATE INDEX "Asset_organizationId_siteId_status_idx" ON "Asset"("organizationId","siteId","status");
CREATE INDEX "Asset_organizationId_projectId_status_idx" ON "Asset"("organizationId","projectId","status");
CREATE INDEX "Asset_organizationId_productId_status_idx" ON "Asset"("organizationId","productId","status");
CREATE INDEX "Asset_organizationId_serialNumberId_idx" ON "Asset"("organizationId","serialNumberId");
CREATE INDEX "Asset_organizationId_supplierVendorId_idx" ON "Asset"("organizationId","supplierVendorId");
CREATE INDEX "AssetInstallation_organizationId_assetId_installedAt_idx" ON "AssetInstallation"("organizationId","assetId","installedAt");
CREATE INDEX "AssetInstallation_organizationId_projectId_installedAt_idx" ON "AssetInstallation"("organizationId","projectId","installedAt");
CREATE INDEX "AssetInstallation_organizationId_technicianId_installedAt_idx" ON "AssetInstallation"("organizationId","technicianId","installedAt");
CREATE INDEX "AssetHistory_organizationId_assetId_occurredAt_idx" ON "AssetHistory"("organizationId","assetId","occurredAt");
CREATE INDEX "AssetHistory_organizationId_eventType_occurredAt_idx" ON "AssetHistory"("organizationId","eventType","occurredAt");
CREATE INDEX "AssetHistory_referenceType_referenceId_idx" ON "AssetHistory"("referenceType","referenceId");
CREATE INDEX "AssetWarranty_organizationId_assetId_expiresAt_idx" ON "AssetWarranty"("organizationId","assetId","expiresAt");
CREATE INDEX "AssetWarranty_organizationId_vendorId_status_idx" ON "AssetWarranty"("organizationId","vendorId","status");
CREATE INDEX "AssetWarranty_organizationId_status_expiresAt_idx" ON "AssetWarranty"("organizationId","status","expiresAt");
CREATE INDEX "AssetQrTag_organizationId_revokedAt_expiresAt_idx" ON "AssetQrTag"("organizationId","revokedAt","expiresAt");
CREATE INDEX "AssetRMA_organizationId_assetId_status_idx" ON "AssetRMA"("organizationId","assetId","status");
CREATE INDEX "AssetRMA_organizationId_vendorId_status_idx" ON "AssetRMA"("organizationId","vendorId","status");

ALTER TABLE "Asset" ADD CONSTRAINT "Asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_serialNumberId_fkey" FOREIGN KEY ("serialNumberId") REFERENCES "SerialNumber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CustomerSite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "SiteArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_supplierVendorId_fkey" FOREIGN KEY ("supplierVendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_replacedByAssetId_fkey" FOREIGN KEY ("replacedByAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssetInstallation" ADD CONSTRAINT "AssetInstallation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetInstallation" ADD CONSTRAINT "AssetInstallation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetInstallation" ADD CONSTRAINT "AssetInstallation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetInstallation" ADD CONSTRAINT "AssetInstallation_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssetHistory" ADD CONSTRAINT "AssetHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetHistory" ADD CONSTRAINT "AssetHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssetWarranty" ADD CONSTRAINT "AssetWarranty_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetWarranty" ADD CONSTRAINT "AssetWarranty_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetWarranty" ADD CONSTRAINT "AssetWarranty_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssetQrTag" ADD CONSTRAINT "AssetQrTag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetQrTag" ADD CONSTRAINT "AssetQrTag_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetRMA" ADD CONSTRAINT "AssetRMA_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetRMA" ADD CONSTRAINT "AssetRMA_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetRMA" ADD CONSTRAINT "AssetRMA_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Resolve the deferred serial -> asset relation from Pass 6.
ALTER TABLE "SerialNumber" ADD CONSTRAINT "SerialNumber_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "SerialNumber_assetId_key"
  ON "SerialNumber"("assetId") WHERE "assetId" IS NOT NULL;
