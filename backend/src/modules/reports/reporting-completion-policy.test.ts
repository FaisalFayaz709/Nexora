import { describe, expect, it } from 'vitest';
import {
  M16ReportDashboardControls,
  assertM16ActorHasPermissionScope,
  assertM16CalendarItemVisibility,
  assertM16DashboardWidgetScope,
  assertM16DataSourcePermissionScope,
  assertM16GlobalSearchEntryVisibility,
  assertM16NoAsyncCriticalMutation,
  assertM16ReadModelOnly,
  assertM16ReportBuilderFieldAllowlist,
  assertM16ReportDashboardCompletionMatrix,
  assertM16ReportExecutionDownloadGuard,
  assertM16SavedViewScope,
  assertM16ScheduledReportSafety,
} from './reporting-completion-policy.js';

describe('M16 reports, dashboards, global search and calendar completion policy', () => {
  const context = { organizationId: '11111111-1111-4111-8111-111111111111', branchId: '22222222-2222-4222-8222-222222222222', userId: '33333333-3333-4333-8333-333333333333', permissions: ['project.view', 'report.view', 'report.export'] };

  it('M16-SAVED-REPORT-SOURCE-PERMISSION-SCOPE requires actor to own saved report permissions', () => {
    expect(() => assertM16ActorHasPermissionScope(context.permissions, ['project.view'])).not.toThrow();
    expect(() => assertM16ActorHasPermissionScope(context.permissions, ['finance.view'])).toThrow('M16-SAVED-REPORT-SOURCE-PERMISSION-SCOPE');
  });

  it('M16-DASHBOARD-WIDGET-SOURCE-SCOPE keeps data source permission scope', () => {
    expect(() => assertM16DataSourcePermissionScope('PROJECTS', ['project.view'])).not.toThrow();
    expect(() => assertM16DashboardWidgetScope({ dataSource: 'FINANCE_AR', permissionScope: ['finance.view'], actorPermissions: context.permissions })).toThrow('M16-SAVED-REPORT-SOURCE-PERMISSION-SCOPE');
  });

  it('M16-GLOBAL-SEARCH and M16-CALENDAR enforce tenant, branch and permission visibility', () => {
    expect(() => assertM16GlobalSearchEntryVisibility(context, { organizationId: context.organizationId, branchId: context.branchId, permissionKey: 'project.view', entityType: 'Project', title: 'HQ Rollout' })).not.toThrow();
    expect(() => assertM16CalendarItemVisibility(context, { organizationId: context.organizationId, branchId: context.branchId, permissionKey: 'project.view', entityType: 'ProjectDeadline', title: 'Handover', startsAt: new Date() })).not.toThrow();
    expect(() => assertM16GlobalSearchEntryVisibility(context, { organizationId: '44444444-4444-4444-8444-444444444444', branchId: context.branchId, permissionKey: 'project.view', entityType: 'Project', title: 'Other Tenant' })).toThrow('M16-GLOBAL-SEARCH-TENANT-BRANCH-PERMISSION-SCOPE');
    expect(() => assertM16CalendarItemVisibility(context, { organizationId: context.organizationId, branchId: '55555555-5555-4555-8555-555555555555', permissionKey: 'project.view', entityType: 'ProjectDeadline', title: 'Wrong Branch', startsAt: new Date() })).toThrow('M16-CALENDAR-FEED-TENANT-BRANCH-PERMISSION-SCOPE');
  });

  it('M16-REPORT-BUILDER-FIELD-ALLOWLIST blocks hidden/sensitive fields', () => {
    expect(() => assertM16ReportBuilderFieldAllowlist('PROJECTS', ['projectNo', 'status', 'actualCost'])).not.toThrow();
    expect(() => assertM16ReportBuilderFieldAllowlist('PROJECTS', ['projectNo', 'passwordHash'])).toThrow('M16-REPORT-BUILDER-FIELD-ALLOWLIST');
  });

  it('M16-SAVED-VIEW and scheduled report controls keep scope and recipients', () => {
    expect(() => assertM16SavedViewScope({ entityType: 'Project', permissionScope: ['project.view'], actorPermissions: context.permissions })).not.toThrow();
    expect(() => assertM16ScheduledReportSafety({ savedReportId: 'report-1', recipients: ['ops@example.com'], permissionScope: ['project.view'], idempotencyKey: 'schedule-project-health' })).not.toThrow();
    expect(() => assertM16ScheduledReportSafety({ savedReportId: 'report-1', recipients: [], permissionScope: ['project.view'] })).toThrow('M16-SCHEDULED-REPORT-RECIPIENT-IDEMPOTENCY');
  });

  it('M16-REPORT-DOWNLOAD-DOCUMENT-SCOPE requires completed exports to have document evidence', () => {
    expect(() => assertM16ReportExecutionDownloadGuard({ ...context, organizationId: context.organizationId, permissionScope: ['project.view'], status: 'COMPLETED', exportDocumentId: '66666666-6666-4666-8666-666666666666' })).not.toThrow();
    expect(() => assertM16ReportExecutionDownloadGuard({ ...context, organizationId: context.organizationId, permissionScope: ['project.view'], status: 'COMPLETED' })).toThrow('M16-REPORT-DOWNLOAD-DOCUMENT-SCOPE');
  });

  it('M16 read models and async report jobs cannot mutate critical state', () => {
    expect(() => assertM16ReadModelOnly('search.index.refresh')).not.toThrow();
    expect(() => assertM16ReadModelOnly('payment.post')).toThrow('M16-SEARCH-INDEX-CALENDAR-READMODEL-ONLY');
    expect(() => assertM16NoAsyncCriticalMutation('report.export', { savedReportId: 'x' })).not.toThrow();
    expect(() => assertM16NoAsyncCriticalMutation('report.export', { journalEntry: { debit: 1 } })).toThrow('M16-NO-ASYNC-CRITICAL-MUTATION');
  });

  it('M16 report completion matrix requires source and runtime scenario evidence for all controls', () => {
    expect(() => assertM16ReportDashboardCompletionMatrix(M16ReportDashboardControls.map((controlId) => ({ controlId, sourceEvidence: true, runtimeScenario: true })))).not.toThrow();
    expect(() => assertM16ReportDashboardCompletionMatrix([{ controlId: M16ReportDashboardControls[0], sourceEvidence: true, runtimeScenario: false }])).toThrow('M16-REPORTS-DASHBOARDS-COMPLETION-MATRIX');
  });
});
