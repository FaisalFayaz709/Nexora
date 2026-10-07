-- NEXORA ERP Pass 14 - Commercial Finance
-- Appendix F Finance extensions: Tax Engine, Bank/Cash, vouchers, and Landed Cost.
-- Financial/inventory effects are synchronous; queues are reserved for after-commit reporting.

CREATE TABLE "LandedCost" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "landedCostNo" VARCHAR(160) NOT NULL,
  "purchaseOrderId" UUID NOT NULL,
  "goodsReceiptId" UUID NOT NULL,
  "supplierInvoiceId" UUID,
  "allocationMethod" VARCHAR(40) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  "totalCost" DECIMAL(18,2) NOT NULL,
  "postedAt" TIMESTAMPTZ(6),
  "journalEntryId" UUID,
  "idempotencyKey" VARCHAR(200),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LandedCost_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LandedCost_organizationId_landedCostNo_key" UNIQUE ("organizationId","landedCostNo"),
  CONSTRAINT "LandedCost_organizationId_idempotencyKey_key" UNIQUE ("organizationId","idempotencyKey"),
  CONSTRAINT "LandedCost_method_check" CHECK ("allocationMethod" IN ('VALUE','QUANTITY','WEIGHT','MANUAL')),
  CONSTRAINT "LandedCost_status_check" CHECK ("status" IN ('DRAFT','ALLOCATED','POSTED','CANCELLED')),
  CONSTRAINT "LandedCost_total_check" CHECK ("totalCost" > 0)
);

CREATE TABLE "LandedCostLine" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "landedCostId" UUID NOT NULL,
  "costType" VARCHAR(40) NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "accountId" UUID,
  CONSTRAINT "LandedCostLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LandedCostLine_type_check" CHECK ("costType" IN ('FREIGHT','CUSTOMS','INSURANCE','HANDLING','TRANSPORT','OTHER')),
  CONSTRAINT "LandedCostLine_amount_check" CHECK ("amount" > 0)
);

CREATE TABLE "LandedCostAllocation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "landedCostId" UUID NOT NULL,
  "goodsReceiptItemId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "warehouseId" UUID NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL,
  "allocatedAmount" DECIMAL(18,2) NOT NULL,
  "unitCostDelta" DECIMAL(18,4) NOT NULL,
  "costLayerId" UUID,
  "postedAt" TIMESTAMPTZ(6),
  CONSTRAINT "LandedCostAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LandedCostAllocation_qty_check" CHECK ("quantity" > 0),
  CONSTRAINT "LandedCostAllocation_amount_check" CHECK ("allocatedAmount" >= 0),
  CONSTRAINT "LandedCostAllocation_unit_delta_check" CHECK ("unitCostDelta" >= 0)
);

CREATE TABLE "TaxJurisdiction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "country" VARCHAR(80),
  "region" VARCHAR(120),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaxJurisdiction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaxJurisdiction_organizationId_name_key" UNIQUE ("organizationId","name")
);

CREATE TABLE "TaxCode" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "taxType" VARCHAR(40) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  "recoverable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaxCode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaxCode_organizationId_code_key" UNIQUE ("organizationId","code"),
  CONSTRAINT "TaxCode_type_check" CHECK ("taxType" IN ('SALES','PURCHASE','WITHHOLDING','REVERSE_CHARGE')),
  CONSTRAINT "TaxCode_status_check" CHECK ("status" IN ('ACTIVE','INACTIVE'))
);

CREATE TABLE "TaxRate" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "taxCodeId" UUID NOT NULL,
  "jurisdictionId" UUID,
  "ratePct" DECIMAL(9,4) NOT NULL,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaxRate_rate_check" CHECK ("ratePct" >= 0 AND "ratePct" <= 100),
  CONSTRAINT "TaxRate_dates_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom")
);

CREATE TABLE "TaxRule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "taxCodeId" UUID NOT NULL,
  "jurisdictionId" UUID,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "conditionJson" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaxRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaxRule_priority_check" CHECK ("priority" >= 0),
  CONSTRAINT "TaxRule_dates_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom")
);

