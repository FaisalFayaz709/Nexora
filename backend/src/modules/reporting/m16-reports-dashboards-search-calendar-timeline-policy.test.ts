import { describe, expect, it } from 'vitest';
import {
  M16ReportDashboardControls,
  M16ReportDashboardRuntimeCertificationScenarios,
  assertM16CalendarItemVisibility,
  assertM16DashboardWidgetScope,
  assertM16GlobalSearchEntryVisibility,
  assertM16NoAsyncCriticalMutation,
  assertM16ReportBuilderFieldAllowlist,
  assertM16ReportDashboardCompletionMatrix,
  assertM16ReportExecutionDownloadGuard,
  assertM16SavedViewScope,
  assertM16ScheduledReportSafety,
  assertM16TimelineEntryVisibility,
} from '../../core/compliance/report-dashboard-completion-policy.js';

describe('M16 reports, dashboards, search, calendar and timeline completion controls', () => {
  const context = { organizationId: 'org-a', branchId: 'branch-a', userId: 'user-a', permissions: ['project.view', 'report.view', 'report.export'] };

  it('keeps dashboards and saved reports within source permission scope', () => {
    expect(() => assertM16DashboardWidgetScope({ dataSource: 'PROJECTS', permissionScope: ['project.view'], actorPermissions: context.permissions })).not.toThrow();
    expect(() => assertM16DashboardWidgetScope({ dataSource: 'PROJECTS', permissionScope: ['finance.view'], actorPermissions: context.permissions })).toThrow('M16-DASHBOARD-WIDGET-SOURCE-SCOPE');
  });

  it('keeps global search, calendar and activity timeline entries tenant/branch/permission scoped', () => {
    const entry = { organizationId: 'org-a', branchId: 'branch-a', permissionKey: 'project.view', entityType: 'Project', entityId: 'project-1', title: 'Project PRJ-1', startsAt: '2026-09-20T10:00:00.000Z' };
    expect(() => assertM16GlobalSearchEntryVisibility(context, entry)).not.toThrow();
    expect(() => assertM16CalendarItemVisibility(context, entry)).not.toThrow();
    expect(() => assertM16TimelineEntryVisibility(context, { ...entry, referenceType: 'Project', referenceId: 'project-1', occurredAt: entry.startsAt })).not.toThrow();
    expect(() => assertM16TimelineEntryVisibility(context, { ...entry, organizationId: 'org-b', referenceType: 'Project', occurredAt: entry.startsAt })).toThrow('M16-ACTIVITY-TIMELINE-TENANT-PERMISSION-SCOPE');
  });

  it('guards report builder fields, scheduled report recipients and export downloads', () => {
    expect(() => assertM16ReportBuilderFieldAllowlist('PROJECTS', ['projectNo', 'status', 'actualCost'])).not.toThrow();
    expect(() => assertM16ReportBuilderFieldAllowlist('PROJECTS', ['passwordHash'])).toThrow('M16-REPORT-BUILDER-FIELD-ALLOWLIST');
    expect(() => assertM16ScheduledReportSafety({ savedReportId: 'saved-1', recipients: ['manager@example.com'], permissionScope: ['project.view'], idempotencyKey: 'saved-1:daily:2026-09-20' })).not.toThrow();
    expect(() => assertM16ReportExecutionDownloadGuard({ ...context, permissionScope: ['project.view'], status: 'COMPLETED', exportDocumentId: 'doc-1' })).not.toThrow();
  });

  it('keeps report/search/calendar jobs read-model only with no critical async mutation payloads', () => {
    expect(() => assertM16NoAsyncCriticalMutation('report.export', { savedReportId: 'saved-1' })).not.toThrow();
    expect(() => assertM16NoAsyncCriticalMutation('report.export', { paymentPosting: true })).toThrow('M16-NO-ASYNC-CRITICAL-MUTATION');
  });

  it('records complete source and runtime evidence for every M16 control', () => {
    expect(M16ReportDashboardRuntimeCertificationScenarios.length).toBeGreaterThanOrEqual(10);
    expect(() => assertM16ReportDashboardCompletionMatrix(M16ReportDashboardControls.map((controlId) => ({ controlId, sourceEvidence: true, runtimeScenario: true })))).not.toThrow();
    expect(() => assertM16SavedViewScope({ entityType: 'Project', permissionScope: ['project.view'], actorPermissions: context.permissions })).not.toThrow();
  });
});
