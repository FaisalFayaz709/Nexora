export const M16_REPORTS_DASHBOARDS_SEARCH_CALENDAR_COMPLETION_POLICY =
  'M16_REPORTS_DASHBOARDS_SEARCH_CALENDAR_COMPLETION_POLICY' as const;

const sourcePermissionKeys: Record<string, string[]> = {
  EXECUTIVE_FINANCE: ['finance.view'],
  PROJECT_HEALTH: ['project.view'],
  PROCUREMENT_QUEUE: ['purchase_request.view', 'purchase_order.view'],
  INVENTORY_STOCK: ['inventory.view'],
  MAINTENANCE_SLA: ['maintenance.view', 'ticket.view'],
  FIELD_SERVICE: ['ticket.view', 'workorder.view'],
  CUSTOMERS: ['customer.view'],
  VENDORS: ['vendor.view'],
  PROJECTS: ['project.view'],
  PROCUREMENT: ['purchase_request.view'],
  INVENTORY: ['inventory.view'],
  ASSETS: ['asset.view'],
  FINANCE_AR: ['finance.view'],
  FINANCE_AP: ['finance.view'],
  HR_EMPLOYEES: ['employee.view'],
  AUDIT: ['audit.view'],
  CUSTOM_REPORT: [],
};

const allowedFieldsBySource: Record<string, string[]> = {
  CUSTOMERS: ['customerNo', 'name', 'status', 'type', 'createdAt'],
  VENDORS: ['vendorNo', 'name', 'status', 'riskRating', 'createdAt'],
  PROJECTS: ['projectNo', 'name', 'status', 'dueDate', 'completionPct', 'budgetTotal', 'actualCost', 'committedCost'],
  PROCUREMENT: ['purchaseRequestNo', 'purchaseOrderNo', 'vendorName', 'status', 'total', 'createdAt'],
  INVENTORY: ['sku', 'productName', 'warehouseName', 'availableQty', 'reservedQty', 'reorderLevel'],
  ASSETS: ['assetTag', 'serialNo', 'customerName', 'siteName', 'status', 'warrantyEndDate'],
  FIELD_SERVICE: ['ticketNo', 'workOrderNo', 'priority', 'status', 'slaDueAt', 'technicianName'],
  MAINTENANCE: ['maintenancePlanNo', 'assetTag', 'nextDueAt', 'status', 'result'],
  FINANCE_AR: ['invoiceNo', 'customerName', 'invoiceDate', 'dueDate', 'total', 'balance', 'status'],
  FINANCE_AP: ['supplierInvoiceNo', 'vendorName', 'invoiceDate', 'dueDate', 'total', 'balance', 'matchStatus'],
  HR_EMPLOYEES: ['employeeNo', 'fullName', 'departmentName', 'status', 'joiningDate'],
  AUDIT: ['actorUserId', 'action', 'subjectType', 'subjectId', 'createdAt'],
};

const forbiddenAsyncMutationMarkers = [
  'stock.',
  'inventory.post',
  'stocktransaction',
  'stockbalance',
  'payment.post',
  'paymentposting',
  'journal.post',
  'journalentry',
  'approval.approve',
  'approval.reject',
  'approvalstate',
  'invoicebalance',
] as const;

export interface M16PermissionContext {
  readonly organizationId: string;
  readonly branchId?: string | null;
  readonly userId?: string;
  readonly permissions: readonly string[];
}

export interface M16ScopedReadModelEntry {
  readonly organizationId: string;
  readonly branchId?: string | null;
  readonly permissionKey: string;
  readonly entityType: string;
  readonly entityId?: string;
  readonly title?: string;
}

export interface M16TimelineEntry {
  readonly organizationId: string;
  readonly branchId?: string | null;
  readonly permissionKey: string;
  readonly referenceType: string;
  readonly referenceId?: string;
  readonly occurredAt?: unknown;
  readonly title?: string;
}

export interface M16ReportScopedRecord {
  readonly organizationId: string;
  readonly permissionScope: readonly string[] | unknown;
  readonly ownerUserId?: string | null;
  readonly requestedById?: string | null;
  readonly status?: string;
  readonly exportDocumentId?: string | null;
}

export function normalizeM16PermissionScope(scope: readonly string[] | unknown): string[] {
  return Array.isArray(scope) ? scope.map(String).filter(Boolean) : [];
}

export function requiredPermissionsForM16Source(dataSource: string): string[] {
  return [...(sourcePermissionKeys[dataSource] ?? [])];
}

export function assertM16ActorHasPermissionScope(actorPermissions: readonly string[], permissionScope: readonly string[] | unknown): void {
  const scope = normalizeM16PermissionScope(permissionScope);
  if (scope.length === 0) {
    throw new Error('M16-SAVED-REPORT-SOURCE-PERMISSION-SCOPE violation: permissionScope cannot be empty.');
  }
  const missing = scope.filter((permission) => !actorPermissions.includes(permission));
  if (missing.length) {
    throw new Error(`M16-SAVED-REPORT-SOURCE-PERMISSION-SCOPE violation: actor missing ${missing.join(', ')}.`);
  }
}