CREATE TABLE "TaxTransaction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "sourceType" VARCHAR(80) NOT NULL,
  "sourceId" UUID,
  "lineRef" VARCHAR(120),
  "partyType" VARCHAR(60),
  "partyId" UUID,
  "taxCodeId" UUID NOT NULL,
  "taxableAmount" DECIMAL(18,2) NOT NULL,
  "taxAmount" DECIMAL(18,2) NOT NULL,
  "ratePct" DECIMAL(9,4) NOT NULL,
  "transactionDate" DATE NOT NULL,
  "calculationJson" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaxTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaxTransaction_source_check" CHECK ("sourceType" IN ('QUOTATION','CUSTOMER_INVOICE','SUPPLIER_INVOICE','PURCHASE_ORDER','EXPENSE','PREVIEW')),
  CONSTRAINT "TaxTransaction_amount_check" CHECK ("taxableAmount" >= 0 AND "taxAmount" >= 0 AND "ratePct" >= 0)
);

CREATE TABLE "WithholdingTaxRule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "partyType" VARCHAR(80) NOT NULL,
  "ratePct" DECIMAL(9,4) NOT NULL,
  "threshold" DECIMAL(18,2),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WithholdingTaxRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WithholdingTaxRule_rate_check" CHECK ("ratePct" >= 0 AND "ratePct" <= 100),
  CONSTRAINT "WithholdingTaxRule_threshold_check" CHECK ("threshold" IS NULL OR "threshold" >= 0)
);

CREATE TABLE "BankAccount" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "branchId" UUID,
  "accountId" UUID NOT NULL,
  "bankName" VARCHAR(160) NOT NULL,
  "accountTitle" VARCHAR(160) NOT NULL,
  "accountNoMasked" VARCHAR(80) NOT NULL,
  "currency" VARCHAR(12) NOT NULL DEFAULT 'PKR',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CashAccount" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "branchId" UUID,
  "accountId" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "currency" VARCHAR(12) NOT NULL DEFAULT 'PKR',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CashAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BankStatement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "bankAccountId" UUID NOT NULL,
  "statementNo" VARCHAR(160) NOT NULL,
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "openingBalance" DECIMAL(18,2) NOT NULL,
  "closingBalance" DECIMAL(18,2) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'IMPORTED',
  "importedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "importedById" UUID NOT NULL,
  CONSTRAINT "BankStatement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BankStatement_organizationId_bankAccountId_statementNo_key" UNIQUE ("organizationId","bankAccountId","statementNo"),
  CONSTRAINT "BankStatement_period_check" CHECK ("periodEnd" >= "periodStart"),
  CONSTRAINT "BankStatement_status_check" CHECK ("status" IN ('IMPORTED','RECONCILED','VOID'))
);

CREATE TABLE "BankStatementLine" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "bankStatementId" UUID NOT NULL,
  "occurredAt" DATE NOT NULL,
  "description" VARCHAR(1000) NOT NULL,
  "reference" VARCHAR(160),
  "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "matchedType" VARCHAR(80),
  "matchedId" UUID,
  "status" VARCHAR(40) NOT NULL DEFAULT 'UNMATCHED',
  CONSTRAINT "BankStatementLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BankStatementLine_one_side_check" CHECK (("debit" > 0 AND "credit" = 0) OR ("credit" > 0 AND "debit" = 0)),
  CONSTRAINT "BankStatementLine_status_check" CHECK ("status" IN ('UNMATCHED','MATCHED','IGNORED'))
);

CREATE TABLE "BankReconciliation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "bankAccountId" UUID NOT NULL,
  "bankStatementId" UUID NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'OPEN',
  "closedAt" TIMESTAMPTZ(6),
  "closedById" UUID,
  "closingNote" TEXT,
  "journalLinksJson" JSONB,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BankReconciliation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BankReconciliation_status_check" CHECK ("status" IN ('OPEN','CLOSED','REOPENED'))
);

