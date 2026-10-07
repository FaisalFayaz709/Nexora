import { describe, expect, it } from 'vitest';
import {
  assertCalendarVisibility,
  assertDashboardWidgetScope,
  assertGlobalSearchVisibility,
  assertNoAsyncCriticalStockMoneyApprovalMutation,
  assertReadModelOnly,
  assertReportExportFormat,
  assertSavedReportPermissionScope,
  assertScheduledReportSafety,
} from './reports-dashboards-policy.js';

describe('C13 reports, dashboards, search and calendar policy', () => {
  it('requires dashboard widgets to preserve source permission scope', () => {
    expect(() => assertDashboardWidgetScope({ role: 'FINANCE', dataSource: 'EXECUTIVE_FINANCE', permissionScope: ['finance.view'] })).not.toThrow();
    expect(() => assertDashboardWidgetScope({ role: 'FINANCE', dataSource: 'EXECUTIVE_FINANCE', permissionScope: ['project.view'] })).toThrow('C13-ROLE-DASHBOARDS-PERMISSION-FILTERED');
  });

  it('requires saved reports to keep sensitive data permissions', () => {
    expect(() => assertSavedReportPermissionScope('FINANCE_AR', ['finance.view'])).not.toThrow();
    expect(() => assertSavedReportPermissionScope('FINANCE_AR', ['report.view'])).toThrow('C13-SENSITIVE-FIELDS-REQUIRE-SOURCE-PERMISSIONS');
  });

  it('permits only blueprint export formats', () => {
    expect(assertReportExportFormat('pdf')).toBe('PDF');
    expect(assertReportExportFormat('xlsx')).toBe('XLSX');
    expect(assertReportExportFormat('csv')).toBe('CSV');
    expect(() => assertReportExportFormat('html')).toThrow('C13-REPORT-EXPORT-PDF-XLSX-CSV-VIA-BULLMQ');
  });

  it('keeps scheduled reports auditable and idempotent', () => {
    expect(() => assertScheduledReportSafety({ savedReportId: 'r1', recipients: ['ops@example.com'], permissionScope: ['report.view'], idempotencyKey: 'sr-1' })).not.toThrow();
    expect(() => assertScheduledReportSafety({ savedReportId: 'r1', recipients: [], permissionScope: ['report.view'] })).toThrow('C13-SCHEDULED-REPORTS-AUDITABLE-AND-IDEMPOTENT');
  });

  it('guards search and calendar visibility by tenant, permission and branch', () => {
    const context = { organizationId: 'org-a', branchId: 'branch-a', permissions: ['project.view'] };
    const projectEvent = { organizationId: 'org-a', branchId: 'branch-a', permissionKey: 'project.view', entityType: 'ProjectDeadline' };
    expect(() => assertGlobalSearchVisibility(context, projectEvent)).not.toThrow();
    expect(() => assertCalendarVisibility(context, projectEvent)).not.toThrow();
    expect(() => assertCalendarVisibility(context, { ...projectEvent, branchId: 'branch-b' })).toThrow('C13-CALENDAR-BRANCH-PERMISSION-FILTERED');
    expect(() => assertGlobalSearchVisibility(context, { ...projectEvent, organizationId: 'org-b' })).toThrow('C13-GLOBAL-SEARCH-PERMISSION-TENANT-SCOPED');
  });

  it('prevents reporting/search/calendar jobs from mutating critical state', () => {
    expect(() => assertReadModelOnly('search.index.refresh')).not.toThrow();
    expect(() => assertReadModelOnly('payment.post')).toThrow('C13-SEARCH-CALENDAR-INDEXES-ARE-DERIVED-READ-MODELS');
    expect(() => assertNoAsyncCriticalStockMoneyApprovalMutation('report.export')).not.toThrow();
    expect(() => assertNoAsyncCriticalStockMoneyApprovalMutation('stock.adjustment.post')).toThrow('C13-NO-ASYNC-CRITICAL-STOCK-MONEY-APPROVAL-MUTATION');
  });
});
