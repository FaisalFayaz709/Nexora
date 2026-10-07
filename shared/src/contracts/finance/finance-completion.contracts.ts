import { z } from 'zod';
import { DecimalStringSchema, UuidSchema } from '../common';

export const FinanceCompletionContractMaturity =
  'PASS_15_SOURCE_LEVEL_FINANCE_TAX_BANK_RECONCILIATION_COMPLETION' as const;

export const FinanceCompletionSubjects = [
  'CUSTOMER_INVOICE_POSTING',
  'SUPPLIER_INVOICE_THREE_WAY_MATCH',
  'PAYMENT_IDEMPOTENCY',
  'AR_AP_AGING',
  'JOURNAL_BALANCING',
  'TAX_SNAPSHOT',
  'BANK_CASH_ACCOUNTING',
  'BANK_RECONCILIATION',
  'PAYMENT_VOUCHER',
  'RECEIPT_VOUCHER',
  'REVERSAL_ONLY_CORRECTION',
] as const;

export const FinanceCompletionRows = [
  {
    subject: 'CUSTOMER_INVOICE_POSTING',
    requiredControls: ['approved-only-post', 'double-entry-journal', 'tenant-scope', 'audit'],
    runtimeEvidence: 'customer_invoice_post_api_and_journal_assertion_pending',
  },
  {
    subject: 'SUPPLIER_INVOICE_THREE_WAY_MATCH',
    requiredControls: ['po-line', 'grn-accepted-quantity', 'supplier-invoice-line', 'variance-reasons', 'audit'],
    runtimeEvidence: 'supplier_invoice_po_grn_invoice_match_runtime_pending',
  },
  {
    subject: 'PAYMENT_IDEMPOTENCY',
    requiredControls: ['idempotency-key', 'canonical-request-hash', 'same-key-different-body-blocked', 'single-financial-effect'],
    runtimeEvidence: 'payment_replay_runtime_pending',
  },
  {
    subject: 'AR_AP_AGING',
    requiredControls: ['tenant-scope', 'branch-aware-reporting', 'balance-filter', 'date-asof'],
    runtimeEvidence: 'aging_report_scope_runtime_pending',
  },
  {
    subject: 'JOURNAL_BALANCING',
    requiredControls: ['debit-credit-equality', 'open-period', 'posted-state', 'audit'],
    runtimeEvidence: 'journal_post_runtime_pending',
  },
  {
    subject: 'TAX_SNAPSHOT',
    requiredControls: ['effective-rate', 'calculation-json', 'stored-tax-transaction', 'audit'],
    runtimeEvidence: 'tax_snapshot_runtime_pending',
  },
  {
    subject: 'BANK_CASH_ACCOUNTING',
    requiredControls: ['account-exclusive', 'tenant-branch-scope', 'voucher-journal', 'audit'],
    runtimeEvidence: 'bank_cash_voucher_runtime_pending',
  },
  {
    subject: 'BANK_RECONCILIATION',
    requiredControls: ['import-statement', 'line-links', 'close-once', 'closed-not-silently-edited'],
    runtimeEvidence: 'bank_reconciliation_runtime_pending',
  },
  {
    subject: 'PAYMENT_VOUCHER',
    requiredControls: ['bank-or-cash-not-both', 'positive-amount', 'journal-posting', 'cheque-register'],
    runtimeEvidence: 'payment_voucher_runtime_pending',
  },
  {
    subject: 'RECEIPT_VOUCHER',
    requiredControls: ['bank-or-cash-not-both', 'positive-amount', 'journal-posting', 'payer-traceability'],
    runtimeEvidence: 'receipt_voucher_runtime_pending',
  },
  {
    subject: 'REVERSAL_ONLY_CORRECTION',
    requiredControls: ['posted-ledger-not-destructively-edited', 'reversal-record', 'audit'],
    runtimeEvidence: 'reversal_runtime_pending',
  },
] as const;

export const FinanceCompletionScenarioIds = [
  'M10-CUSTOMER-INVOICE-POSTING-CREATES-BALANCED-JOURNAL',
  'M10-SUPPLIER-INVOICE-THREE-WAY-MATCH-USES-REAL-PO-GRN-INVOICE-LINES',
  'M10-SUPPLIER-INVOICE-VARIANCE-BLOCKS-APPROVAL',
  'M10-PAYMENT-IDEMPOTENCY-HASHES-CANONICAL-REQUEST-BODY',
  'M10-PAYMENT-PARTIAL-FULL-BALANCE-RECONCILIATION',
  'M10-TAX-CALCULATION-STORES-AUDITABLE-SNAPSHOT',
  'M10-BANK-STATEMENT-IMPORT-CREATES-RECONCILIATION',
  'M10-BANK-RECONCILIATION-CLOSE-IS-IMMUTABLE',
  'M10-PAYMENT-VOUCHER-POSTS-JOURNAL-AND-CHEQUE-REGISTER',
  'PASS15-RECEIPT-VOUCHER-POSTS-JOURNAL-AND-PAYER-TRACE',
  'M10-FINANCE-REPORTS-CANNOT-BYPASS-TENANT-RBAC-SCOPE',
] as const;

export const SupplierInvoiceThreeWayMatchLineSchema = z.object({
  poItemId: UuidSchema,
  productId: UuidSchema,
  orderedQty: DecimalStringSchema,
  receivedAcceptedQty: DecimalStringSchema,
  damagedQty: DecimalStringSchema.default('0'),
  poUnitPrice: DecimalStringSchema,
  invoiceQty: DecimalStringSchema,
  invoiceUnitPrice: DecimalStringSchema,
});

export const FinanceCompletionEvidenceSchema = z.object({
  subject: z.enum(FinanceCompletionSubjects),
  runtimeCertified: z.boolean(),
  evidenceRef: z.string().min(1),
});
