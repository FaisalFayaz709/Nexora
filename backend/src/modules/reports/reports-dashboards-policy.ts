export const C13_REPORTS_DASHBOARDS_SEARCH_CALENDAR_POLICY = 'C13_REPORTS_DASHBOARDS_SEARCH_CALENDAR_POLICY' as const;

const dashboardScopes: Record<string, string[]> = {
  CEO: ['finance.view', 'project.view', 'inventory.view', 'ticket.view'],
  FINANCE: ['finance.view'],
  PROJECT: ['project.view'],
  PROCUREMENT: ['purchase_request.view', 'purchase_order.view', 'vendor.view'],
  WAREHOUSE: ['inventory.view'],
  MAINTENANCE: ['maintenance.view', 'ticket.view', 'workorder.view'],
  CUSTOM: [],
};

const dataSourceScopes: Record<string, string[]> = {
  EXECUTIVE_FINANCE: ['finance.view'],
  PROJECT_HEALTH: ['project.view'],
  PROCUREMENT_QUEUE: ['purchase_request.view', 'purchase_order.view'],
  INVENTORY_STOCK: ['inventory.view'],
  MAINTENANCE_SLA: ['maintenance.view', 'ticket.view'],
  FIELD_SERVICE: ['ticket.view', 'workorder.view'],
  CUSTOM_REPORT: [],
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
};

export interface PermissionContext {
  readonly organizationId: string;
  readonly branchId?: string | null;
  readonly permissions: readonly string[];
}

export interface SearchCalendarEntry {
  readonly organizationId: string;
  readonly branchId?: string | null;
  readonly permissionKey: string;
  readonly entityType: string;
}

function missing(required: readonly string[], actual: readonly string[]): string[] {
  return required.filter((key) => !actual.includes(key));
}

export function assertDashboardPermissionScope(role: string, permissionScope: readonly string[]): void {
  const required = dashboardScopes[role] ?? [];
  const absent = missing(required, permissionScope);
  if (absent.length) {
    throw new Error(`C13-ROLE-DASHBOARDS-PERMISSION-FILTERED violation: dashboard role ${role} missing ${absent.join(', ')}.`);
  }
}

export function assertDashboardWidgetScope(input: { role: string; dataSource: string; permissionScope: readonly string[] }): void {
  assertDashboardPermissionScope(input.role, input.permissionScope);
  assertSensitiveFieldScope(input.dataSource, input.permissionScope);
}

export function assertSavedReportPermissionScope(dataSource: string, permissionScope: readonly string[]): void {
  assertSensitiveFieldScope(dataSource, permissionScope);
  if (!permissionScope.length) {
    throw new Error('C13-SAVED-REPORTS-STORE-PERMISSION-SCOPE violation: saved report must persist permission scope.');
  }
}

export function assertSensitiveFieldScope(dataSource: string, permissionScope: readonly string[]): void {
  const required = dataSourceScopes[dataSource] ?? [];
  const absent = missing(required, permissionScope);
  if (absent.length) {
    throw new Error(`C13-SENSITIVE-FIELDS-REQUIRE-SOURCE-PERMISSIONS violation: ${dataSource} missing ${absent.join(', ')}.`);
  }
}

export function assertReportExportFormat(format: string): 'PDF' | 'XLSX' | 'CSV' {
  const normalized = format.toUpperCase();
  if (normalized !== 'PDF' && normalized !== 'XLSX' && normalized !== 'CSV') {
    throw new Error('C13-REPORT-EXPORT-PDF-XLSX-CSV-VIA-BULLMQ violation: unsupported report export format.');
  }
  return normalized;
}

export function assertScheduledReportSafety(input: { savedReportId: string; recipients: readonly string[]; permissionScope: readonly string[]; idempotencyKey?: string }): void {
  if (!input.savedReportId || input.recipients.length === 0 || input.permissionScope.length === 0) {
    throw new Error('C13-SCHEDULED-REPORTS-AUDITABLE-AND-IDEMPOTENT violation: scheduled reports require saved report, recipients and permission scope.');
  }
  if (input.idempotencyKey !== undefined && input.idempotencyKey.trim() === '') {
    throw new Error('C13-SCHEDULED-REPORTS-AUDITABLE-AND-IDEMPOTENT violation: idempotency key cannot be blank.');
  }
}

export function canViewSearchEntry(context: PermissionContext, entry: SearchCalendarEntry): boolean {
  return context.organizationId === entry.organizationId && context.permissions.includes(entry.permissionKey);
}

export function canViewCalendarItem(context: PermissionContext, entry: SearchCalendarEntry): boolean {
  if (!canViewSearchEntry(context, entry)) return false;
  if (!context.branchId) return true;
  return entry.branchId === null || entry.branchId === undefined || entry.branchId === context.branchId;
}

export function assertGlobalSearchVisibility(context: PermissionContext, entry: SearchCalendarEntry): void {
  if (!canViewSearchEntry(context, entry)) {
    throw new Error('C13-GLOBAL-SEARCH-PERMISSION-TENANT-SCOPED violation: search entry is outside tenant or permission scope.');
  }
}

export function assertCalendarVisibility(context: PermissionContext, entry: SearchCalendarEntry): void {
  if (!canViewCalendarItem(context, entry)) {
    throw new Error('C13-CALENDAR-BRANCH-PERMISSION-FILTERED violation: calendar entry is outside tenant, branch or permission scope.');
  }
}

export function assertReadModelOnly(operation: string): void {
  const unsafe = ['stock.', 'inventory.post', 'payment.post', 'journal.post', 'approval.approve', 'approval.reject'];
  if (unsafe.some((marker) => operation.toLowerCase().includes(marker))) {
    throw new Error('C13-SEARCH-CALENDAR-INDEXES-ARE-DERIVED-READ-MODELS violation: reporting/search/calendar read models cannot perform critical mutations.');
  }
}

export function assertNoAsyncCriticalStockMoneyApprovalMutation(jobName: string): void {
  const lower = jobName.toLowerCase();
  if (lower.includes('stock') || lower.includes('payment') || lower.includes('journal') || lower.includes('approval')) {
    throw new Error('C13-NO-ASYNC-CRITICAL-STOCK-MONEY-APPROVAL-MUTATION violation: BullMQ report jobs cannot mutate stock, money, journal or approval state.');
  }
}
