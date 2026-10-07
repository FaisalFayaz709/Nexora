import type { PermissionKey } from '@nexora/shared';
import type { EntityColumnConfig } from '@/modules/masters/columns';
import {
  auditLogColumns, calendarColumns, communicationColumns, documentColumns, featureColumns, notificationColumns,
  reportColumns, reportExecutionColumns, reportTemplateColumns, savedViewColumns, dashboardWidgetColumns, saasColumns, savedReportColumns, scheduledReportColumns, searchColumns,
} from './columns';

export type PlatformResourceKey =
  | 'documents' | 'reports' | 'report-templates' | 'saved-reports' | 'scheduled-reports' | 'report-executions' | 'saved-views' | 'dashboard-widgets'
  | 'communications' | 'communication-templates' | 'notifications' | 'audit-logs' | 'search' | 'calendar'
  | 'saas-plans' | 'saas-subscriptions' | 'saas-usage' | 'saas-invoices' | 'features' | 'module-configurations';

export type PlatformCommandKey =
  | 'document-upload-intent' | 'document-complete-upload' | 'document-version' | 'document-download-url'
  | 'report-export' | 'send-communication' | 'notification-read' | 'notifications-read-all'
  | 'create-report-template' | 'create-saved-report' | 'create-scheduled-report'
  | 'create-saas-plan' | 'create-saas-subscription' | 'toggle-feature' | 'create-saved-view' | 'create-dashboard-widget';

export type PlatformCommandConfig = {
  key: PlatformCommandKey;
  label: string;
  endpointTemplate: string;
  requiredPermission: PermissionKey;
  idempotent: boolean;
  allowedStates: readonly string[];
  irreversibleEffects: readonly string[];
};

export type PlatformResourceConfig = {
  key: PlatformResourceKey;
  title: string;
  singularTitle: string;
  routeBase: string;
  endpoint: string;
  viewPermission: PermissionKey;
  createPermission?: PermissionKey;
  updatePermission?: PermissionKey;
  listSupported: boolean;
  detailSupported: boolean;
  editSupported: boolean;
  createSupported: boolean;
  description: string;
  columns: readonly EntityColumnConfig[];
  identityFields: readonly string[];
  profileFields: readonly string[];
  relatedPanels: readonly { title: string; description: string; href?: string }[];
  commands: readonly PlatformCommandConfig[];
  initialFilters?: Record<string, string | number | boolean | null | undefined>;
};

export const PlatformCompletionPrinciples = [
  'Documents use Fastify StorageService and MinIO presigned flows; frontend never owns MinIO credentials or direct object storage logic.',
  'Report exports are asynchronous jobs and export generated Documents; browser-side CSV from partial grid rows is not accepted.',
  'Saved reports, report builder fields and dashboard widgets keep permission, tenant and branch scope from the source data.',
  'Communications preserve delivery evidence and do not expose email/SMS secrets to frontend code.',
  'Notifications are current-user scoped and read/read-all commands cannot affect another tenant user.',
  'Audit logs, global search and calendar are permission-filtered read models with bounded pagination.',
  'Customer and vendor portals use linked-record scope; portal users cannot see internal ERP navigation or unrelated tenant data.',
  'SaaS billing, feature flags and module configuration are platform-owner/admin surfaces and remain blocked by Fastify service policy.',
] as const;

const DocumentCommands: readonly PlatformCommandConfig[] = [
  { key: 'document-upload-intent', label: 'Request upload intent', endpointTemplate: '/documents/upload-intent', requiredPermission: 'document.create', idempotent: true, allowedStates: ['NEW'], irreversibleEffects: ['Authorizes short-lived object upload through backend StorageService.', 'Applies tenant, subject, category, size and MIME validation before MinIO interaction.'] },
  { key: 'document-complete-upload', label: 'Complete upload', endpointTemplate: '/documents/complete-upload', requiredPermission: 'document.create', idempotent: true, allowedStates: ['UPLOADED'], irreversibleEffects: ['Creates Document, DocumentVersion and DocumentLink metadata after checksum/object validation.', 'Records audit/business event; later download uses authorized presigned GET.'] },
  { key: 'document-version', label: 'Upload new version', endpointTemplate: '/documents/:id/versions', requiredPermission: 'document.update', idempotent: true, allowedStates: ['ACTIVE'], irreversibleEffects: ['Appends DocumentVersion instead of overwriting document evidence.', 'Preserves retention/audit history for linked business subjects.'] },
  { key: 'document-download-url', label: 'Request download URL', endpointTemplate: '/documents/:id/download-url', requiredPermission: 'document.view', idempotent: false, allowedStates: ['ACTIVE'], irreversibleEffects: ['Requires authorization before short-lived download URL is returned.', 'Does not expose bucket credentials to frontend code.'] },
];

