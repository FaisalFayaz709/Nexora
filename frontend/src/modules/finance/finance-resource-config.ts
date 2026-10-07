import type { PermissionKey } from '@nexora/shared';
import type { EntityColumnConfig } from '@/modules/masters/columns';
import {
  accountColumns,
  agingColumns,
  bankAccountColumns,
  customerInvoiceColumns,
  expenseColumns,
  journalEntryColumns,
  paymentColumns,
  supplierInvoiceColumns,
  taxCodeColumns,
  taxReportColumns,
} from './columns';

export type FinanceResourceKey =
  | 'customer-invoices'
  | 'supplier-invoices'
  | 'payments'
  | 'expenses'
  | 'accounts'
  | 'journal-entries'
  | 'tax-codes'
  | 'tax-reports'
  | 'bank-accounts'
  | 'receivables'
  | 'payables';

export type FinanceCommandKey =
  | 'submit-customer-invoice'
  | 'approve-customer-invoice'
  | 'post-customer-invoice'
  | 'send-customer-invoice'
  | 'cancel-customer-invoice'
  | 'match-supplier-invoice'
  | 'approve-supplier-invoice'
  | 'create-payment'
  | 'post-journal-entry'
  | 'calculate-tax'
  | 'import-bank-statement'
  | 'close-bank-reconciliation'
  | 'create-payment-voucher'
  | 'create-receipt-voucher';

export type FinanceScopedSurfaceKey =
  | 'payment-allocations'
  | 'three-way-match'
  | 'ar-aging'
  | 'ap-aging'
  | 'tax-calculation'
  | 'tax-report'
  | 'bank-cash'
  | 'bank-statement-import'
  | 'bank-reconciliation-close'
  | 'payment-voucher'
  | 'receipt-voucher';

export type FinanceCommandConfig = {
  key: FinanceCommandKey;
  label: string;
  endpointTemplate: string;
  requiredPermission: PermissionKey;
  idempotent: boolean;
  allowedStates: readonly string[];
  destructive?: boolean;
  irreversibleEffects: readonly string[];
};

export type FinanceResourceConfig = {
  key: FinanceResourceKey;
  title: string;
  singularTitle: string;
  routeBase: string;
  endpoint: string;
  viewPermission: PermissionKey;
  createPermission?: PermissionKey;
  updatePermission?: PermissionKey;
  listSupported: boolean;
  detailSupported: boolean;
  editSupported: boolean;
  createSupported: boolean;
  description: string;
  columns: readonly EntityColumnConfig[];
  identityFields: readonly string[];
  profileFields: readonly string[];
  relatedPanels: readonly { title: string; description: string; href?: string }[];
  commands: readonly FinanceCommandConfig[];
};

export type FinanceScopedSurfaceConfig = {
  key: FinanceScopedSurfaceKey;
  title: string;
  description: string;
  endpointTemplate: string;
  requiredPermission: PermissionKey;
  command?: FinanceCommandKey;
  auditFocus: readonly string[];
};

export const FinanceCompletionPrinciples = [
  'Finance screens do not silently edit posted invoices, payments, journals or reconciliation records.',
  'Customer invoice submit, approve, post, send and cancel are explicit Fastify command endpoints.',
  'Supplier invoice approval is separated from three-way match of Purchase Order + Goods Received Note + Supplier Invoice.',
  'Payments use idempotency keys and allocation rows; frontend never calculates authoritative invoice balances.',
  'Journal posting is restricted and posted entries are corrected by reversal, not destructive editing.',
  'Tax calculation is deterministic, previewable and captured by backend transaction-time tax records.',
  'Bank statement import, payment/receipt vouchers and reconciliation close stay under bank.manage and audit/transaction controls.',
  'Queues can generate PDFs, emails, reports and notifications after commit, but money, balances and journal state are PostgreSQL transaction-bound.',
] as const;

