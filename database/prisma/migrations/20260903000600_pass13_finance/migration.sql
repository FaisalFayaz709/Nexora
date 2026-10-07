-- Source customer invoice statuses: 'DRAFT','APPROVED','SENT','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED'

-- NEXORA ERP Pass 13 - Finance
-- Source Finance entity catalog and transactional invoice/payment/journal controls.

CREATE TABLE "FinancialPeriod" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialPeriod_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinancialPeriod_organizationId_startDate_endDate_key" UNIQUE ("organizationId","startDate","endDate"),
  CONSTRAINT "FinancialPeriod_dates_check" CHECK ("endDate" >= "startDate"),
  CONSTRAINT "FinancialPeriod_status_check" CHECK ("status" IN ('OPEN','CLOSED','LOCKED'))
);

CREATE TABLE "Account" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "parentId" UUID,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Account_organizationId_code_key" UNIQUE ("organizationId","code"),
  CONSTRAINT "Account_type_check" CHECK ("type" IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'))
);

CREATE TABLE "JournalEntry" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "periodId" UUID NOT NULL,
  "entryNo" VARCHAR(160) NOT NULL,
  "postedAt" TIMESTAMPTZ(6),
  "referenceType" VARCHAR(120),
  "referenceId" UUID,
  "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  "createdById" UUID NOT NULL,
  "reversedFromId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JournalEntry_organizationId_entryNo_key" UNIQUE ("organizationId","entryNo"),
  CONSTRAINT "JournalEntry_reversedFromId_key" UNIQUE ("reversedFromId"),
  CONSTRAINT "JournalEntry_status_check" CHECK ("status" IN ('DRAFT','POSTED','REVERSED'))
);

CREATE TABLE "JournalLine" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "journalEntryId" UUID NOT NULL,
  "accountId" UUID NOT NULL,
  "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "projectId" UUID,
  "branchId" UUID,
  CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JournalLine_one_side_check" CHECK (("debit" >= 0 AND "credit" = 0) OR ("credit" >= 0 AND "debit" = 0)),
  CONSTRAINT "JournalLine_nonzero_check" CHECK (("debit" + "credit") > 0)
);

CREATE TABLE "CustomerInvoice" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "invoiceNo" VARCHAR(160) NOT NULL,
  "customerId" UUID NOT NULL,
  "projectId" UUID,
  "contractId" UUID,
  "issueDate" DATE NOT NULL,
  "dueDate" DATE NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  "subtotal" DECIMAL(18,2) NOT NULL,
  "tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(18,2) NOT NULL,
  "balance" DECIMAL(18,2) NOT NULL,
  "approvalRequestId" UUID,
  "journalEntryId" UUID,
  "sentAt" TIMESTAMPTZ(6),
  "cancelledAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerInvoice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerInvoice_organizationId_invoiceNo_key" UNIQUE ("organizationId","invoiceNo"),
  CONSTRAINT "CustomerInvoice_approvalRequestId_key" UNIQUE ("approvalRequestId"),
  CONSTRAINT "CustomerInvoice_journalEntryId_key" UNIQUE ("journalEntryId"),
  CONSTRAINT "CustomerInvoice_dates_check" CHECK ("dueDate" >= "issueDate"),
  CONSTRAINT "CustomerInvoice_money_check" CHECK ("subtotal" >= 0 AND "tax" >= 0 AND "total" >= 0 AND "balance" >= 0),
  CONSTRAINT "CustomerInvoice_status_check" CHECK ("status" IN ('DRAFT','APPROVAL_PENDING','APPROVED','POSTED','SENT','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED','REVERSED'))
);

CREATE TABLE "CustomerInvoiceItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoiceId" UUID NOT NULL,
  "productId" UUID,
  "description" VARCHAR(500) NOT NULL,
  "qty" DECIMAL(18,4) NOT NULL,
  "unitPrice" DECIMAL(18,4) NOT NULL,
  "tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "lineTotal" DECIMAL(18,2) NOT NULL,
  CONSTRAINT "CustomerInvoiceItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerInvoiceItem_amount_check" CHECK ("qty" > 0 AND "unitPrice" >= 0 AND "tax" >= 0 AND "lineTotal" >= 0)
);

