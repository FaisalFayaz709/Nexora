import { apiGet, type ApiQueryParams } from '@/lib/api-client';
import { createCrudResourceApi, createModuleQueryKeys, postCommand } from '@/lib/module-api';

export type ListFilters = ApiQueryParams;
export type CreateInput = Record<string, unknown>;
export type UpdateInput = Record<string, unknown>;
export type CommandInput = Record<string, unknown>;

export const portalEndpoints = {
  customerDashboard: '/portal/customer/dashboard',
  customerProjects: '/portal/customer/projects',
  customerContracts: '/portal/customer/contracts',
  customerSites: '/portal/customer/sites',
  customerAssets: '/portal/customer/assets',
  customerTickets: '/portal/customer/tickets',
  customerInvoices: '/portal/customer/invoices',
  customerPayments: '/portal/customer/payments',
  customerDocuments: '/portal/customer/documents',
  customerConfirmWorkOrder: (id: string) => `/portal/customer/work-orders/${id}/confirm`,
  vendorDashboard: '/portal/vendor/dashboard',
  vendorRfqs: '/portal/vendor/rfqs',
  vendorQuotations: '/portal/vendor/quotations',
  vendorPurchaseOrders: '/portal/vendor/purchase-orders',
  vendorAcknowledgePurchaseOrder: (id: string) => `/portal/vendor/purchase-orders/${id}/acknowledge`,
  vendorDeliveries: '/portal/vendor/deliveries',
  vendorInvoices: '/portal/vendor/invoices',
  vendorPayments: '/portal/vendor/payments',
  vendorPerformance: '/portal/vendor/performance',
  vendorDocuments: '/portal/vendor/documents',
  technicianDashboard: '/portal/technician/dashboard',
  technicianJobs: '/portal/technician/jobs',
  technicianWorkOrder: (id: string) => `/portal/technician/work-orders/${id}`,
  technicianAccept: (id: string) => `/portal/technician/work-orders/${id}/accept`,
  technicianStartTravel: (id: string) => `/portal/technician/work-orders/${id}/start-travel`,
  technicianArrive: (id: string) => `/portal/technician/work-orders/${id}/arrive`,
  technicianCheckIn: (id: string) => `/portal/technician/work-orders/${id}/check-in`,
  technicianLocation: (id: string) => `/portal/technician/work-orders/${id}/location`,
  technicianStart: (id: string) => `/portal/technician/work-orders/${id}/start`,
  technicianServiceReport: (id: string) => `/portal/technician/work-orders/${id}/service-report`,
  technicianCheckOut: (id: string) => `/portal/technician/work-orders/${id}/check-out`,
  technicianComplete: (id: string) => `/portal/technician/work-orders/${id}/complete`,
  technicianOfflineQueue: '/portal/technician/offline-queue',
  syncTechnicianOffline: '/portal/technician/offline-sync',
} as const;

export const portalKeys = createModuleQueryKeys('portal', {
  customerDashboard: 'customer-dashboard', customerProjects: 'customer-projects', customerContracts: 'customer-contracts', customerSites: 'customer-sites', customerAssets: 'customer-assets', customerTickets: 'customer-tickets', customerInvoices: 'customer-invoices', customerPayments: 'customer-payments', customerDocuments: 'customer-documents',
  vendorDashboard: 'vendor-dashboard', vendorRfqs: 'vendor-rfqs', vendorQuotations: 'vendor-quotations', vendorPurchaseOrders: 'vendor-purchase-orders', vendorDeliveries: 'vendor-deliveries', vendorInvoices: 'vendor-invoices', vendorPayments: 'vendor-payments', vendorPerformance: 'vendor-performance', vendorDocuments: 'vendor-documents',
  technicianDashboard: 'technician-dashboard', technicianJobs: 'technician-jobs', technicianOfflineQueue: 'technician-offline-queue',
});

export const customerPortalApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(portalEndpoints.customerDashboard);
export const vendorPortalApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(portalEndpoints.vendorDashboard);
export const technicianJobsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(portalEndpoints.technicianJobs);

export function getCustomerDashboard(filters?: ListFilters) { return apiGet(portalEndpoints.customerDashboard, filters); }
export function getVendorDashboard(filters?: ListFilters) { return apiGet(portalEndpoints.vendorDashboard, filters); }
export function getTechnicianDashboard(filters?: ListFilters) { return apiGet(portalEndpoints.technicianDashboard, filters); }
export function createCustomerTicket(body: CommandInput, idempotencyKey?: string) { return postCommand(portalEndpoints.customerTickets, body, idempotencyKey); }
export function confirmCustomerWorkOrder(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(portalEndpoints.customerConfirmWorkOrder(id), body, idempotencyKey); }
export function submitVendorQuotation(body: CommandInput, idempotencyKey?: string) { return postCommand(portalEndpoints.vendorQuotations, body, idempotencyKey); }
export function acknowledgeVendorPurchaseOrder(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(portalEndpoints.vendorAcknowledgePurchaseOrder(id), body, idempotencyKey); }
export function submitVendorInvoice(body: CommandInput, idempotencyKey?: string) { return postCommand(portalEndpoints.vendorInvoices, body, idempotencyKey); }
export function technicianCommand(endpoint: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(endpoint, body, idempotencyKey); }
export function syncTechnicianOffline(body?: CommandInput, idempotencyKey?: string) { return postCommand(portalEndpoints.syncTechnicianOffline, body, idempotencyKey); }

export const PortalApiRegistry = { endpoints: portalEndpoints, keys: portalKeys, boundary: 'Fastify /api/v1 portal APIs only; no Next.js duplicate business API.' } as const;
