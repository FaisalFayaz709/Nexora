import { type ApiQueryParams } from '@/lib/api-client';
import { createCrudResourceApi, createModuleQueryKeys, postCommand } from '@/lib/module-api';

export type ListFilters = ApiQueryParams;
export type CreateInput = Record<string, unknown>;
export type UpdateInput = Record<string, unknown>;
export type CommandInput = Record<string, unknown>;

export const serviceEndpoints = {
  tickets: '/tickets',
  workOrders: '/work-orders',
  assignTicket: (id: string) => `/tickets/${id}/assign`,
  resolveTicket: (id: string) => `/tickets/${id}/resolve`,
  closeTicket: (id: string) => `/tickets/${id}/close`,
  assignWorkOrder: (id: string) => `/work-orders/${id}/assign`,
  acceptWorkOrder: (id: string) => `/work-orders/${id}/accept`,
  startWorkOrderTravel: (id: string) => `/work-orders/${id}/start-travel`,
  arriveWorkOrder: (id: string) => `/work-orders/${id}/arrive`,
  startWorkOrder: (id: string) => `/work-orders/${id}/start`,
  completeWorkOrder: (id: string) => `/work-orders/${id}/complete`,
  createServiceReport: (id: string) => `/work-orders/${id}/service-report`,
  checkInWorkOrder: (id: string) => `/work-orders/${id}/check-in`,
  checkOutWorkOrder: (id: string) => `/work-orders/${id}/check-out`,
  locationWorkOrder: (id: string) => `/work-orders/${id}/location`,
  technicianOfflineSync: '/portal/technician/offline-sync',
} as const;

export const serviceKeys = createModuleQueryKeys('service', { tickets: 'tickets', workOrders: 'workOrders' });

export const ticketsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(serviceEndpoints.tickets);
export const workOrdersApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(serviceEndpoints.workOrders);

export function assignTicket(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(serviceEndpoints.assignTicket(id), body, idempotencyKey); }
export function resolveTicket(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(serviceEndpoints.resolveTicket(id), body, idempotencyKey); }
export function closeTicket(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(serviceEndpoints.closeTicket(id), body, idempotencyKey); }
export function assignWorkOrder(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(serviceEndpoints.assignWorkOrder(id), body, idempotencyKey); }
export function acceptWorkOrder(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(serviceEndpoints.acceptWorkOrder(id), body, idempotencyKey); }
export function startWorkOrderTravel(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(serviceEndpoints.startWorkOrderTravel(id), body, idempotencyKey); }
export function arriveWorkOrder(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(serviceEndpoints.arriveWorkOrder(id), body, idempotencyKey); }
export function startWorkOrder(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(serviceEndpoints.startWorkOrder(id), body, idempotencyKey); }
export function completeWorkOrder(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(serviceEndpoints.completeWorkOrder(id), body, idempotencyKey); }
export function createServiceReport(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(serviceEndpoints.createServiceReport(id), body, idempotencyKey); }
export function checkInWorkOrder(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(serviceEndpoints.checkInWorkOrder(id), body, idempotencyKey); }
export function checkOutWorkOrder(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(serviceEndpoints.checkOutWorkOrder(id), body, idempotencyKey); }
export function locationWorkOrder(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(serviceEndpoints.locationWorkOrder(id), body, idempotencyKey); }
export function syncTechnicianOffline(body?: CommandInput, idempotencyKey?: string) { return postCommand(serviceEndpoints.technicianOfflineSync, body, idempotencyKey); }

export const ServiceApiRegistry = { endpoints: serviceEndpoints, keys: serviceKeys } as const;
