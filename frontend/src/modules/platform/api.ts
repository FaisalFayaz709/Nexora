import { apiGet, type ApiQueryParams } from '@/lib/api-client';
import { createCrudResourceApi, createModuleQueryKeys, postCommand } from '@/lib/module-api';

export type PlatformCommandInput = Record<string, unknown>;

export const platformEndpoints = {
  healthReady: '/health/ready',
  healthLive: '/health/live',
  search: '/search',
  calendar: '/calendar',
  features: '/features',
  organizationFeatures: '/organization-features',
  moduleConfigurations: '/module-configurations',
  auditLogs: '/audit-logs',
  documents: '/documents',
  uploadIntent: '/documents/upload-intent',
  completeUpload: '/documents/complete-upload',
  documentDownloadUrl: (id: string) => `/documents/${id}/download-url`,
  documentVersions: (id: string) => `/documents/${id}/versions`,
  reports: '/reports',
  reportExports: '/reports/exports',
  reportExportDetail: (jobId: string) => `/reports/exports/${jobId}`,
  reportTemplates: '/report-templates',
  savedReports: '/saved-reports',
  scheduledReports: '/scheduled-reports',
  reportExecutions: '/report-executions',
  savedViews: '/saved-views',
  dashboardWidgets: '/dashboards/widgets',
  reportExecutionDetail: (id: string) => `/report-executions/${id}`,
  communications: '/communications',
  communicationTemplates: '/communication-templates',
  sendCommunication: '/communications/send',
  communicationDelivery: (id: string) => `/communications/${id}/delivery`,
  notifications: '/notifications',
  notificationRead: (id: string) => `/notifications/${id}/read`,
  notificationsReadAll: '/notifications/read-all',
  saasPlans: '/saas/plans',
  saasSubscriptions: '/saas/subscriptions',
  saasUsage: '/saas/usage',
  saasUsageCollect: '/saas/usage/collect',
  saasInvoices: '/saas/invoices',
  saasInvoicePost: (id: string) => `/saas/invoices/${id}/post`,
} as const;

export const platformKeys = createModuleQueryKeys('platform', {
  search: 'search', calendar: 'calendar', features: 'features', organizationFeatures: 'organization-features', moduleConfigurations: 'module-configurations',
  auditLogs: 'audit-logs', documents: 'documents', reports: 'reports', reportTemplates: 'report-templates', savedReports: 'saved-reports', scheduledReports: 'scheduled-reports', reportExecutions: 'report-executions', savedViews: 'saved-views', dashboardWidgets: 'dashboard-widgets',
  notifications: 'notifications', communications: 'communications', communicationTemplates: 'communication-templates', saasPlans: 'saas-plans', saasSubscriptions: 'saas-subscriptions', saasUsage: 'saas-usage', saasInvoices: 'saas-invoices',
});

export const documentsApi = createCrudResourceApi(platformEndpoints.documents);
export const reportsApi = createCrudResourceApi(platformEndpoints.reports);
export const reportTemplatesApi = createCrudResourceApi(platformEndpoints.reportTemplates);
export const savedReportsApi = createCrudResourceApi(platformEndpoints.savedReports);
export const scheduledReportsApi = createCrudResourceApi(platformEndpoints.scheduledReports);
export const reportExecutionsApi = createCrudResourceApi(platformEndpoints.reportExecutions);
export const savedViewsApi = createCrudResourceApi(platformEndpoints.savedViews);
export const dashboardWidgetsApi = createCrudResourceApi(platformEndpoints.dashboardWidgets);
export const notificationsApi = createCrudResourceApi(platformEndpoints.notifications);
export const communicationsApi = createCrudResourceApi(platformEndpoints.communications);
export const communicationTemplatesApi = createCrudResourceApi(platformEndpoints.communicationTemplates);
export const saasPlansApi = createCrudResourceApi(platformEndpoints.saasPlans);
export const saasSubscriptionsApi = createCrudResourceApi(platformEndpoints.saasSubscriptions);
export const saasUsageApi = createCrudResourceApi(platformEndpoints.saasUsage);
export const saasInvoicesApi = createCrudResourceApi(platformEndpoints.saasInvoices);

export function readiness() { return apiGet(platformEndpoints.healthReady); }
export function liveness() { return apiGet(platformEndpoints.healthLive); }
export function globalSearch(filters?: ApiQueryParams) { return apiGet(platformEndpoints.search, filters); }
export function calendar(filters?: ApiQueryParams) { return apiGet(platformEndpoints.calendar, filters); }
export function requestUploadIntent(body: PlatformCommandInput, idempotencyKey?: string) { return postCommand(platformEndpoints.uploadIntent, body, idempotencyKey); }
export function completeUpload(body: PlatformCommandInput, idempotencyKey?: string) { return postCommand(platformEndpoints.completeUpload, body, idempotencyKey); }
export function requestDocumentDownloadUrl(id: string) { return apiGet(platformEndpoints.documentDownloadUrl(id)); }
export function uploadDocumentVersion(id: string, body: PlatformCommandInput, idempotencyKey?: string) { return postCommand(platformEndpoints.documentVersions(id), body, idempotencyKey); }
export function requestReportExport(body: PlatformCommandInput, idempotencyKey?: string) { return postCommand(platformEndpoints.reportExports, body, idempotencyKey); }
export function getReportExport(jobId: string) { return apiGet(platformEndpoints.reportExportDetail(jobId)); }
export function getReportExecution(id: string) { return apiGet(platformEndpoints.reportExecutionDetail(id)); }
export function listSavedViews(filters?: ApiQueryParams) { return apiGet(platformEndpoints.savedViews, filters); }
export function listDashboardWidgets(filters?: ApiQueryParams) { return apiGet(platformEndpoints.dashboardWidgets, filters); }
export function sendCommunication(body: PlatformCommandInput, idempotencyKey?: string) { return postCommand(platformEndpoints.sendCommunication, body, idempotencyKey); }
export function getCommunicationDelivery(id: string) { return apiGet(platformEndpoints.communicationDelivery(id)); }
export function markNotificationRead(id: string) { return postCommand(platformEndpoints.notificationRead(id), {}); }
export function markAllNotificationsRead() { return postCommand(platformEndpoints.notificationsReadAll, {}); }

export const PlatformApiRegistry = { endpoints: platformEndpoints, keys: platformKeys } as const;

export function collectSaaSUsage(body: PlatformCommandInput, idempotencyKey?: string) { return postCommand(platformEndpoints.saasUsageCollect, body, idempotencyKey); }
export function postSaaSInvoice(id: string, body: PlatformCommandInput, idempotencyKey?: string) { return postCommand(platformEndpoints.saasInvoicePost(id), body, idempotencyKey); }