const CustomerInvoiceCommands: readonly FinanceCommandConfig[] = [
  { key: 'submit-customer-invoice', label: 'Submit invoice', endpointTemplate: '/customer-invoices/:id/submit', requiredPermission: 'invoice.submit', idempotent: true, allowedStates: ['DRAFT'], irreversibleEffects: ['Creates or advances invoice approval workflow.', 'Records audit evidence for submit action.'] },
  { key: 'approve-customer-invoice', label: 'Approve invoice', endpointTemplate: '/customer-invoices/:id/approve', requiredPermission: 'invoice.approve', idempotent: true, allowedStates: ['APPROVAL_PENDING'], irreversibleEffects: ['Applies maker-checker approval rules.', 'Prepares invoice for posting without queue-based money movement.'] },
  { key: 'post-customer-invoice', label: 'Post invoice', endpointTemplate: '/customer-invoices/:id/post', requiredPermission: 'invoice.post', idempotent: true, allowedStates: ['APPROVED'], irreversibleEffects: ['Creates invoice posting and journal effect transactionally.', 'After posting, correction must use reversal/cancel rules rather than destructive edit.'] },
  { key: 'send-customer-invoice', label: 'Send invoice', endpointTemplate: '/customer-invoices/:id/send', requiredPermission: 'invoice.send', idempotent: true, allowedStates: ['POSTED', 'APPROVED'], irreversibleEffects: ['Queues PDF/email after the invoice source of truth is committed.', 'Records communication/audit evidence.'] },
  { key: 'cancel-customer-invoice', label: 'Cancel or reverse invoice', endpointTemplate: '/customer-invoices/:id/cancel', requiredPermission: 'invoice.cancel', idempotent: true, allowedStates: ['DRAFT', 'APPROVED', 'POSTED', 'SENT'], destructive: true, irreversibleEffects: ['Cancels/reverses through backend policy.', 'Posted invoice effects are reversed; they are not silently deleted.'] },
];

const SupplierInvoiceCommands: readonly FinanceCommandConfig[] = [
  { key: 'match-supplier-invoice', label: 'Run three-way match', endpointTemplate: '/supplier-invoices/:id/match', requiredPermission: 'supplier_invoice.match', idempotent: true, allowedStates: ['DRAFT', 'APPROVAL_PENDING', 'APPROVED'], irreversibleEffects: ['Compares PO, accepted GRN quantities and supplier invoice lines.', 'Writes match status and audit evidence before AP approval.'] },
  { key: 'approve-supplier-invoice', label: 'Approve supplier invoice', endpointTemplate: '/supplier-invoices/:id/approve', requiredPermission: 'supplier_invoice.approve', idempotent: true, allowedStates: ['APPROVAL_PENDING', 'MATCHED'], irreversibleEffects: ['Approves AP invoice only through backend match/maker-checker rules.', 'Prepares invoice for payment allocation without local UI balance authority.'] },
];

const JournalCommands: readonly FinanceCommandConfig[] = [
  { key: 'post-journal-entry', label: 'Post journal entry', endpointTemplate: '/journal-entries/:id/post', requiredPermission: 'journal.post', idempotent: true, allowedStates: ['DRAFT'], irreversibleEffects: ['Posts balanced debit/credit lines transactionally.', 'Posted journals are immutable and require reversal for correction.'] },
];

