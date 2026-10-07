-- Missing Pass M2 database certification corrections.
-- Adds source-of-truth tables required by the locked blueprint/addendum that were represented only as JSON/prose before this pass.

CREATE TABLE IF NOT EXISTS "SalesOrder" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT,
  "orderNo" VARCHAR(160) NOT NULL,
  "quotationId" UUID,
  "customerId" UUID NOT NULL REFERENCES "Customer"("id") ON DELETE RESTRICT,
  "siteId" UUID REFERENCES "CustomerSite"("id") ON DELETE RESTRICT,
  "status" VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  "subtotal" NUMERIC(18,2) NOT NULL DEFAULT 0,
  "taxTotal" NUMERIC(18,2) NOT NULL DEFAULT 0,
  "total" NUMERIC(18,2) NOT NULL DEFAULT 0,
  "acceptedAt" TIMESTAMPTZ(6),
  "createdById" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesOrder_organizationId_orderNo_key" UNIQUE ("organizationId", "orderNo")
);
CREATE INDEX IF NOT EXISTS "SalesOrder_organizationId_quotationId_idx" ON "SalesOrder"("organizationId", "quotationId");
CREATE INDEX IF NOT EXISTS "SalesOrder_organizationId_customerId_status_idx" ON "SalesOrder"("organizationId", "customerId", "status");
CREATE INDEX IF NOT EXISTS "SalesOrder_organizationId_siteId_idx" ON "SalesOrder"("organizationId", "siteId");

CREATE TABLE IF NOT EXISTS "SalesOrderItem" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT,
  "salesOrderId" UUID NOT NULL REFERENCES "SalesOrder"("id") ON DELETE CASCADE,
  "productId" UUID REFERENCES "Product"("id") ON DELETE RESTRICT,
  "description" VARCHAR(500) NOT NULL,
  "quantity" NUMERIC(18,4) NOT NULL DEFAULT 1,
  "unitPrice" NUMERIC(18,2) NOT NULL DEFAULT 0,
  "taxTotal" NUMERIC(18,2) NOT NULL DEFAULT 0,
  "lineTotal" NUMERIC(18,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "SalesOrderItem_organizationId_salesOrderId_idx" ON "SalesOrderItem"("organizationId", "salesOrderId");
CREATE INDEX IF NOT EXISTS "SalesOrderItem_organizationId_productId_idx" ON "SalesOrderItem"("organizationId", "productId");

ALTER TABLE "CustomerContract" ADD COLUMN IF NOT EXISTS "salesOrderId" UUID;
CREATE INDEX IF NOT EXISTS "CustomerContract_organizationId_salesOrderId_idx" ON "CustomerContract"("organizationId", "salesOrderId");

CREATE TABLE IF NOT EXISTS "VendorDocument" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT,
  "vendorId" UUID NOT NULL REFERENCES "Vendor"("id") ON DELETE RESTRICT,
  "onboardingRequestId" UUID REFERENCES "VendorOnboardingRequest"("id") ON DELETE SET NULL,
  "documentId" UUID REFERENCES "Document"("id") ON DELETE SET NULL,
  "documentType" VARCHAR(80) NOT NULL,
  "verificationStatus" VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  "verifiedByUserId" UUID REFERENCES "User"("id") ON DELETE SET NULL,
  "verifiedAt" TIMESTAMPTZ(6),
  "expiresAt" DATE,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "VendorDocument_organizationId_vendorId_documentType_idx" ON "VendorDocument"("organizationId", "vendorId", "documentType");
CREATE INDEX IF NOT EXISTS "VendorDocument_organizationId_onboardingRequestId_idx" ON "VendorDocument"("organizationId", "onboardingRequestId");
CREATE INDEX IF NOT EXISTS "VendorDocument_organizationId_verificationStatus_expiresAt_idx" ON "VendorDocument"("organizationId", "verificationStatus", "expiresAt");

CREATE TABLE IF NOT EXISTS "VendorBankAccount" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT,
  "vendorId" UUID NOT NULL REFERENCES "Vendor"("id") ON DELETE RESTRICT,
  "onboardingRequestId" UUID REFERENCES "VendorOnboardingRequest"("id") ON DELETE SET NULL,
  "accountTitle" VARCHAR(200) NOT NULL,
  "bankName" VARCHAR(160) NOT NULL,
  "branchName" VARCHAR(160),
  "accountNumberMasked" VARCHAR(80) NOT NULL,
  "ibanMasked" VARCHAR(80),
  "verificationStatus" VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  "verifiedByUserId" UUID REFERENCES "User"("id") ON DELETE SET NULL,
  "verifiedAt" TIMESTAMPTZ(6),
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "VendorBankAccount_organizationId_vendorId_verificationStatus_idx" ON "VendorBankAccount"("organizationId", "vendorId", "verificationStatus");
CREATE INDEX IF NOT EXISTS "VendorBankAccount_organizationId_onboardingRequestId_idx" ON "VendorBankAccount"("organizationId", "onboardingRequestId");

CREATE TABLE IF NOT EXISTS "VendorBlacklist" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT,
  "vendorId" UUID NOT NULL REFERENCES "Vendor"("id") ON DELETE RESTRICT,
  "reason" TEXT NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  "effectiveFrom" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "liftedAt" TIMESTAMPTZ(6),
  "liftedByUserId" UUID REFERENCES "User"("id") ON DELETE SET NULL,
  "createdById" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "VendorBlacklist_organizationId_vendorId_status_idx" ON "VendorBlacklist"("organizationId", "vendorId", "status");
CREATE INDEX IF NOT EXISTS "VendorBlacklist_organizationId_status_effectiveFrom_idx" ON "VendorBlacklist"("organizationId", "status", "effectiveFrom");

CREATE TABLE IF NOT EXISTS "VendorCategoryApproval" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT,
  "vendorId" UUID NOT NULL REFERENCES "Vendor"("id") ON DELETE RESTRICT,
  "onboardingRequestId" UUID REFERENCES "VendorOnboardingRequest"("id") ON DELETE SET NULL,
  "categoryKey" VARCHAR(120) NOT NULL,
  "approvalRequestId" UUID REFERENCES "ApprovalRequest"("id") ON DELETE SET NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  "approvedByUserId" UUID REFERENCES "User"("id") ON DELETE SET NULL,
  "approvedAt" TIMESTAMPTZ(6),
  "expiresAt" DATE,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VendorCategoryApproval_organizationId_vendorId_categoryKey_key" UNIQUE ("organizationId", "vendorId", "categoryKey")
);
CREATE INDEX IF NOT EXISTS "VendorCategoryApproval_organizationId_onboardingRequestId_idx" ON "VendorCategoryApproval"("organizationId", "onboardingRequestId");
CREATE INDEX IF NOT EXISTS "VendorCategoryApproval_organizationId_status_expiresAt_idx" ON "VendorCategoryApproval"("organizationId", "status", "expiresAt");

ALTER TABLE "JournalLine" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "JournalLine_organizationId_createdAt_idx" ON "JournalLine"("organizationId", "createdAt");