CREATE TABLE "SupplierInvoice" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "invoiceNo" VARCHAR(160) NOT NULL,
  "externalInvoiceNo" VARCHAR(160),
  "vendorId" UUID NOT NULL,
  "purchaseOrderId" UUID NOT NULL,
  "goodsReceiptId" UUID NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  "total" DECIMAL(18,2) NOT NULL,
  "balance" DECIMAL(18,2) NOT NULL,
  "matchStatus" VARCHAR(50) NOT NULL DEFAULT 'NOT_MATCHED',
  "approvalRequestId" UUID,
  "journalEntryId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierInvoice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplierInvoice_organizationId_invoiceNo_key" UNIQUE ("organizationId","invoiceNo"),
  CONSTRAINT "SupplierInvoice_approvalRequestId_key" UNIQUE ("approvalRequestId"),
  CONSTRAINT "SupplierInvoice_journalEntryId_key" UNIQUE ("journalEntryId"),
  CONSTRAINT "SupplierInvoice_money_check" CHECK ("total" >= 0 AND "balance" >= 0),
  CONSTRAINT "SupplierInvoice_match_check" CHECK ("matchStatus" IN ('NOT_MATCHED','MATCHED','VARIANCE','BLOCKED')),
  CONSTRAINT "SupplierInvoice_status_check" CHECK ("status" IN ('DRAFT','MATCHED','APPROVAL_PENDING','APPROVED','POSTED','PARTIALLY_PAID','PAID','CANCELLED','REVERSED'))
);

CREATE TABLE "SupplierInvoiceItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "supplierInvoiceId" UUID NOT NULL,
  "poItemId" UUID,
  "description" VARCHAR(500) NOT NULL,
  "qty" DECIMAL(18,4) NOT NULL,
  "unitPrice" DECIMAL(18,4) NOT NULL,
  "lineTotal" DECIMAL(18,2) NOT NULL,
  CONSTRAINT "SupplierInvoiceItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplierInvoiceItem_amount_check" CHECK ("qty" > 0 AND "unitPrice" >= 0 AND "lineTotal" >= 0)
);

CREATE TABLE "Payment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "paymentNo" VARCHAR(160) NOT NULL,
  "direction" VARCHAR(30) NOT NULL,
  "partyType" VARCHAR(50) NOT NULL,
  "partyId" UUID NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "method" VARCHAR(50) NOT NULL,
  "paidAt" TIMESTAMPTZ(6) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'POSTED',
  "journalEntryId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Payment_organizationId_paymentNo_key" UNIQUE ("organizationId","paymentNo"),
  CONSTRAINT "Payment_journalEntryId_key" UNIQUE ("journalEntryId"),
  CONSTRAINT "Payment_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "Payment_direction_check" CHECK ("direction" IN ('INBOUND','OUTBOUND')),
  CONSTRAINT "Payment_party_check" CHECK ("partyType" IN ('CUSTOMER','VENDOR','EMPLOYEE','OTHER')),
  CONSTRAINT "Payment_status_check" CHECK ("status" IN ('DRAFT','POSTED','VOID','REVERSED'))
);

CREATE TABLE "PaymentAllocation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "paymentId" UUID NOT NULL,
  "invoiceType" VARCHAR(50) NOT NULL,
  "invoiceId" UUID NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentAllocation_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "PaymentAllocation_invoice_type_check" CHECK ("invoiceType" IN ('CUSTOMER_INVOICE','SUPPLIER_INVOICE','EXPENSE'))
);

CREATE TABLE "Expense" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "employeeId" UUID NOT NULL,
  "projectId" UUID,
  "category" VARCHAR(120) NOT NULL,
  "incurredAt" TIMESTAMPTZ(6) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  "total" DECIMAL(18,2) NOT NULL,
  "approvalRequestId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Expense_approvalRequestId_key" UNIQUE ("approvalRequestId"),
  CONSTRAINT "Expense_total_check" CHECK ("total" >= 0),
  CONSTRAINT "Expense_status_check" CHECK ("status" IN ('DRAFT','SUBMITTED','APPROVAL_PENDING','APPROVED','REJECTED','FINANCE_VERIFIED','PAID','CANCELLED'))
);