export function assertM16DataSourcePermissionScope(dataSource: string, permissionScope: readonly string[] | unknown): void {
  const scope = normalizeM16PermissionScope(permissionScope);
  const required = requiredPermissionsForM16Source(dataSource);
  const missing = required.filter((permission) => !scope.includes(permission));
  if (missing.length) {
    throw new Error(`M16-DASHBOARD-WIDGET-SOURCE-SCOPE violation: ${dataSource} missing ${missing.join(', ')}.`);
  }
}

export function assertM16ReportReadAccess(context: M16PermissionContext, record: M16ReportScopedRecord): void {
  if (context.organizationId !== record.organizationId) {
    throw new Error('M16-REPORT-EXPORT-EXECUTION-SCOPE violation: report record is outside tenant scope.');
  }
  assertM16ActorHasPermissionScope(context.permissions, record.permissionScope);
}

export function canM16ViewReadModelEntry(context: M16PermissionContext, entry: M16ScopedReadModelEntry): boolean {
  if (context.organizationId !== entry.organizationId) return false;
  if (!context.permissions.includes(entry.permissionKey)) return false;
  if (context.branchId && entry.branchId && entry.branchId !== context.branchId) return false;
  return true;
}

export function assertM16GlobalSearchEntryVisibility(context: M16PermissionContext, entry: M16ScopedReadModelEntry): void {
  if (!entry.title || !entry.entityType || !entry.permissionKey) {
    throw new Error('M16-GLOBAL-SEARCH-TENANT-BRANCH-PERMISSION-SCOPE violation: search entry is incomplete.');
  }
  if (!canM16ViewReadModelEntry(context, entry)) {
    throw new Error('M16-GLOBAL-SEARCH-TENANT-BRANCH-PERMISSION-SCOPE violation: search entry is outside tenant, branch or permission scope.');
  }
}

export function assertM16CalendarItemVisibility(context: M16PermissionContext, entry: M16ScopedReadModelEntry & { startsAt?: unknown }): void {
  if (!entry.startsAt || !entry.title || !entry.permissionKey) {
    throw new Error('M16-CALENDAR-FEED-TENANT-BRANCH-PERMISSION-SCOPE violation: calendar item is incomplete.');
  }
  if (!canM16ViewReadModelEntry(context, entry)) {
    throw new Error('M16-CALENDAR-FEED-TENANT-BRANCH-PERMISSION-SCOPE violation: calendar item is outside tenant, branch or permission scope.');
  }
}

export function assertM16TimelineEntryVisibility(context: M16PermissionContext, entry: M16TimelineEntry): void {
  if (!entry.referenceType || !entry.permissionKey || !entry.occurredAt) {
    throw new Error('M16-ACTIVITY-TIMELINE-TENANT-PERMISSION-SCOPE violation: timeline entry is incomplete.');
  }
  if (!canM16ViewReadModelEntry(context, {
    organizationId: entry.organizationId,
    branchId: entry.branchId,
    permissionKey: entry.permissionKey,
    entityType: entry.referenceType,
    entityId: entry.referenceId,
    title: entry.title ?? entry.referenceType,
  })) {
    throw new Error('M16-ACTIVITY-TIMELINE-TENANT-PERMISSION-SCOPE violation: timeline entry is outside tenant, branch or permission scope.');
  }
}

export function assertM16ReportBuilderFieldAllowlist(dataSource: string, selectedFields: readonly string[]): void {
  const allowed = allowedFieldsBySource[dataSource];
  if (!allowed) {
    throw new Error(`M16-REPORT-BUILDER-FIELD-ALLOWLIST violation: unsupported report data source ${dataSource}.`);
  }
  const unexpected = selectedFields.filter((field) => !allowed.includes(field));
  if (unexpected.length) {
    throw new Error(`M16-REPORT-BUILDER-FIELD-ALLOWLIST violation: ${dataSource} cannot expose ${unexpected.join(', ')}.`);
  }
}

export function assertM16DashboardWidgetScope(input: { dataSource: string; permissionScope: readonly string[] | unknown; actorPermissions: readonly string[] }): void {
  assertM16DataSourcePermissionScope(input.dataSource, input.permissionScope);
  assertM16ActorHasPermissionScope(input.actorPermissions, input.permissionScope);
}

export function assertM16SavedViewScope(input: { entityType: string; permissionScope: readonly string[] | unknown; actorPermissions: readonly string[] }): void {
  if (!input.entityType.trim()) {
    throw new Error('M16-SAVED-VIEW-PERMISSION-SCOPE violation: saved view entity type is required.');
  }
  assertM16ActorHasPermissionScope(input.actorPermissions, input.permissionScope);
}

