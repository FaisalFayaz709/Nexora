import { type ApiQueryParams } from '@/lib/api-client';
import { createCrudResourceApi, createModuleQueryKeys, postCommand } from '@/lib/module-api';

export type ListFilters = ApiQueryParams;
export type CreateInput = Record<string, unknown>;
export type UpdateInput = Record<string, unknown>;
export type CommandInput = Record<string, unknown>;

export const maintenanceEndpoints = {
  plans: '/maintenance/plans',
  schedule: '/maintenance/schedule',
  generateMaintenanceWorkOrder: (id: string) => `/maintenance/schedules/${id}/generate-work-order`,
  completeMaintenanceExecution: (id: string) => `/maintenance/executions/${id}/complete`,
} as const;

export const maintenanceKeys = createModuleQueryKeys('maintenance', { plans: 'plans', schedule: 'schedule' });

export const plansApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(maintenanceEndpoints.plans);
export const scheduleApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(maintenanceEndpoints.schedule);

export function generateMaintenanceWorkOrder(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(maintenanceEndpoints.generateMaintenanceWorkOrder(id), body, idempotencyKey); }
export function completeMaintenanceExecution(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(maintenanceEndpoints.completeMaintenanceExecution(id), body, idempotencyKey); }

export const MaintenanceApiRegistry = { endpoints: maintenanceEndpoints, keys: maintenanceKeys } as const;
