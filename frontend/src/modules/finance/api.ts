import { apiGet, apiPatch, apiPost, apiRequest, createIdempotencyKey, type ApiListEnvelope, type ApiQueryParams, type ApiSingleEnvelope } from '@/lib/api-client';
import { createCrudResourceApi, createModuleQueryKeys, postCommand } from '@/lib/module-api';

export type ListFilters = ApiQueryParams;
export type CreateInput = Record<string, unknown>;
export type UpdateInput = Record<string, unknown>;
export type CommandInput = Record<string, unknown>;

export const financeEndpoints = {
  customerInvoices: '/customer-invoices',
  supplierInvoices: '/supplier-invoices',
  payments: '/payments',
  expenses: '/expenses',
  accounts: '/accounts',
  journalEntries: '/journal-entries',
  taxCodes: '/tax-codes',
  taxRules: '/tax-rules',
  taxCalculate: '/tax/calculate',
  taxReports: '/tax/reports',
  bankAccounts: '/bank-accounts',
  bankStatementsImport: '/bank-statements/import',
  bankReconciliationsClose: (id: string) => `/bank-reconciliations/${id}/close`,
  paymentVoucher: '/vouchers/payment',
  receiptVoucher: '/vouchers/receipt',
  receivables: '/finance/receivables',
  payables: '/finance/payables',
  submitCustomerInvoice: (id: string) => `/customer-invoices/${id}/submit`,
  approveCustomerInvoice: (id: string) => `/customer-invoices/${id}/approve`,
  postCustomerInvoice: (id: string) => `/customer-invoices/${id}/post`,
  sendCustomerInvoice: (id: string) => `/customer-invoices/${id}/send`,
  cancelCustomerInvoice: (id: string) => `/customer-invoices/${id}/cancel`,
  matchSupplierInvoice: (id: string) => `/supplier-invoices/${id}/match`,
  approveSupplierInvoice: (id: string) => `/supplier-invoices/${id}/approve`,
  postJournalEntry: (id: string) => `/journal-entries/${id}/post`,
} as const;

export const financeKeys = createModuleQueryKeys('finance', {
  customerInvoices: 'customerInvoices',
  supplierInvoices: 'supplierInvoices',
  payments: 'payments',
  expenses: 'expenses',
  accounts: 'accounts',
  journalEntries: 'journalEntries',
  taxCodes: 'taxCodes',
  taxReports: 'taxReports',
  bankAccounts: 'bankAccounts',
  receivables: 'receivables',
  payables: 'payables',
});

export const customerInvoicesApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(financeEndpoints.customerInvoices);
export const supplierInvoicesApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(financeEndpoints.supplierInvoices);
export const paymentsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(financeEndpoints.payments);
export const expensesApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(financeEndpoints.expenses);
export const accountsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(financeEndpoints.accounts);
export const journalEntriesApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(financeEndpoints.journalEntries);
export const taxCodesApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(financeEndpoints.taxCodes);
export const bankAccountsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(financeEndpoints.bankAccounts);

export function submitCustomerInvoice(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(financeEndpoints.submitCustomerInvoice(id), body, idempotencyKey); }
export function approveCustomerInvoice(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(financeEndpoints.approveCustomerInvoice(id), body, idempotencyKey); }
export function postCustomerInvoice(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(financeEndpoints.postCustomerInvoice(id), body, idempotencyKey); }
export function sendCustomerInvoice(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(financeEndpoints.sendCustomerInvoice(id), body, idempotencyKey); }
export function cancelCustomerInvoice(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(financeEndpoints.cancelCustomerInvoice(id), body, idempotencyKey); }
export function matchSupplierInvoice(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(financeEndpoints.matchSupplierInvoice(id), body, idempotencyKey); }
export function approveSupplierInvoice(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(financeEndpoints.approveSupplierInvoice(id), body, idempotencyKey); }
export function postJournalEntry(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(financeEndpoints.postJournalEntry(id), body, idempotencyKey); }
export function calculateTax(body?: CommandInput, idempotencyKey?: string) { return postCommand(financeEndpoints.taxCalculate, body, idempotencyKey); }
export function importBankStatement(body?: CommandInput, idempotencyKey?: string) { return postCommand(financeEndpoints.bankStatementsImport, body, idempotencyKey); }
export function closeBankReconciliation(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(financeEndpoints.bankReconciliationsClose(id), body, idempotencyKey); }
export function createPaymentVoucher(body?: CommandInput, idempotencyKey?: string) { return postCommand(financeEndpoints.paymentVoucher, body, idempotencyKey); }
export function createReceiptVoucher(body?: CommandInput, idempotencyKey?: string) { return postCommand(financeEndpoints.receiptVoucher, body, idempotencyKey); }
export function getReceivables(filters?: ApiQueryParams) { return apiGet(financeEndpoints.receivables, filters); }
export function getPayables(filters?: ApiQueryParams) { return apiGet(financeEndpoints.payables, filters); }
export function getTaxReports(filters?: ApiQueryParams) { return apiGet(financeEndpoints.taxReports, filters); }


// Template marker required by the blueprint screen contract: /bank-reconciliations/:id/close.
export const financeCommandEndpointTemplates = ['/bank-reconciliations/:id/close', '/vouchers/receipt'] as const;

export function financeList<T = unknown>(endpoint: string, filters?: ApiQueryParams) {
  return apiRequest<ApiListEnvelope<T>>(endpoint, { method: 'GET', query: filters });
}

export function financeDetail<T = unknown>(endpoint: string, id: string) {
  return apiRequest<ApiSingleEnvelope<T>>(`${endpoint}/${id}`, { method: 'GET' });
}

export function financeCreate<T = unknown>(endpoint: string, input: CreateInput, idempotencyKey = createIdempotencyKey('finance_create')) {
  return apiPost<ApiSingleEnvelope<T>>(endpoint, input, { idempotencyKey });
}

export function financeUpdate<T = unknown>(endpoint: string, id: string, input: UpdateInput) {
  return apiPatch<ApiSingleEnvelope<T>>(`${endpoint}/${id}`, input);
}

export function financeCommand<T = unknown>(endpoint: string, input?: CommandInput, idempotencyKey = createIdempotencyKey('finance_command')) {
  return apiPost<ApiSingleEnvelope<T>>(endpoint, input, { idempotencyKey });
}

export const FinanceApiRegistry = { endpoints: financeEndpoints, keys: financeKeys } as const;