export const FinanceResourceConfigs = {
  'customer-invoices': {
    key: 'customer-invoices', title: 'Customer Invoices', singularTitle: 'Customer Invoice', routeBase: '/customer-invoices', endpoint: '/customer-invoices',
    viewPermission: 'invoice.view', createPermission: 'invoice.create', updatePermission: 'invoice.update', listSupported: true, detailSupported: true, editSupported: true, createSupported: true,
    description: 'Accounts receivable invoice surface from project, contract, maintenance or work-order context. Posting, sending and cancellation use command endpoints and audit records.',
    columns: customerInvoiceColumns,
    identityFields: ['invoiceNo', 'customerId', 'projectId', 'contractId', 'status', 'issueDate', 'dueDate'],
    profileFields: ['subtotal', 'tax', 'total', 'balance', 'workOrderId', 'maintenanceExecutionId', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Approval and posting', description: 'Submit, approve and post are explicit commands with maker-checker, tax and journal controls.' },
      { title: 'Payment allocation', description: 'Payments allocate to invoices transactionally with idempotency keys.', href: '/payments/create' },
      { title: 'AR aging', description: 'Receivable aging uses permission-scoped finance read models.', href: '/finance/receivables' },
    ],
    commands: CustomerInvoiceCommands,
  },
  'supplier-invoices': {
    key: 'supplier-invoices', title: 'Supplier Invoices', singularTitle: 'Supplier Invoice', routeBase: '/supplier-invoices', endpoint: '/supplier-invoices',
    viewPermission: 'supplier_invoice.view', createPermission: 'supplier_invoice.create', updatePermission: 'supplier_invoice.update', listSupported: true, detailSupported: true, editSupported: true, createSupported: true,
    description: 'Accounts payable invoice surface linked to vendor, purchase order and GRN. Three-way match is required before safe approval/payment.',
    columns: supplierInvoiceColumns,
    identityFields: ['invoiceNo', 'externalInvoiceNo', 'vendorId', 'purchaseOrderId', 'goodsReceiptId', 'matchStatus', 'status'],
    profileFields: ['subtotal', 'tax', 'total', 'balance', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Three-way match', description: 'PO + GRN + supplier invoice must be reconciled by backend command.', href: '/supplier-invoices/[id]/match' },
      { title: 'AP approval', description: 'Approval is separate from matching and remains maker-checker/audit controlled.' },
      { title: 'Supplier payment', description: 'Outbound payments allocate to supplier invoices transactionally.', href: '/payments/create' },
    ],
    commands: SupplierInvoiceCommands,
  },
  payments: {
    key: 'payments', title: 'Payments', singularTitle: 'Payment', routeBase: '/payments', endpoint: '/payments',
    viewPermission: 'payment.view', createPermission: 'payment.create', listSupported: true, detailSupported: false, editSupported: false, createSupported: true,
    description: 'Inbound/outbound cash settlement surface. Payment creation requires idempotency and backend allocations; posted financial effects are not frontend edited.',
    columns: paymentColumns,
    identityFields: ['paymentNo', 'direction', 'partyType', 'partyId', 'amount', 'method', 'status'],
    profileFields: ['paidAt', 'allocations', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Allocations', description: 'One payment can settle multiple invoices through PaymentAllocation records.', href: '/payments/[id]/allocations' },
      { title: 'Idempotency', description: 'Retry-sensitive payment creation requires Idempotency-Key and one financial effect.' },
      { title: 'Vouchers', description: 'Bank/cash voucher surface supports controlled payment evidence.', href: '/vouchers/payment' },
    ],
    commands: [],
  },
  expenses: {
    key: 'expenses', title: 'Expenses', singularTitle: 'Expense', routeBase: '/expenses', endpoint: '/expenses',
    viewPermission: 'expense.view', createPermission: 'expense.create', updatePermission: 'expense.update', listSupported: true, detailSupported: true, editSupported: true, createSupported: true,
    description: 'Employee/project expense capture for project costing and operating spend. Manager/finance approval must not bypass backend state-machine policy.',
    columns: expenseColumns,
    identityFields: ['employeeId', 'projectId', 'category', 'incurredAt', 'status', 'total'],
    profileFields: ['approvalRequestId', 'items', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'Project costing', description: 'Approved expenses feed project profitability read models.', href: '/projects/[id]/costing' },
      { title: 'Approval and finance verification', description: 'Workflow evidence belongs to backend approval state and audit logs.' },
      { title: 'Payment handoff', description: 'Reimbursable expenses can be settled through payments or vouchers.' },
    ],
    commands: [],
  },
  accounts: {
    key: 'accounts', title: 'Chart of Accounts', singularTitle: 'Account', routeBase: '/accounts', endpoint: '/accounts',
    viewPermission: 'account.view', listSupported: true, detailSupported: false, editSupported: false, createSupported: false,
    description: 'Read-only chart of accounts reference for journal posting, bank/cash accounts, payments and tax controls.',
    columns: accountColumns,
    identityFields: ['code', 'name', 'type', 'active'], profileFields: ['parentId', 'createdAt', 'updatedAt'],
    relatedPanels: [{ title: 'Journal lines', description: 'Journal debit/credit rows reference account ids.', href: '/journal-entries/create' }], commands: [],
  },
  'journal-entries': {
    key: 'journal-entries', title: 'Journal Entries', singularTitle: 'Journal Entry', routeBase: '/journal-entries', endpoint: '/journal-entries',
    viewPermission: 'finance.view', createPermission: 'journal.create', listSupported: false, detailSupported: false, editSupported: false, createSupported: true,
    description: 'Manual journal creation and restricted posting surface. Posted journals are immutable and corrected by reversal.',
    columns: journalEntryColumns,
    identityFields: ['entryNo', 'periodId', 'status', 'postedAt'], profileFields: ['referenceType', 'referenceId', 'lines', 'createdAt'],
    relatedPanels: [{ title: 'Balanced posting', description: 'Debit/credit balance and posting are backend enforced.' }], commands: JournalCommands,
  },
  'tax-codes': {
    key: 'tax-codes', title: 'Tax Codes and Rules', singularTitle: 'Tax Rule', routeBase: '/tax-codes', endpoint: '/tax-codes',
    viewPermission: 'tax.manage', createPermission: 'tax.manage', listSupported: true, detailSupported: false, editSupported: false, createSupported: true,
    description: 'Tax setup and rule governance. Transaction-time tax calculation is deterministic and audit stored.',
    columns: taxCodeColumns,
    identityFields: ['code', 'name', 'taxType', 'ratePct', 'status'], profileFields: ['effectiveFrom', 'effectiveTo', 'priority', 'jurisdictionId'],
    relatedPanels: [{ title: 'Tax calculation', description: 'Preview deterministic tax before invoice posting.', href: '/tax/calculate' }, { title: 'Tax reports', description: 'Report on stored tax transactions.', href: '/tax/reports' }], commands: [],
  },
  'tax-reports': {
    key: 'tax-reports', title: 'Tax Reports', singularTitle: 'Tax Report', routeBase: '/tax/reports', endpoint: '/tax/reports',
    viewPermission: 'tax.manage', listSupported: true, detailSupported: false, editSupported: false, createSupported: false,
    description: 'Permission-scoped tax transaction reports using stored calculation snapshots rather than recalculating history.',
    columns: taxReportColumns,
    identityFields: ['period', 'taxType', 'taxAmount'], profileFields: ['sourceType', 'sourceId', 'jurisdictionId'], relatedPanels: [], commands: [],
  },
  'bank-accounts': {
    key: 'bank-accounts', title: 'Bank Accounts', singularTitle: 'Bank Account', routeBase: '/bank-accounts', endpoint: '/bank-accounts',
    viewPermission: 'bank.manage', listSupported: true, detailSupported: false, editSupported: false, createSupported: false,
    description: 'Bank account list for vouchers, statements and reconciliation. Creation/editing requires backend support; this frontend does not invent domain APIs.',
    columns: bankAccountColumns,
    identityFields: ['bankName', 'accountTitle', 'accountNoMasked', 'currency', 'active'], profileFields: ['accountId', 'branchId', 'createdAt'],
    relatedPanels: [{ title: 'Statement import', description: 'Import statement lines for matching.', href: '/bank-statements/import' }, { title: 'Reconciliation close', description: 'Close reconciliation through command endpoint.', href: '/bank-reconciliations/[id]/close' }], commands: [],
  },
  receivables: {
    key: 'receivables', title: 'Accounts Receivable Aging', singularTitle: 'Receivable Aging Row', routeBase: '/finance/receivables', endpoint: '/finance/receivables',
    viewPermission: 'finance.view', listSupported: true, detailSupported: false, editSupported: false, createSupported: false,
    description: 'AR aging read model. This is reporting/finance visibility, not a mutation surface.', columns: agingColumns,
    identityFields: ['partyName', 'total'], profileFields: ['current', 'days30', 'days60', 'days90'], relatedPanels: [], commands: [],
  },
  payables: {
    key: 'payables', title: 'Accounts Payable Aging', singularTitle: 'Payable Aging Row', routeBase: '/finance/payables', endpoint: '/finance/payables',
    viewPermission: 'finance.view', listSupported: true, detailSupported: false, editSupported: false, createSupported: false,
    description: 'AP aging read model. Supplier balances remain backend calculated and permission scoped.', columns: agingColumns,
    identityFields: ['partyName', 'total'], profileFields: ['current', 'days30', 'days60', 'days90'], relatedPanels: [], commands: [],
  },
} satisfies Record<FinanceResourceKey, FinanceResourceConfig>;

