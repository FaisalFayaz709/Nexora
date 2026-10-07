import { z } from 'zod';

export const C13_REPORTS_DASHBOARDS_SEARCH_CALENDAR = 'C13_REPORTS_DASHBOARDS_SEARCH_CALENDAR' as const;

export const DashboardRoleSchema = z.enum([
  'CEO',
  'FINANCE',
  'PROJECT',
  'PROCUREMENT',
  'WAREHOUSE',
  'MAINTENANCE',
  'CUSTOM',
]);

export const ReportRuntimeControlIds = [
  'C13-ROLE-DASHBOARDS-PERMISSION-FILTERED',
  'C13-REPORT-EXPORT-PDF-XLSX-CSV-VIA-BULLMQ',
  'C13-GLOBAL-SEARCH-PERMISSION-TENANT-SCOPED',
  'C13-CALENDAR-BRANCH-PERMISSION-FILTERED',
  'C13-SAVED-REPORTS-STORE-PERMISSION-SCOPE',
  'C13-SCHEDULED-REPORTS-AUDITABLE-AND-IDEMPOTENT',
  'C13-DASHBOARD-WIDGETS-CANNOT-BYPASS-RBAC',
  'C13-SENSITIVE-FIELDS-REQUIRE-SOURCE-PERMISSIONS',
  'C13-SEARCH-CALENDAR-INDEXES-ARE-DERIVED-READ-MODELS',
  'C13-NO-ASYNC-CRITICAL-STOCK-MONEY-APPROVAL-MUTATION',
] as const;

export type ReportRuntimeControlId = (typeof ReportRuntimeControlIds)[number];

export const ReportDataSourceForDashboardSchema = z.enum([
  'EXECUTIVE_FINANCE',
  'PROJECT_HEALTH',
  'PROCUREMENT_QUEUE',
  'INVENTORY_STOCK',
  'MAINTENANCE_SLA',
  'FIELD_SERVICE',
  'CUSTOM_REPORT',
]);

export const DashboardWidgetDefinitionSchema = z.object({
  role: DashboardRoleSchema,
  title: z.string().min(1).max(200),
  widgetType: z.enum(['KPI', 'TABLE', 'BAR', 'LINE', 'PIE', 'TIMELINE', 'CALENDAR']),
  dataSource: ReportDataSourceForDashboardSchema,
  permissionScope: z.array(z.string().min(1).max(160)).min(1).max(25),
});

export const GlobalSearchIndexSubjectSchema = z.enum([
  'Employee',
  'Customer',
  'Vendor',
  'Project',
  'Asset',
  'Invoice',
  'PurchaseOrder',
  'Ticket',
  'WorkOrder',
  'Document',
]);

export const CalendarSubjectSchema = z.enum([
  'ProjectDeadline',
  'MaintenanceDue',
  'EmployeeLeave',
  'SiteVisit',
  'WorkOrder',
  'ContractExpiry',
  'Meeting',
  'PaymentDeadline',
]);

export const ReportsDashboardsSearchCalendarManifest = {
  pass: 'C13',
  name: 'Reports, Dashboards, Global Search and Calendar',
  controls: ReportRuntimeControlIds,
  dashboards: ['CEO', 'Finance', 'Project', 'Procurement', 'Warehouse', 'Maintenance', 'Custom'],
  reportExports: ['PDF', 'XLSX', 'CSV'],
  globalSearchSubjects: GlobalSearchIndexSubjectSchema.options,
  calendarSubjects: CalendarSubjectSchema.options,
  asyncBoundary: 'BullMQ may generate exports and scheduled report deliveries only after committed report execution state.',
  criticalMutationBoundary: 'Reports/search/calendar are read models and exports; they must never mutate stock, money, approval state or accounting postings.',
} as const;

export const DashboardQuerySchema = z.object({
  role: DashboardRoleSchema.default('CUSTOM'),
  branchId: z.string().uuid().optional(),
});

export const SavedViewDefinitionSchema = z.object({
  entityType: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  columns: z.array(z.string().min(1).max(120)).min(1).max(100),
  filterJson: z.record(z.string(), z.unknown()).default({}),
  sortJson: z.record(z.string(), z.unknown()).optional(),
  permissionScope: z.array(z.string().min(1).max(160)).min(1).max(50),
});