CREATE TABLE "ExpenseItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "expenseId" UUID NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "documentId" UUID,
  CONSTRAINT "ExpenseItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExpenseItem_amount_check" CHECK ("amount" >= 0 AND "tax" >= 0)
);

CREATE TABLE "CreditNote" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "customerInvoiceId" UUID NOT NULL,
  "noteNo" VARCHAR(160) NOT NULL,
  "total" DECIMAL(18,2) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CreditNote_organizationId_noteNo_key" UNIQUE ("organizationId","noteNo"),
  CONSTRAINT "CreditNote_total_check" CHECK ("total" >= 0)
);

CREATE TABLE "DebitNote" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "supplierInvoiceId" UUID NOT NULL,
  "noteNo" VARCHAR(160) NOT NULL,
  "total" DECIMAL(18,2) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  CONSTRAINT "DebitNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DebitNote_organizationId_noteNo_key" UNIQUE ("organizationId","noteNo"),
  CONSTRAINT "DebitNote_total_check" CHECK ("total" >= 0)
);

-- Tenant-first indexes and business status queues.
CREATE INDEX "CustomerInvoice_organizationId_customerId_status_idx" ON "CustomerInvoice"("organizationId","customerId","status");
CREATE INDEX "CustomerInvoice_organizationId_projectId_status_idx" ON "CustomerInvoice"("organizationId","projectId","status");
CREATE INDEX "CustomerInvoice_organizationId_status_dueDate_idx" ON "CustomerInvoice"("organizationId","status","dueDate");
CREATE INDEX "SupplierInvoice_organizationId_vendorId_status_idx" ON "SupplierInvoice"("organizationId","vendorId","status");
CREATE INDEX "SupplierInvoice_organizationId_purchaseOrderId_goodsReceiptId_idx" ON "SupplierInvoice"("organizationId","purchaseOrderId","goodsReceiptId");
CREATE INDEX "Payment_organizationId_direction_status_paidAt_idx" ON "Payment"("organizationId","direction","status","paidAt");
CREATE INDEX "Payment_organizationId_partyType_partyId_idx" ON "Payment"("organizationId","partyType","partyId");
CREATE INDEX "PaymentAllocation_organizationId_invoiceType_invoiceId_idx" ON "PaymentAllocation"("organizationId","invoiceType","invoiceId");
CREATE INDEX "Expense_organizationId_employeeId_status_idx" ON "Expense"("organizationId","employeeId","status");
CREATE INDEX "JournalEntry_organizationId_referenceType_referenceId_idx" ON "JournalEntry"("organizationId","referenceType","referenceId");
CREATE INDEX "JournalLine_organizationId_accountId_idx" ON "JournalLine"("organizationId","accountId");

-- FKs. Generic party/invoice IDs remain polymorphic by specification.
ALTER TABLE "FinancialPeriod" ADD CONSTRAINT "FinancialPeriod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "FinancialPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerInvoiceItem" ADD CONSTRAINT "CustomerInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CustomerInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerInvoiceItem" ADD CONSTRAINT "CustomerInvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "GoodsReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierInvoiceItem" ADD CONSTRAINT "SupplierInvoiceItem_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES "SupplierInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierInvoiceItem" ADD CONSTRAINT "SupplierInvoiceItem_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES "PurchaseOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExpenseItem" ADD CONSTRAINT "ExpenseItem_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_customerInvoiceId_fkey" FOREIGN KEY ("customerInvoiceId") REFERENCES "CustomerInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES "SupplierInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Journal is append-only after posting; reversal entries must be created instead.
CREATE OR REPLACE FUNCTION forbid_posted_journal_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'POSTED' THEN
    RAISE EXCEPTION 'Posted journal entries are immutable; create a reversal.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "JournalEntry_no_update_after_posted"
BEFORE UPDATE ON "JournalEntry"
FOR EACH ROW EXECUTE FUNCTION forbid_posted_journal_mutation();
