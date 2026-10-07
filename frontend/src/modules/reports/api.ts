import { apiGet, type ApiQueryParams } from '@/lib/api-client';
import { createCrudResourceApi, createModuleQueryKeys, postCommand } from '@/lib/module-api';

export type ListFilters = ApiQueryParams;
export type CreateInput = Record<string, unknown>;
export type UpdateInput = Record<string, unknown>;
export type CommandInput = Record<string, unknown>;

export const reportsEndpoints = {
  reports: '/reports',
  exports: '/reports/exports',
  reportTemplates: '/report-templates',
  savedReports: '/saved-reports',
  scheduledReports: '/scheduled-reports',
  requestReportExport: '/reports/exports',
  getReportExport: (id: string) => `/reports/exports/${id}`,
  getReportExecution: (id: string) => `/report-executions/${id}`,
} as const;

export const reportsKeys = createModuleQueryKeys('reports', { reports: 'reports', exports: 'exports', reportTemplates: 'reportTemplates', savedReports: 'savedReports', scheduledReports: 'scheduledReports' });

export const reportsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(reportsEndpoints.reports);
export const exportsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(reportsEndpoints.exports);
export const reportTemplatesApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(reportsEndpoints.reportTemplates);
export const savedReportsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(reportsEndpoints.savedReports);
export const scheduledReportsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(reportsEndpoints.scheduledReports);

export function requestReportExport(body?: CommandInput, idempotencyKey?: string) { return postCommand(reportsEndpoints.requestReportExport, body, idempotencyKey); }
export function getReportExport(id: string) { return apiGet(reportsEndpoints.getReportExport(id)); }
export function getReportExecution(id: string) { return apiGet(reportsEndpoints.getReportExecution(id)); }

export const ReportsApiRegistry = { endpoints: reportsEndpoints, keys: reportsKeys } as const;
