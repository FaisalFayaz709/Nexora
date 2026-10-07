import { apiGet, type ApiQueryParams } from '@/lib/api-client';
import { createCrudResourceApi, createModuleQueryKeys, postCommand } from '@/lib/module-api';

export type ListFilters = ApiQueryParams;
export type CreateInput = Record<string, unknown>;
export type UpdateInput = Record<string, unknown>;
export type CommandInput = Record<string, unknown>;

export const procurementEndpoints = {
  purchaseRequests: '/purchase-requests',
  rfqs: '/rfqs',
  supplierQuotations: '/supplier-quotations',
  purchaseOrders: '/purchase-orders',
  goodsReceipts: '/goods-receipts',
  purchaseContracts: '/purchase-contracts',
  landedCosts: '/landed-costs',
  vendorOnboarding: '/vendor-onboarding/requests',
  vendorBlacklist: (id: string) => `/vendors/${id}/blacklist`,
  submitVendorOnboarding: (id: string) => `/vendor-onboarding/${id}/submit`,
  approveVendorOnboarding: (id: string) => `/vendor-onboarding/${id}/approve`,
  submitPurchaseRequest: (id: string) => `/purchase-requests/${id}/submit`,
  approvePurchaseRequest: (id: string) => `/purchase-requests/${id}/approve`,
  rejectPurchaseRequest: (id: string) => `/purchase-requests/${id}/reject`,
  createRfqFromPurchaseRequest: (id: string) => `/purchase-requests/${id}/create-rfq`,
  inviteVendors: (id: string) => `/rfqs/${id}/invite-vendors`,
  publishRfq: (id: string) => `/rfqs/${id}/publish`,
  closeRfq: (id: string) => `/rfqs/${id}/close`,
  selectSupplierQuotation: (id: string) => `/supplier-quotations/${id}/select`,
  submitPurchaseOrder: (id: string) => `/purchase-orders/${id}/submit`,
  approvePurchaseOrder: (id: string) => `/purchase-orders/${id}/approve`,
  sendPurchaseOrder: (id: string) => `/purchase-orders/${id}/send`,
  cancelPurchaseOrder: (id: string) => `/purchase-orders/${id}/cancel`,
  inspectGoodsReceipt: (id: string) => `/goods-receipts/${id}/inspect`,
  approvePurchaseContract: (id: string) => `/purchase-contracts/${id}/approve`,
  createReleaseOrder: (id: string) => `/purchase-contracts/${id}/create-release-order`,
  allocateLandedCost: (id: string) => `/landed-costs/${id}/allocate`,
  postLandedCost: (id: string) => `/landed-costs/${id}/post`,
} as const;

export const procurementKeys = createModuleQueryKeys('procurement', { purchaseRequests: 'purchaseRequests', rfqs: 'rfqs', supplierQuotations: 'supplierQuotations', purchaseOrders: 'purchaseOrders', goodsReceipts: 'goodsReceipts', purchaseContracts: 'purchaseContracts', landedCosts: 'landedCosts', vendorOnboarding: 'vendorOnboarding' });

export const purchaseRequestsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(procurementEndpoints.purchaseRequests);
export const rfqsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(procurementEndpoints.rfqs);
export const supplierQuotationsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(procurementEndpoints.supplierQuotations);
export const purchaseOrdersApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(procurementEndpoints.purchaseOrders);
export const goodsReceiptsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(procurementEndpoints.goodsReceipts);
export const purchaseContractsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(procurementEndpoints.purchaseContracts);
export const landedCostsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(procurementEndpoints.landedCosts);
export const vendorOnboardingApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(procurementEndpoints.vendorOnboarding);

export function submitPurchaseRequest(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(procurementEndpoints.submitPurchaseRequest(id), body, idempotencyKey); }
export function approvePurchaseRequest(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(procurementEndpoints.approvePurchaseRequest(id), body, idempotencyKey); }
export function rejectPurchaseRequest(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(procurementEndpoints.rejectPurchaseRequest(id), body, idempotencyKey); }
export function createRfqFromPurchaseRequest(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(procurementEndpoints.createRfqFromPurchaseRequest(id), body, idempotencyKey); }
export function inviteVendors(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(procurementEndpoints.inviteVendors(id), body, idempotencyKey); }
export function publishRfq(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(procurementEndpoints.publishRfq(id), body, idempotencyKey); }
export function closeRfq(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(procurementEndpoints.closeRfq(id), body, idempotencyKey); }
export function selectSupplierQuotation(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(procurementEndpoints.selectSupplierQuotation(id), body, idempotencyKey); }
export function submitPurchaseOrder(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(procurementEndpoints.submitPurchaseOrder(id), body, idempotencyKey); }
export function approvePurchaseOrder(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(procurementEndpoints.approvePurchaseOrder(id), body, idempotencyKey); }
export function sendPurchaseOrder(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(procurementEndpoints.sendPurchaseOrder(id), body, idempotencyKey); }
export function cancelPurchaseOrder(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(procurementEndpoints.cancelPurchaseOrder(id), body, idempotencyKey); }
export function inspectGoodsReceipt(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(procurementEndpoints.inspectGoodsReceipt(id), body, idempotencyKey); }
export function approvePurchaseContract(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(procurementEndpoints.approvePurchaseContract(id), body, idempotencyKey); }
export function createReleaseOrder(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(procurementEndpoints.createReleaseOrder(id), body, idempotencyKey); }
export function allocateLandedCost(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(procurementEndpoints.allocateLandedCost(id), body, idempotencyKey); }
export function postLandedCost(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(procurementEndpoints.postLandedCost(id), body, idempotencyKey); }

export function getRfqComparison(id: string) { return apiGet(`/rfqs/${id}/comparison`); }

export const ProcurementApiRegistry = { endpoints: procurementEndpoints, keys: procurementKeys } as const;