const ReportCommands: readonly PlatformCommandConfig[] = [
  { key: 'create-report-template', label: 'Create report template', endpointTemplate: '/report-templates', requiredPermission: 'report_builder.manage', idempotent: true, allowedStates: ['DRAFT'], irreversibleEffects: ['Stores allowlisted report fields and source permission scope.', 'Prevents report builder from bypassing RBAC, tenant or branch filtering.'] },
  { key: 'create-saved-report', label: 'Create saved report', endpointTemplate: '/saved-reports', requiredPermission: 'report_builder.manage', idempotent: true, allowedStates: ['DRAFT'], irreversibleEffects: ['Saves selected columns/filters without weakening source data permissions.', 'Records owner scope for saved grid and dashboard views.'] },
  { key: 'create-scheduled-report', label: 'Create scheduled report', endpointTemplate: '/scheduled-reports', requiredPermission: 'report_builder.manage', idempotent: true, allowedStates: ['DRAFT'], irreversibleEffects: ['Creates scheduled report configuration and future ReportExecution records.', 'Delivery remains worker-driven after source data query is authorized.'] },
  { key: 'report-export', label: 'Request report export', endpointTemplate: '/reports/exports', requiredPermission: 'report.export', idempotent: true, allowedStates: ['READY'], irreversibleEffects: ['Creates ReportExecution job for CSV/XLSX/PDF export.', 'Worker stores generated export as Document; browser does not export partial grid rows.'] },
];


const SavedViewCommands: readonly PlatformCommandConfig[] = [
  { key: 'create-saved-view', label: 'Create saved view', endpointTemplate: '/saved-views', requiredPermission: 'report_builder.manage', idempotent: true, allowedStates: ['DRAFT'], irreversibleEffects: ['Stores selected grid columns, filters and sort without weakening source permissions.', 'Saved views remain current-user, tenant and permission scoped.'] },
];

const DashboardCommands: readonly PlatformCommandConfig[] = [
  { key: 'create-dashboard-widget', label: 'Create dashboard widget', endpointTemplate: '/dashboards/widgets', requiredPermission: 'report_builder.manage', idempotent: true, allowedStates: ['DRAFT'], irreversibleEffects: ['Adds a permission-scoped dashboard widget for role dashboards.', 'Widget source data stays read-only and cannot mutate stock, finance, approval or journal state.'] },
];

const CommunicationCommands: readonly PlatformCommandConfig[] = [
  { key: 'send-communication', label: 'Send communication', endpointTemplate: '/communications/send', requiredPermission: 'communication.send', idempotent: true, allowedStates: ['DRAFT'], irreversibleEffects: ['Creates communication log plus delivery/outbox evidence.', 'Queues email/SMS after committed business log/audit state.'] },
];

const NotificationCommands: readonly PlatformCommandConfig[] = [
  { key: 'notification-read', label: 'Mark notification read', endpointTemplate: '/notifications/:id/read', requiredPermission: 'communication.view', idempotent: true, allowedStates: ['UNREAD'], irreversibleEffects: ['Updates current-user notification read state only.', 'Cannot alter notifications owned by another user or tenant.'] },
  { key: 'notifications-read-all', label: 'Mark all notifications read', endpointTemplate: '/notifications/read-all', requiredPermission: 'communication.view', idempotent: true, allowedStates: ['UNREAD'], irreversibleEffects: ['Bulk command remains current-user and tenant scoped.', 'Records consistent notification read model update.'] },
];

