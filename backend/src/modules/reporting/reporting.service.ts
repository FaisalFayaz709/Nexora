import { withTransaction } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { BusinessEventWriter } from '../../core/events/business-event-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { ReportingRepository } from './reporting.repository.js';
import { assertM16NoAsyncCriticalMutation, assertM16ReportReadAccess } from '../../core/compliance/report-dashboard-completion-policy.js';

function page(query: { page?: number; pageSize?: number }) { const current=query.page??1; const pageSize=Math.min(query.pageSize??25,100); return {page:current,pageSize,skip:(current-1)*pageSize,take:pageSize}; }

export class ReportingService {
  constructor(private readonly access: PlatformAccessFacade, private readonly repository = new ReportingRepository(), private readonly audit = new AuditWriter(), private readonly events = new BusinessEventWriter()) {}
  private async enabled(organizationId: string) { await this.access.assertModuleEnabled(organizationId, 'reports'); }
  async list(tenant: TenantRequestContext, actor: { userId: string; permissions?: string[] }, query: any) {
    await this.enabled(tenant.organizationId);
    const p = page(query);
    const permissions = actor.permissions ?? [];
    const { rows, total } = await this.repository.listReports(tenant.organizationId, actor.userId, query, p.skip, p.take);
    const visibleRows = rows.filter((row: any) => {
      try { assertM16ReportReadAccess({ organizationId: tenant.organizationId, branchId: tenant.branchId, userId: actor.userId, permissions }, row); return true; }
      catch { return false; }
    });
    return { rows: visibleRows, total: Math.min(total, visibleRows.length), page: p.page, pageSize: p.pageSize };
  }
  async detail(tenant: TenantRequestContext, actor: { userId: string; permissions?: string[] }, id: string) {
    await this.enabled(tenant.organizationId);
    const row = await this.repository.getReport(tenant.organizationId, id);
    if (!row) throw new AppError(404, 'REPORT_NOT_FOUND', 'Report not found.');
    try {
      assertM16ReportReadAccess({ organizationId: tenant.organizationId, branchId: tenant.branchId, userId: actor.userId, permissions: actor.permissions ?? [] }, row);
    } catch (error) {
      throw new AppError(403, 'REPORT_PERMISSION_SCOPE_DENIED', error instanceof Error ? error.message : 'Report permission scope denied.');
    }
    return row;
  }
  async requestExport(tenant: TenantRequestContext, actor: { userId: string; ip: string | null; permissions?: string[] }, input: any) {
    await this.enabled(tenant.organizationId);
    const report = await this.repository.getReport(tenant.organizationId, input.reportId);
    if (!report) throw new AppError(404, 'REPORT_NOT_FOUND', 'Report not found.');
    try {
      assertM16ReportReadAccess({ organizationId: tenant.organizationId, branchId: tenant.branchId, userId: actor.userId, permissions: actor.permissions ?? [] }, report);
      assertM16NoAsyncCriticalMutation('report.export', input.filterJson ?? {});
    } catch (error) {
      throw new AppError(403, 'REPORT_PERMISSION_SCOPE_DENIED', error instanceof Error ? error.message : 'Report export permission scope denied.');
    }
    return withTransaction(async (tx) => {
      const execution = await this.repository.withDb(tx).createExecution(tx, {
        organizationId: tenant.organizationId,
        savedReportId: report.id,
        requestedById: actor.userId,
        status: 'PENDING',
        permissionScope: report.permissionScope,
        filterJson: { ...((report.filterJson as Record<string, unknown>) ?? {}), ...(input.filterJson ?? {}), exportFormat: input.format } as never,
      });
      await this.audit.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'REPORT_EXPORT_REQUESTED', subjectType: 'ReportExecution', subjectId: execution.id, afterJson: { reportId: report.id, format: input.format }, ip: actor.ip });
      await this.events.append(tx, { organizationId: tenant.organizationId, type: 'report.export.requested', aggregateType: 'ReportExecution', aggregateId: execution.id, payload: { reportId: report.id, format: input.format } });
      return { jobId: execution.id, status: execution.status };
    });
  }
  async exportStatus(tenant: TenantRequestContext, actor: { userId: string; permissions?: string[] }, id: string) {
    await this.enabled(tenant.organizationId);
    const row = await this.repository.getExecution(tenant.organizationId, id);
    if (!row) throw new AppError(404, 'REPORT_EXPORT_NOT_FOUND', 'Report export job not found.');
    try {
      assertM16ReportReadAccess({ organizationId: tenant.organizationId, branchId: tenant.branchId, userId: actor.userId, permissions: actor.permissions ?? [] }, row);
    } catch (error) {
      throw new AppError(403, 'REPORT_PERMISSION_SCOPE_DENIED', error instanceof Error ? error.message : 'Report export status permission scope denied.');
    }
    return row;
  }
}
