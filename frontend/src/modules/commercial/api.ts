import { type ApiQueryParams } from '@/lib/api-client';
import { createCrudResourceApi, createModuleQueryKeys, postCommand } from '@/lib/module-api';

export type ListFilters = ApiQueryParams;
export type CreateInput = Record<string, unknown>;
export type UpdateInput = Record<string, unknown>;
export type CommandInput = Record<string, unknown>;

export const commercialEndpoints = {
  taxCodes: '/tax-codes',
  bankAccounts: '/bank-accounts',
  saasPlans: '/saas/plans',
  saasSubscriptions: '/saas/subscriptions',
  saasUsage: '/saas/usage',
  calculateTax: '/tax/calculate',
  importBankStatement: '/bank-statements/import',
  closeBankReconciliation: (id: string) => `/bank-reconciliations/${id}/close`,
  createPaymentVoucher: '/vouchers/payment',
  createReceiptVoucher: '/vouchers/receipt',
  postSaasInvoice: (id: string) => `/saas/invoices/${id}/post`,
} as const;

export const commercialKeys = createModuleQueryKeys('commercial', { taxCodes: 'taxCodes', bankAccounts: 'bankAccounts', saasPlans: 'saasPlans', saasSubscriptions: 'saasSubscriptions', saasUsage: 'saasUsage' });

export const taxCodesApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(commercialEndpoints.taxCodes);
export const bankAccountsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(commercialEndpoints.bankAccounts);
export const saasPlansApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(commercialEndpoints.saasPlans);
export const saasSubscriptionsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(commercialEndpoints.saasSubscriptions);
export const saasUsageApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(commercialEndpoints.saasUsage);

export function calculateTax(body?: CommandInput, idempotencyKey?: string) { return postCommand(commercialEndpoints.calculateTax, body, idempotencyKey); }
export function importBankStatement(body?: CommandInput, idempotencyKey?: string) { return postCommand(commercialEndpoints.importBankStatement, body, idempotencyKey); }
export function closeBankReconciliation(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(commercialEndpoints.closeBankReconciliation(id), body, idempotencyKey); }
export function createPaymentVoucher(body?: CommandInput, idempotencyKey?: string) { return postCommand(commercialEndpoints.createPaymentVoucher, body, idempotencyKey); }
export function createReceiptVoucher(body?: CommandInput, idempotencyKey?: string) { return postCommand(commercialEndpoints.createReceiptVoucher, body, idempotencyKey); }
export function postSaasInvoice(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(commercialEndpoints.postSaasInvoice(id), body, idempotencyKey); }

export const CommercialApiRegistry = { endpoints: commercialEndpoints, keys: commercialKeys } as const;