CREATE TABLE "PaymentVoucher" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "branchId" UUID,
  "voucherNo" VARCHAR(160) NOT NULL,
  "bankAccountId" UUID,
  "cashAccountId" UUID,
  "payeeType" VARCHAR(80) NOT NULL,
  "payeeId" UUID,
  "amount" DECIMAL(18,2) NOT NULL,
  "method" VARCHAR(40) NOT NULL,
  "voucherDate" TIMESTAMPTZ(6) NOT NULL,
  "memo" TEXT,
  "status" VARCHAR(40) NOT NULL DEFAULT 'POSTED',
  "journalEntryId" UUID,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentVoucher_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentVoucher_organizationId_voucherNo_key" UNIQUE ("organizationId","voucherNo"),
  CONSTRAINT "PaymentVoucher_account_exclusive_check" CHECK (
    ("bankAccountId" IS NOT NULL AND "cashAccountId" IS NULL) OR
    ("bankAccountId" IS NULL AND "cashAccountId" IS NOT NULL)
  ),
  CONSTRAINT "PaymentVoucher_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "PaymentVoucher_method_check" CHECK ("method" IN ('BANK_TRANSFER','CASH','CHEQUE','ONLINE'))
);

CREATE TABLE "ReceiptVoucher" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "branchId" UUID,
  "voucherNo" VARCHAR(160) NOT NULL,
  "bankAccountId" UUID,
  "cashAccountId" UUID,
  "payerType" VARCHAR(80) NOT NULL,
  "payerId" UUID,
  "amount" DECIMAL(18,2) NOT NULL,
  "method" VARCHAR(40) NOT NULL,
  "voucherDate" TIMESTAMPTZ(6) NOT NULL,
  "memo" TEXT,
  "status" VARCHAR(40) NOT NULL DEFAULT 'POSTED',
  "journalEntryId" UUID,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReceiptVoucher_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReceiptVoucher_organizationId_voucherNo_key" UNIQUE ("organizationId","voucherNo"),
  CONSTRAINT "ReceiptVoucher_account_exclusive_check" CHECK (
    ("bankAccountId" IS NOT NULL AND "cashAccountId" IS NULL) OR
    ("bankAccountId" IS NULL AND "cashAccountId" IS NOT NULL)
  ),
  CONSTRAINT "ReceiptVoucher_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "ReceiptVoucher_method_check" CHECK ("method" IN ('BANK_TRANSFER','CASH','CHEQUE','ONLINE'))
);

CREATE TABLE "ChequeRegister" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "branchId" UUID,
  "bankAccountId" UUID NOT NULL,
  "paymentVoucherId" UUID,
  "chequeNo" VARCHAR(160) NOT NULL,
  "payeeName" VARCHAR(240) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'ISSUED',
  "issuedAt" TIMESTAMPTZ(6) NOT NULL,
  "clearedAt" TIMESTAMPTZ(6),
  CONSTRAINT "ChequeRegister_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ChequeRegister_paymentVoucherId_key" UNIQUE ("paymentVoucherId"),
  CONSTRAINT "ChequeRegister_organizationId_bankAccountId_chequeNo_key" UNIQUE ("organizationId","bankAccountId","chequeNo"),
  CONSTRAINT "ChequeRegister_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "ChequeRegister_status_check" CHECK ("status" IN ('ISSUED','CLEARED','VOID','CANCELLED'))
);

