import { apiDelete, apiGet, type ApiQueryParams } from '@/lib/api-client';
import { createCrudResourceApi, createModuleQueryKeys, postCommand } from '@/lib/module-api';

export type ListFilters = ApiQueryParams;
export type CreateInput = Record<string, unknown>;
export type UpdateInput = Record<string, unknown>;
export type CommandInput = Record<string, unknown>;

export const inventoryEndpoints = {
  products: '/products',
  warehouses: '/warehouses',
  stock: '/inventory/stock',
  ledger: '/inventory/ledger',
  reservations: '/inventory/reservations',
  transfers: '/inventory/transfers',
  adjustments: '/inventory/adjustments',
  stockCounts: '/stock-counts',
  releaseReservation: (id: string) => `/inventory/reservations/${id}`,
  dispatchTransfer: (id: string) => `/inventory/transfers/${id}/dispatch`,
  receiveTransfer: (id: string) => `/inventory/transfers/${id}/receive`,
  postAdjustment: (id: string) => `/inventory/adjustments/${id}/post`,
  startStockCount: (id: string) => `/stock-counts/${id}/start`,
  submitStockCount: (id: string) => `/stock-counts/${id}/submit`,
  postStockCount: (id: string) => `/stock-counts/${id}/post`,
} as const;

export const inventoryKeys = createModuleQueryKeys('inventory', { products: 'products', warehouses: 'warehouses', stock: 'stock', ledger: 'ledger', reservations: 'reservations', transfers: 'transfers', adjustments: 'adjustments', stockCounts: 'stockCounts' });

export const productsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(inventoryEndpoints.products);
export const warehousesApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(inventoryEndpoints.warehouses);
export const stockApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(inventoryEndpoints.stock);
export const ledgerApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(inventoryEndpoints.ledger);
export const reservationsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(inventoryEndpoints.reservations);
export const transfersApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(inventoryEndpoints.transfers);
export const adjustmentsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(inventoryEndpoints.adjustments);
export const stockCountsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(inventoryEndpoints.stockCounts);

export function releaseReservation(id: string) { return apiDelete(inventoryEndpoints.releaseReservation(id)); }
export function dispatchTransfer(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(inventoryEndpoints.dispatchTransfer(id), body, idempotencyKey); }
export function receiveTransfer(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(inventoryEndpoints.receiveTransfer(id), body, idempotencyKey); }
export function postAdjustment(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(inventoryEndpoints.postAdjustment(id), body, idempotencyKey); }
export function startStockCount(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(inventoryEndpoints.startStockCount(id), body, idempotencyKey); }
export function submitStockCount(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(inventoryEndpoints.submitStockCount(id), body, idempotencyKey); }
export function postStockCount(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(inventoryEndpoints.postStockCount(id), body, idempotencyKey); }

export function lookupSerial(serialNo: string) { return apiGet(`/inventory/serials/${serialNo}`); }

export const InventoryApiRegistry = { endpoints: inventoryEndpoints, keys: inventoryKeys } as const;