export const FinanceScopedSurfaceConfigs = {
  'payment-allocations': { key: 'payment-allocations', title: 'Payment allocations', description: 'Review or prepare payment allocation evidence against customer invoices, supplier invoices or expenses.', endpointTemplate: '/payments/:id', requiredPermission: 'payment.view', auditFocus: ['Allocation rows reconcile invoice balances.', 'Payment creation is idempotent and transactional.'] },
  'three-way-match': { key: 'three-way-match', title: 'Supplier invoice three-way match', description: 'Run PO + GRN + Supplier Invoice reconciliation before AP approval.', endpointTemplate: '/supplier-invoices/:id/match', requiredPermission: 'supplier_invoice.match', command: 'match-supplier-invoice', auditFocus: ['PO quantities and values are compared to accepted GRN and invoice lines.', 'Variance/block decisions are preserved for audit.'] },
  'ar-aging': { key: 'ar-aging', title: 'Accounts receivable aging', description: 'Customer receivable aging with permission and tenant scope.', endpointTemplate: '/finance/receivables', requiredPermission: 'finance.view', auditFocus: ['Read-only finance report.', 'No browser-side recalculation of balances.'] },
  'ap-aging': { key: 'ap-aging', title: 'Accounts payable aging', description: 'Supplier payable aging with permission and tenant scope.', endpointTemplate: '/finance/payables', requiredPermission: 'finance.view', auditFocus: ['Read-only finance report.', 'No browser-side recalculation of balances.'] },
  'tax-calculation': { key: 'tax-calculation', title: 'Tax calculation preview', description: 'Run deterministic tax preview before invoice or purchase posting.', endpointTemplate: '/tax/calculate', requiredPermission: 'tax.manage', command: 'calculate-tax', auditFocus: ['Tax is repeatable and stored at posting time.', 'Rule changes do not rewrite historical transactions.'] },
  'tax-report': { key: 'tax-report', title: 'Tax report', description: 'Review tax transactions and report filters.', endpointTemplate: '/tax/reports', requiredPermission: 'tax.manage', auditFocus: ['Reports use stored tax transactions.', 'Sensitive financial fields remain permission scoped.'] },
  'bank-cash': { key: 'bank-cash', title: 'Bank and cash management', description: 'Bank accounts, statement imports, payment/receipt vouchers, cheque control and reconciliation command entry points.', endpointTemplate: '/bank-accounts', requiredPermission: 'bank.manage', auditFocus: ['Voucher funding account must be bank or cash, not both.', 'Reconciliation close is audit controlled.'] },
  'bank-statement-import': { key: 'bank-statement-import', title: 'Bank statement import', description: 'Import bank statement lines with row-level validation and period checks.', endpointTemplate: '/bank-statements/import', requiredPermission: 'bank.manage', command: 'import-bank-statement', auditFocus: ['Statement lines support later matching.', 'Import batch and validation errors must be explainable.'] },
  'bank-reconciliation-close': { key: 'bank-reconciliation-close', title: 'Close bank reconciliation', description: 'Close matched statement lines and link payments, journals and vouchers.', endpointTemplate: '/bank-reconciliations/:id/close', requiredPermission: 'bank.manage', command: 'close-bank-reconciliation', auditFocus: ['Closed reconciliation cannot be silently edited.', 'Corrections require reversal or controlled reopening policy.'] },
  'payment-voucher': { key: 'payment-voucher', title: 'Payment voucher', description: 'Create bank/cash payment voucher with cheque metadata and funding-account exclusivity.', endpointTemplate: '/vouchers/payment', requiredPermission: 'bank.manage', command: 'create-payment-voucher', auditFocus: ['Exactly one bank or cash funding account is required.', 'Voucher can link to bank/cash and journal records.'] },
  'receipt-voucher': { key: 'receipt-voucher', title: 'Receipt voucher', description: 'Create bank/cash receipt voucher with payer evidence and collection-account exclusivity.', endpointTemplate: '/vouchers/receipt', requiredPermission: 'bank.manage', command: 'create-receipt-voucher', auditFocus: ['Exactly one bank or cash collection account is required.', 'Receipt voucher links payer, bank/cash account and journal records.'] },
} satisfies Record<FinanceScopedSurfaceKey, FinanceScopedSurfaceConfig>;

export function getFinanceResourceConfig(key: FinanceResourceKey): FinanceResourceConfig {
  return FinanceResourceConfigs[key];
}

export function getFinanceScopedSurfaceConfig(key: FinanceScopedSurfaceKey): FinanceScopedSurfaceConfig {
  return FinanceScopedSurfaceConfigs[key];
}

export function getFinanceCommandConfig(key: FinanceCommandKey): FinanceCommandConfig {
  const allCommands = Object.values(FinanceResourceConfigs).flatMap((resource) => [...resource.commands]);
  const scopedCommand = allCommands.find((command) => command.key === key);
  if (scopedCommand) return scopedCommand;
  const surface = Object.values(FinanceScopedSurfaceConfigs).find((item) => item.command === key);
  if (surface?.command) {
    return {
      key: surface.command,
      label: surface.title,
      endpointTemplate: surface.endpointTemplate,
      requiredPermission: surface.requiredPermission,
      idempotent: true,
      allowedStates: ['COMMAND_READY'],
      irreversibleEffects: surface.auditFocus,
    };
  }
  throw new Error(`Unknown finance command: ${key}`);
}