CREATE INDEX "LandedCost_organizationId_purchaseOrderId_status_idx" ON "LandedCost"("organizationId","purchaseOrderId","status");
CREATE INDEX "LandedCost_organizationId_goodsReceiptId_status_idx" ON "LandedCost"("organizationId","goodsReceiptId","status");
CREATE INDEX "LandedCostAllocation_landedCostId_productId_idx" ON "LandedCostAllocation"("landedCostId","productId");
CREATE INDEX "TaxCode_organizationId_taxType_status_idx" ON "TaxCode"("organizationId","taxType","status");
CREATE INDEX "TaxTransaction_organizationId_sourceType_sourceId_idx" ON "TaxTransaction"("organizationId","sourceType","sourceId");
CREATE INDEX "BankAccount_organizationId_branchId_active_idx" ON "BankAccount"("organizationId","branchId","active");
CREATE INDEX "BankReconciliation_organizationId_bankAccountId_status_idx" ON "BankReconciliation"("organizationId","bankAccountId","status");
CREATE INDEX "PaymentVoucher_organizationId_branchId_status_voucherDate_idx" ON "PaymentVoucher"("organizationId","branchId","status","voucherDate");

ALTER TABLE "LandedCost" ADD CONSTRAINT "LandedCost_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LandedCost" ADD CONSTRAINT "LandedCost_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LandedCost" ADD CONSTRAINT "LandedCost_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "GoodsReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LandedCost" ADD CONSTRAINT "LandedCost_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES "SupplierInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LandedCostLine" ADD CONSTRAINT "LandedCostLine_landedCostId_fkey" FOREIGN KEY ("landedCostId") REFERENCES "LandedCost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LandedCostLine" ADD CONSTRAINT "LandedCostLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LandedCostAllocation" ADD CONSTRAINT "LandedCostAllocation_landedCostId_fkey" FOREIGN KEY ("landedCostId") REFERENCES "LandedCost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LandedCostAllocation" ADD CONSTRAINT "LandedCostAllocation_goodsReceiptItemId_fkey" FOREIGN KEY ("goodsReceiptItemId") REFERENCES "GoodsReceiptItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LandedCostAllocation" ADD CONSTRAINT "LandedCostAllocation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LandedCostAllocation" ADD CONSTRAINT "LandedCostAllocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TaxJurisdiction" ADD CONSTRAINT "TaxJurisdiction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaxCode" ADD CONSTRAINT "TaxCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaxRate" ADD CONSTRAINT "TaxRate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaxRate" ADD CONSTRAINT "TaxRate_taxCodeId_fkey" FOREIGN KEY ("taxCodeId") REFERENCES "TaxCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxRate" ADD CONSTRAINT "TaxRate_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "TaxJurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaxRule" ADD CONSTRAINT "TaxRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaxRule" ADD CONSTRAINT "TaxRule_taxCodeId_fkey" FOREIGN KEY ("taxCodeId") REFERENCES "TaxCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaxRule" ADD CONSTRAINT "TaxRule_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "TaxJurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaxTransaction" ADD CONSTRAINT "TaxTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaxTransaction" ADD CONSTRAINT "TaxTransaction_taxCodeId_fkey" FOREIGN KEY ("taxCodeId") REFERENCES "TaxCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WithholdingTaxRule" ADD CONSTRAINT "WithholdingTaxRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashAccount" ADD CONSTRAINT "CashAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashAccount" ADD CONSTRAINT "CashAccount_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashAccount" ADD CONSTRAINT "CashAccount_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BankStatementLine" ADD CONSTRAINT "BankStatementLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BankStatementLine" ADD CONSTRAINT "BankStatementLine_bankStatementId_fkey" FOREIGN KEY ("bankStatementId") REFERENCES "BankStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_bankStatementId_fkey" FOREIGN KEY ("bankStatementId") REFERENCES "BankStatement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "CashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptVoucher" ADD CONSTRAINT "ReceiptVoucher_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptVoucher" ADD CONSTRAINT "ReceiptVoucher_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptVoucher" ADD CONSTRAINT "ReceiptVoucher_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "CashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChequeRegister" ADD CONSTRAINT "ChequeRegister_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChequeRegister" ADD CONSTRAINT "ChequeRegister_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChequeRegister" ADD CONSTRAINT "ChequeRegister_paymentVoucherId_fkey" FOREIGN KEY ("paymentVoucherId") REFERENCES "PaymentVoucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