const FeatureCommands: readonly PlatformCommandConfig[] = [
  { key: 'toggle-feature', label: 'Toggle module feature', endpointTemplate: '/organization-features', requiredPermission: 'feature.manage', idempotent: true, allowedStates: ['ACTIVE'], irreversibleEffects: ['Disabled modules are hidden in UI and blocked by API/service policy.', 'Configuration changes are audited in platform history.'] },
];

const SaaSCommands: readonly PlatformCommandConfig[] = [
  { key: 'create-saas-plan', label: 'Create SaaS plan', endpointTemplate: '/saas/plans', requiredPermission: 'saas.manage', idempotent: true, allowedStates: ['DRAFT'], irreversibleEffects: ['Defines tenant plan limits for users, storage, modules and billing.', 'Used by platform owner, not normal tenant users.'] },
  { key: 'create-saas-subscription', label: 'Create SaaS subscription', endpointTemplate: '/saas/subscriptions', requiredPermission: 'saas.manage', idempotent: true, allowedStates: ['DRAFT'], irreversibleEffects: ['Links plan limits and subscription status to an organization.', 'Usage and billing effects are platform-audited.'] },
];

export const PlatformResourceConfigs = {
  documents: { key: 'documents', title: 'Documents', singularTitle: 'Document', routeBase: '/documents', endpoint: '/documents', viewPermission: 'document.view', createPermission: 'document.create', updatePermission: 'document.update', listSupported: true, detailSupported: true, editSupported: false, createSupported: true, description: 'MinIO-backed document metadata, versions, subject links, upload-intent and authorized download workflows.', columns: documentColumns, identityFields: ['fileName','mimeType','category','subjectType','subjectId','uploadedById'], profileFields: ['size','checksum','bucket','objectKey','createdAt','updatedAt'], relatedPanels: [{title:'Upload intent', description:'Browser requests Fastify authorization before presigned PUT.', href:'/documents/upload'}, {title:'Versions', description:'New versions append document history and preserve retention.', href:'/documents/[id]/versions'}, {title:'Download', description:'Downloads use authorized short-lived presigned GET URLs.'}], commands: DocumentCommands },
  reports: { key: 'reports', title: 'Reports', singularTitle: 'Report', routeBase: '/reports', endpoint: '/reports', viewPermission: 'report.view', createPermission: 'report_builder.manage', listSupported: true, detailSupported: true, editSupported: false, createSupported: false, description: 'Permission-scoped report catalog and role dashboard read models.', columns: reportColumns, identityFields: ['name','templateId','dataSource','chartType','status'], profileFields: ['filterJson','permissionScope','createdAt','updatedAt'], relatedPanels: [{title:'Exports', description:'Large exports use worker jobs.', href:'/reports/exports'}, {title:'Report builder', description:'Templates and saved reports define allowlisted fields.', href:'/report-builder'}], commands: ReportCommands },
  'report-templates': { key: 'report-templates', title: 'Report Templates', singularTitle: 'Report Template', routeBase: '/report-builder/templates', endpoint: '/report-templates', viewPermission: 'report.view', createPermission: 'report_builder.manage', updatePermission: 'report_builder.manage', listSupported: true, detailSupported: true, editSupported: true, createSupported: true, description: 'Custom report builder templates with source fields, filters, charts and permission scope.', columns: reportTemplateColumns, identityFields: ['name','dataSource','requiredPermission','active'], profileFields: ['selectedFields','filterSchema','chartTypes','createdAt','updatedAt'], relatedPanels: [{title:'Saved views', description:'Saved reports and dashboards reference templates without changing permissions.', href:'/report-builder/saved-reports'}], commands: ReportCommands },
  'saved-reports': { key: 'saved-reports', title: 'Saved Reports', singularTitle: 'Saved Report', routeBase: '/report-builder/saved-reports', endpoint: '/saved-reports', viewPermission: 'report.view', createPermission: 'report_builder.manage', updatePermission: 'report_builder.manage', listSupported: true, detailSupported: true, editSupported: true, createSupported: true, description: 'User-specific saved filters, columns and dashboard views with preserved permission scope.', columns: savedReportColumns, identityFields: ['name','templateId','ownerId','visibility'], profileFields: ['selectedFields','filterJson','sortJson','createdAt','updatedAt'], relatedPanels: [{title:'Schedule', description:'Saved reports can be scheduled for exports.', href:'/report-builder/scheduled-reports'}], commands: ReportCommands },
  'scheduled-reports': { key: 'scheduled-reports', title: 'Scheduled Reports', singularTitle: 'Scheduled Report', routeBase: '/report-builder/scheduled-reports', endpoint: '/scheduled-reports', viewPermission: 'report.view', createPermission: 'report_builder.manage', updatePermission: 'report_builder.manage', listSupported: true, detailSupported: true, editSupported: true, createSupported: true, description: 'Scheduled report delivery configuration and ReportExecution creation rules.', columns: scheduledReportColumns, identityFields: ['name','savedReportId','frequency','nextRunAt','active'], profileFields: ['timezone','recipients','format','createdAt','updatedAt'], relatedPanels: [{title:'Executions', description:'Every run creates an auditable ReportExecution and generated Document.', href:'/report-executions'}], commands: ReportCommands },
  'report-executions': { key: 'report-executions', title: 'Report Executions', singularTitle: 'Report Execution', routeBase: '/report-executions', endpoint: '/report-executions', viewPermission: 'report.view', listSupported: true, detailSupported: true, editSupported: false, createSupported: false, description: 'Async report execution status, export document link and worker delivery evidence.', columns: reportExecutionColumns, identityFields: ['id','reportId','format','status','documentId'], profileFields: ['requestedById','startedAt','completedAt','failureReason','createdAt'], relatedPanels: [{title:'Export job', description:'Report export job result is checked by /reports/exports/:jobId.', href:'/reports/exports'}], commands: [] },
  'saved-views': { key: 'saved-views', title: 'Saved Views', singularTitle: 'Saved View', routeBase: '/saved-views', endpoint: '/saved-views', viewPermission: 'report.view', createPermission: 'report_builder.manage', updatePermission: 'report_builder.manage', listSupported: true, detailSupported: true, editSupported: true, createSupported: true, description: 'User-specific saved grid/report views with preserved source permission scope, filters, columns and sort state.', columns: savedViewColumns, identityFields: ['name','entityType','isDefault','userId'], profileFields: ['columnsJson','filterJson','sortJson','permissionScope','createdAt','updatedAt'], relatedPanels: [{title:'Report builder', description:'Saved views can back report grids and management dashboards.', href:'/report-builder'}], commands: SavedViewCommands },
  'dashboard-widgets': { key: 'dashboard-widgets', title: 'Dashboard Widgets', singularTitle: 'Dashboard Widget', routeBase: '/dashboards/widgets', endpoint: '/dashboards/widgets', viewPermission: 'report.view', createPermission: 'report_builder.manage', listSupported: true, detailSupported: false, editSupported: false, createSupported: true, description: 'Role dashboard widgets scoped by tenant, user dashboard and source permissions.', columns: dashboardWidgetColumns, identityFields: ['title','widgetType','savedReportId','userDashboardId'], profileFields: ['configJson','layoutJson','permissionScope','createdAt','updatedAt'], relatedPanels: [{title:'Reports', description:'Widgets may reference saved reports without bypassing report permissions.', href:'/reports'}], commands: DashboardCommands },
  communications: { key: 'communications', title: 'Communications', singularTitle: 'Communication', routeBase: '/communications', endpoint: '/communications', viewPermission: 'communication.view', createPermission: 'communication.send', listSupported: true, detailSupported: true, editSupported: false, createSupported: true, description: 'Customer/vendor/portal communication history, delivery status, attachments and outbox evidence.', columns: communicationColumns, identityFields: ['subject','channel','recipient','subjectType','subjectId','deliveryStatus'], profileFields: ['templateId','bodyPreview','failureReason','createdAt','updatedAt'], relatedPanels: [{title:'Delivery', description:'Delivery detail is read through communication delivery endpoint.', href:'/communications/[id]/delivery'}], commands: CommunicationCommands },
  'communication-templates': { key: 'communication-templates', title: 'Communication Templates', singularTitle: 'Communication Template', routeBase: '/communication-templates', endpoint: '/communication-templates', viewPermission: 'communication.view', createPermission: 'communication.send', updatePermission: 'communication.send', listSupported: true, detailSupported: true, editSupported: true, createSupported: true, description: 'Approved email/SMS/portal message templates for controlled communication logs.', columns: communicationColumns, identityFields: ['name','channel','subject','active'], profileFields: ['body','variables','createdAt','updatedAt'], relatedPanels: [{title:'Send log', description:'Templates create traceable CommunicationLog and delivery records.', href:'/communications/send'}], commands: CommunicationCommands },
  notifications: { key: 'notifications', title: 'Notifications', singularTitle: 'Notification', routeBase: '/notifications', endpoint: '/notifications', viewPermission: 'communication.view', listSupported: true, detailSupported: true, editSupported: false, createSupported: false, description: 'Current-user notification center for approvals, low stock, overdue invoices, maintenance and work-order events.', columns: notificationColumns, identityFields: ['title','type','userId','readAt','createdAt'], profileFields: ['body','subjectType','subjectId','priority'], relatedPanels: [{title:'Read state', description:'Read commands remain current-user scoped.'}], commands: NotificationCommands },
  'audit-logs': { key: 'audit-logs', title: 'Audit Logs', singularTitle: 'Audit Log', routeBase: '/audit-logs', endpoint: '/audit-logs', viewPermission: 'audit.view', listSupported: true, detailSupported: true, editSupported: false, createSupported: false, description: 'Immutable business audit trail for high-risk actions and administrative changes.', columns: auditLogColumns, identityFields: ['action','subjectType','subjectId','actorUserId','organizationId'], profileFields: ['beforeJson','afterJson','ip','createdAt'], relatedPanels: [{title:'Traceability', description:'Audit logs are read-only and never patched from the frontend.'}], commands: [] },
  search: { key: 'search', title: 'Global Search', singularTitle: 'Search Result', routeBase: '/search', endpoint: '/search', viewPermission: 'report.view', listSupported: true, detailSupported: false, editSupported: false, createSupported: false, description: 'Permission-filtered global search for assets, projects, serials, invoices, purchase orders, tickets and employees.', columns: searchColumns, identityFields: ['type','title','businessNo','subjectId'], profileFields: ['snippet','matchedField','createdAt'], relatedPanels: [{title:'Permission filter', description:'Search returns only resources the user could view through source modules.'}], commands: [], initialFilters: { q: 'project' } },
  calendar: { key: 'calendar', title: 'Unified Calendar', singularTitle: 'Calendar Event', routeBase: '/calendar', endpoint: '/calendar', viewPermission: 'report.view', listSupported: true, detailSupported: false, editSupported: false, createSupported: false, description: 'Permission-filtered unified calendar for project deadlines, maintenance, leave, visits, expiries and payments.', columns: calendarColumns, identityFields: ['title','sourceType','startsAt','endsAt','status'], profileFields: ['subjectType','subjectId','branchId'], relatedPanels: [{title:'Source modules', description:'Calendar is an aggregate read model and does not mutate source records.'}], commands: [], initialFilters: { from: '2026-09-01', to: '2026-09-30' } },
  'saas-plans': { key: 'saas-plans', title: 'SaaS Plans', singularTitle: 'SaaS Plan', routeBase: '/saas/plans', endpoint: '/saas/plans', viewPermission: 'saas.manage', createPermission: 'saas.manage', updatePermission: 'saas.manage', listSupported: true, detailSupported: true, editSupported: true, createSupported: true, description: 'Platform-owner subscription plans, module limits, user limits and storage limits.', columns: saasColumns, identityFields: ['name','status','userLimit','storageLimitGb'], profileFields: ['featureLimits','price','billingCycle','createdAt','updatedAt'], relatedPanels: [{title:'Subscriptions', description:'Plans are attached to tenant subscriptions.', href:'/saas/subscriptions'}], commands: SaaSCommands },
  'saas-subscriptions': { key: 'saas-subscriptions', title: 'SaaS Subscriptions', singularTitle: 'SaaS Subscription', routeBase: '/saas/subscriptions', endpoint: '/saas/subscriptions', viewPermission: 'saas.manage', createPermission: 'saas.manage', updatePermission: 'saas.manage', listSupported: true, detailSupported: true, editSupported: true, createSupported: true, description: 'Tenant subscription status, active plan, limits, trial state, billing and enforcement.', columns: saasColumns, identityFields: ['organizationId','planId','status','trialEndsAt'], profileFields: ['currentPeriodStart','currentPeriodEnd','usageMetricId','createdAt','updatedAt'], relatedPanels: [{title:'Usage', description:'Usage metrics support billing and limit enforcement.', href:'/saas/usage'}], commands: SaaSCommands },
  'saas-usage': { key: 'saas-usage', title: 'SaaS Usage', singularTitle: 'Tenant Usage', routeBase: '/saas/usage', endpoint: '/saas/usage', viewPermission: 'saas.manage', listSupported: true, detailSupported: false, editSupported: false, createSupported: false, description: 'Tenant usage metrics for users, storage, modules and billing limits.', columns: saasColumns, identityFields: ['organizationId','period','activeUsers','storageUsedGb'], profileFields: ['apiCalls','documentCount','updatedAt'], relatedPanels: [{title:'Plan guard', description:'Backend enforces plan limits; frontend only displays usage state.'}], commands: [] },
  'saas-invoices': { key: 'saas-invoices', title: 'SaaS Invoices', singularTitle: 'SaaS Invoice', routeBase: '/saas/invoices', endpoint: '/saas/invoices', viewPermission: 'saas.manage', createPermission: 'saas.manage', updatePermission: 'saas.manage', listSupported: true, detailSupported: true, editSupported: true, createSupported: true, description: 'Tenant subscription billing invoices, posting state and platform-owner audit trail.', columns: saasColumns, identityFields: ['invoiceNo','organizationId','subscriptionId','status'], profileFields: ['amount','dueDate','postedAt','memo'], relatedPanels: [{title:'Subscriptions', description:'Invoices are tied to active tenant subscriptions.', href:'/saas/subscriptions'}], commands: SaaSCommands },
  features: { key: 'features', title: 'Feature Flags', singularTitle: 'Feature Flag', routeBase: '/platform-features', endpoint: '/features', viewPermission: 'feature.manage', createPermission: 'feature.manage', updatePermission: 'feature.manage', listSupported: true, detailSupported: true, editSupported: true, createSupported: true, description: 'Per-tenant feature flags and module enablement with API/service blocking for disabled modules.', columns: featureColumns, identityFields: ['key','module','enabled','organizationId'], profileFields: ['configurationJson','updatedById','createdAt','updatedAt'], relatedPanels: [{title:'Module configuration', description:'Disabled modules are hidden in navigation and blocked by backend services.', href:'/module-configurations'}], commands: FeatureCommands },
  'module-configurations': { key: 'module-configurations', title: 'Module Configurations', singularTitle: 'Module Configuration', routeBase: '/module-configurations', endpoint: '/module-configurations', viewPermission: 'feature.manage', createPermission: 'feature.manage', updatePermission: 'feature.manage', listSupported: true, detailSupported: true, editSupported: true, createSupported: true, description: 'Module-level tenant configuration history, plan guard and rollout controls.', columns: featureColumns, identityFields: ['module','enabled','planRequired','organizationId'], profileFields: ['configJson','history','updatedAt'], relatedPanels: [{title:'Audit', description:'Every module/feature change produces configuration history and audit records.'}], commands: FeatureCommands },
} satisfies Record<PlatformResourceKey, PlatformResourceConfig>;

export function getPlatformResourceConfig(key: PlatformResourceKey): PlatformResourceConfig {
  return PlatformResourceConfigs[key];
}

export const PlatformRequiredCompletionSurfaces = [
  'Document upload intent / complete upload / download / version flow',
  'Reports, report exports, report executions, custom report builder, saved reports, saved views, dashboard widgets and scheduled reports',
  'Communication templates, communication log, delivery details, notifications and current-user read commands',
  'Audit logs, global search, saved views, dashboard widgets and unified calendar read models',
  'Customer portal and vendor portal detail pages with linked-record scope',
  'SaaS billing, usage metrics, feature flags and module configuration admin pages',
] as const;