export function assertM16ReportExecutionDownloadGuard(input: M16PermissionContext & M16ReportScopedRecord): void {
  assertM16ReportReadAccess(input, input);
  if (input.status === 'COMPLETED' && !input.exportDocumentId) {
    throw new Error('M16-REPORT-DOWNLOAD-DOCUMENT-SCOPE violation: completed report execution requires export document scope evidence.');
  }
}

export function assertM16ScheduledReportSafety(input: { savedReportId: string; recipients: readonly string[]; permissionScope: readonly string[] | unknown; idempotencyKey?: string | null }): void {
  const scope = normalizeM16PermissionScope(input.permissionScope);
  if (!input.savedReportId || input.recipients.length === 0 || scope.length === 0) {
    throw new Error('M16-SCHEDULED-REPORT-RECIPIENT-IDEMPOTENCY violation: scheduled reports require saved report, recipients and permission scope.');
  }
  if (input.idempotencyKey !== undefined && input.idempotencyKey !== null && input.idempotencyKey.trim() === '') {
    throw new Error('M16-SCHEDULED-REPORT-RECIPIENT-IDEMPOTENCY violation: idempotency key cannot be blank.');
  }
}

export function assertM16ReadModelOnly(operationName: string): void {
  const lower = operationName.toLowerCase();
  if (forbiddenAsyncMutationMarkers.some((marker) => lower.includes(marker))) {
    throw new Error('M16-SEARCH-INDEX-CALENDAR-READMODEL-ONLY violation: dashboards/search/calendar/report exports cannot mutate critical operational state.');
  }
}

export function assertM16NoAsyncCriticalMutation(jobName: string, payload?: Record<string, unknown>): void {
  assertM16ReadModelOnly(jobName);
  const serialized = JSON.stringify(payload ?? {}).toLowerCase();
  if (forbiddenAsyncMutationMarkers.some((marker) => serialized.includes(marker))) {
    throw new Error('M16-NO-ASYNC-CRITICAL-MUTATION violation: reporting jobs cannot carry stock, money, journal, approval or invoice balance mutation payloads.');
  }
}

export const M16ReportDashboardControls = [
  'M16-SAVED-REPORT-SOURCE-PERMISSION-SCOPE',
  'M16-DASHBOARD-WIDGET-SOURCE-SCOPE',
  'M16-REPORT-EXPORT-EXECUTION-SCOPE',
  'M16-SCHEDULED-REPORT-RECIPIENT-IDEMPOTENCY',
  'M16-GLOBAL-SEARCH-TENANT-BRANCH-PERMISSION-SCOPE',
  'M16-CALENDAR-FEED-TENANT-BRANCH-PERMISSION-SCOPE',
  'M16-REPORT-BUILDER-FIELD-ALLOWLIST',
  'M16-SAVED-VIEW-PERMISSION-SCOPE',
  'M16-REPORT-DOWNLOAD-DOCUMENT-SCOPE',
  'M16-SEARCH-INDEX-CALENDAR-READMODEL-ONLY',
  'M16-NO-ASYNC-CRITICAL-MUTATION',
] as const;

export const M16ReportDashboardRuntimeCertificationScenarios = [
  'M16-RUNTIME-DASHBOARD-WIDGETS-PERMISSION-FILTERED',
  'M16-RUNTIME-SAVED-REPORT-CANNOT-WEAKEN-SOURCE-SCOPE',
  'M16-RUNTIME-REPORT-EXPORT-CREATES-AUDITED-EXECUTION',
  'M16-RUNTIME-SCHEDULED-REPORT-IDEMPOTENT-AND-RECIPIENT-SCOPED',
  'M16-RUNTIME-GLOBAL-SEARCH-DENIES-CROSS-TENANT-BRANCH-ENTRY',
  'M16-RUNTIME-CALENDAR-DENIES-CROSS-BRANCH-ENTRY',
  'M16-RUNTIME-ACTIVITY-TIMELINE-DENIES-CROSS-TENANT-BRANCH-ENTRY',
  'M16-RUNTIME-REPORT-BUILDER-FIELD-ALLOWLIST-ENFORCED',
  'M16-RUNTIME-SAVED-VIEW-CANNOT-BYPASS-RBAC',
  'M16-RUNTIME-REPORT-DOWNLOAD-DOCUMENT-TENANT-SCOPED',
  'M16-RUNTIME-REPORT-JOBS-READMODEL-ONLY-NO-CRITICAL-MUTATION',
] as const;

export function assertM16ReportDashboardCompletionMatrix(matrix: readonly { controlId: string; sourceEvidence: boolean; runtimeScenario: boolean }[]): void {
  for (const control of M16ReportDashboardControls) {
    const row = matrix.find((item) => item.controlId === control);
    if (!row?.sourceEvidence || !row.runtimeScenario) {
      throw new Error(`M16-REPORTS-DASHBOARDS-COMPLETION-MATRIX violation: ${control} missing source evidence or runtime scenario.`);
    }
  }
}
