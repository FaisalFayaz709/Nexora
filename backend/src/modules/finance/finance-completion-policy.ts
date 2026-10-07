import { AppError } from '../../core/http/errors.js';

export const FinanceCompletionControls = [
  'CUSTOMER_INVOICE_APPROVED_ONLY_POSTING',
  'SUPPLIER_INVOICE_REAL_THREE_WAY_MATCH',
  'PAYMENT_CANONICAL_BODY_HASH_IDEMPOTENCY',
  'DOUBLE_ENTRY_JOURNAL_BALANCE',
  'TAX_TRANSACTION_SNAPSHOT',
  'BANK_RECONCILIATION_CLOSE_ONCE',
  'BANK_OR_CASH_VOUCHER_ACCOUNT_EXCLUSIVE',
  'POSTED_LEDGER_REVERSAL_ONLY',
] as const;

export const FinanceCriticalTables = [
  'CustomerInvoice',
  'SupplierInvoice',
  'SupplierInvoiceItem',
  'Payment',
  'PaymentAllocation',
  'Account',
  'JournalEntry',
  'JournalLine',
  'TaxTransaction',
  'BankStatement',
  'BankStatementLine',
  'BankReconciliation',
  'PaymentVoucher',
  'ReceiptVoucher',
  'ChequeRegister',
] as const;

export const FinanceRuntimeCertificationScenarios = [
  'M10-CUSTOMER-INVOICE-POSTING-CREATES-BALANCED-JOURNAL',
  'M10-SUPPLIER-INVOICE-THREE-WAY-MATCH-USES-REAL-PO-GRN-INVOICE-LINES',
  'M10-SUPPLIER-INVOICE-VARIANCE-BLOCKS-APPROVAL',
  'M10-PAYMENT-IDEMPOTENCY-HASHES-CANONICAL-REQUEST-BODY',
  'M10-PAYMENT-PARTIAL-FULL-BALANCE-RECONCILIATION',
  'M10-TAX-CALCULATION-STORES-AUDITABLE-SNAPSHOT',
  'M10-BANK-STATEMENT-IMPORT-CREATES-RECONCILIATION',
  'M10-BANK-RECONCILIATION-CLOSE-IS-IMMUTABLE',
  'M10-PAYMENT-VOUCHER-POSTS-JOURNAL-AND-CHEQUE-REGISTER',
  'M10-FINANCE-REPORTS-CANNOT-BYPASS-TENANT-RBAC-SCOPE',
] as const;

export function assertFinanceCompletionMatrix(input: {
  readonly sourcePreflight: boolean;
  readonly realThreeWayMatch: boolean;
  readonly paymentBodyHashIdempotency: boolean;
  readonly taxSnapshotStored: boolean;
  readonly bankReconciliationCloseOnce: boolean;
  readonly noAsyncCriticalMoneyMutation: boolean;
}) {
  const missing = Object.entries(input)
    .filter(([, ok]) => ok !== true)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new AppError(
      409,
      'FINANCE_COMPLETION_MATRIX_INVALID',
      'Finance completion matrix is missing required blueprint controls.',
      { missing },
    );
  }
}

export function assertVoucherFundingAccountExclusive(input: { bankAccountId?: string | null; cashAccountId?: string | null }) {
  if (!input.bankAccountId && !input.cashAccountId) {
    throw new AppError(400, 'VOUCHER_FUNDING_ACCOUNT_REQUIRED', 'A voucher must use either bank or cash account.');
  }
  if (input.bankAccountId && input.cashAccountId) {
    throw new AppError(400, 'VOUCHER_FUNDING_ACCOUNT_EXCLUSIVE', 'A voucher cannot use both bank and cash account.');
  }
}

export function assertBankReconciliationIsClosable(status: string) {
  if (status === 'CLOSED') {
    throw new AppError(409, 'BANK_RECONCILIATION_ALREADY_CLOSED', 'Closed reconciliations cannot be silently edited.');
  }
  if (!['OPEN', 'IN_PROGRESS'].includes(status)) {
    throw new AppError(409, 'BANK_RECONCILIATION_INVALID_STATE', 'Only OPEN or IN_PROGRESS reconciliations can be closed.');
  }
}
