import { z } from 'zod';
import { IsoDateSchema, IsoDateTimeSchema, UuidSchema } from '../common';

export const MISSING_PASS_M16_SOURCE_PREFLIGHT_REPORTS_DASHBOARDS_SEARCH_CALENDAR_COMPLETION =
  'MISSING_PASS_M16_SOURCE_PREFLIGHT_REPORTS_DASHBOARDS_SEARCH_CALENDAR_COMPLETION' as const;

export const ReportDashboardCompletionSubjects = [
  'ROLE_DASHBOARD_PERMISSION_FILTERED',
  'DASHBOARD_WIDGET_SOURCE_SCOPE',
  'SAVED_REPORT_SOURCE_PERMISSION_SCOPE',
  'REPORT_EXPORT_EXECUTION_SCOPE',
  'SCHEDULED_REPORT_RECIPIENT_IDEMPOTENCY',
  'GLOBAL_SEARCH_TENANT_BRANCH_PERMISSION_SCOPE',
  'SEARCH_INDEX_ENTRY_DERIVED_READ_MODEL',
  'CALENDAR_FEED_TENANT_BRANCH_PERMISSION_SCOPE',
  'SAVED_VIEW_PERMISSION_SCOPE',
  'REPORT_BUILDER_FIELD_ALLOWLIST',
  'REPORT_DOWNLOAD_DOCUMENT_SCOPE',
  'NO_ASYNC_CRITICAL_MUTATION',
] as const;

export type ReportDashboardCompletionSubject = (typeof ReportDashboardCompletionSubjects)[number];

export const ReportDashboardCompletionRoutes = [
  'GET /api/v1/reports',
  'GET /api/v1/reports/:id',
  'POST /api/v1/reports/exports',
  'GET /api/v1/reports/exports/:jobId',
  'POST /api/v1/report-templates',
  'POST /api/v1/saved-reports',
  'POST /api/v1/scheduled-reports',
  'GET /api/v1/report-executions/:id',
  'GET /api/v1/search',
  'GET /api/v1/calendar',
] as const;

export const ReportDashboardCompletionInvariants = [
  'Dashboards are read-only compositions over permission-filtered report/search/calendar data.',
  'Saved reports and dashboard widgets persist the source permission scope and cannot weaken it.',
  'Report exports create committed ReportExecution rows before BullMQ delivery starts.',
  'Global search entries are derived read models and remain tenant, branch and permission scoped.',
  'Calendar feed items are derived read models and remain tenant, branch, date-range and permission scoped.',
  'Report builder selected fields must come from an allowlist for the selected data source.',
  'Report export download documents must remain protected by tenant and permission scope.',
  'Reports, dashboards, global search and calendar must never mutate stock, money, approval or journal state asynchronously.',
] as const;

export const ReportDashboardCompletionScenarioIdSchema = z.enum([
  'M16-RUNTIME-DASHBOARD-WIDGETS-PERMISSION-FILTERED',
  'M16-RUNTIME-SAVED-REPORT-CANNOT-WEAKEN-SOURCE-SCOPE',
  'M16-RUNTIME-REPORT-EXPORT-CREATES-AUDITED-EXECUTION',
  'M16-RUNTIME-SCHEDULED-REPORT-IDEMPOTENT-AND-RECIPIENT-SCOPED',
  'M16-RUNTIME-GLOBAL-SEARCH-DENIES-CROSS-TENANT-BRANCH-ENTRY',
  'M16-RUNTIME-CALENDAR-DENIES-CROSS-BRANCH-ENTRY',
  'M16-RUNTIME-REPORT-BUILDER-FIELD-ALLOWLIST-ENFORCED',
  'M16-RUNTIME-SAVED-VIEW-CANNOT-BYPASS-RBAC',
  'M16-RUNTIME-REPORT-DOWNLOAD-DOCUMENT-TENANT-SCOPED',
  'M16-RUNTIME-REPORT-JOBS-READMODEL-ONLY-NO-CRITICAL-MUTATION',
]);

export const ReportDashboardRuntimeScenarios = ReportDashboardCompletionScenarioIdSchema.options;

export const ReportDashboardPermissionContextSchema = z.object({
  organizationId: UuidSchema,
  branchId: UuidSchema.nullable().optional(),
  userId: UuidSchema,
  permissions: z.array(z.string().min(1).max(160)).min(1).max(200),
});

export const SearchIndexEntryCompletionSchema = z.object({
  organizationId: UuidSchema,
  branchId: UuidSchema.nullable().optional(),
  entityType: z.string().min(1).max(120),
  entityId: UuidSchema,
  title: z.string().min(1).max(300),
  searchText: z.string().min(1).max(4000),
  permissionKey: z.string().min(1).max(160),
  routePath: z.string().min(1).max(300).optional(),
});

export const CalendarFeedItemCompletionSchema = z.object({
  organizationId: UuidSchema,
  branchId: UuidSchema.nullable().optional(),
  entityType: z.string().min(1).max(120),
  entityId: UuidSchema,
  title: z.string().min(1).max(300),
  startsAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema.optional(),
  permissionKey: z.string().min(1).max(160),
});

export const ReportExecutionDownloadGuardSchema = z.object({
  organizationId: UuidSchema,
  reportExecutionId: UuidSchema,
  exportDocumentId: UuidSchema.optional(),
  permissionScope: z.array(z.string().min(1).max(160)).min(1).max(50),
  requestedById: UuidSchema.optional(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']),
});

export const DashboardRuntimeQuerySchema = z.object({
  role: z.enum(['CEO', 'FINANCE', 'PROJECT', 'PROCUREMENT', 'WAREHOUSE', 'MAINTENANCE', 'CUSTOM']).default('CUSTOM'),
  branchId: UuidSchema.optional(),
  asOfDate: IsoDateSchema.optional(),
});

export const SavedViewCompletionSchema = z.object({
  entityType: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  columns: z.array(z.string().min(1).max(120)).min(1).max(100),
  filterJson: z.record(z.string(), z.unknown()).default({}),
  sortJson: z.record(z.string(), z.unknown()).optional(),
  permissionScope: z.array(z.string().min(1).max(160)).min(1).max(50),
  isDefault: z.boolean().default(false),
});

export const ReportDashboardCompletionRows = ReportDashboardCompletionSubjects.map((subject) => ({
  subject,
  sourcePreflightRequired: true,
  runtimeCertificationRequired: true,
  tenantScoped: true,
  permissionScoped: true,
  readModelOnly: subject.includes('SEARCH') || subject.includes('CALENDAR') || subject.includes('DASHBOARD'),
}));

export const ReportDashboardCompletionManifest = {
  pass: 'M16',
  name: 'Reports, Dashboards, Global Search and Calendar Completion',
  sourcePreflight: MISSING_PASS_M16_SOURCE_PREFLIGHT_REPORTS_DASHBOARDS_SEARCH_CALENDAR_COMPLETION,
  routes: ReportDashboardCompletionRoutes,
  subjects: ReportDashboardCompletionSubjects,
  invariants: ReportDashboardCompletionInvariants,
  runtimeScenarios: ReportDashboardRuntimeScenarios,
  asyncBoundary: 'BullMQ may render/export/deliver reports only after committed ReportExecution state; it must not mutate stock, money, approval or journal state.',
  criticalMutationBoundary: 'Dashboards, search, calendar, report builder and exports are read-model/reporting workflows only.',
} as const;
