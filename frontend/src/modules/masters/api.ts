import { apiGet, apiPost, type ApiQueryParams } from '@/lib/api-client';
import { createCrudResourceApi, createModuleQueryKeys } from '@/lib/module-api';

export type ListFilters = ApiQueryParams;
export type CreateInput = Record<string, unknown>;
export type UpdateInput = Record<string, unknown>;
export type CommandInput = Record<string, unknown>;

export const mastersEndpoints = {
  employees: '/employees',
  customers: '/customers',
  customerSites: '/customer-sites',
  vendors: '/vendors',
  products: '/products',
  warehouses: '/warehouses',
  imports: '/imports',
} as const;

export const mastersKeys = createModuleQueryKeys('masters', { employees: 'employees', customers: 'customers', customerSites: 'customerSites', vendors: 'vendors', products: 'products', warehouses: 'warehouses', imports: 'imports' });

export const employeesApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(mastersEndpoints.employees);
export const customersApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(mastersEndpoints.customers);
export const customerSitesApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(mastersEndpoints.customerSites);
export const vendorsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(mastersEndpoints.vendors);
export const productsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(mastersEndpoints.products);
export const warehousesApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(mastersEndpoints.warehouses);
export const importsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(mastersEndpoints.imports);


export function getCustomerTimeline(id: string) { return apiGet(`/customers/${id}/timeline`); }
export function getCustomerSiteAssets(id: string) { return apiGet(`/customer-sites/${id}/assets`); }

export const MastersApiRegistry = { endpoints: mastersEndpoints, keys: mastersKeys } as const;


export function uploadImportBatch(input: CommandInput, idempotencyKey?: string) { return apiPost('/imports/upload', input, { idempotencyKey }); }
export function validateImportBatch(id: string, input: CommandInput, idempotencyKey?: string) { return apiPost(`/imports/${id}/validate`, input, { idempotencyKey }); }
export function commitImportBatch(id: string, input: CommandInput, idempotencyKey?: string) { return apiPost(`/imports/${id}/commit`, input, { idempotencyKey }); }
export function rollbackImportBatch(id: string, input: CommandInput, idempotencyKey?: string) { return apiPost(`/imports/${id}/rollback`, input, { idempotencyKey }); }
