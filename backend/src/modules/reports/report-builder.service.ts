import { withTransaction } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { BusinessEventWriter } from '../../core/events/business-event-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { ReportBuilderRepository } from './report-builder.repository.js';
import {
  assertM16ActorHasPermissionScope,
  assertM16DashboardWidgetScope,
  assertM16ReportBuilderFieldAllowlist,
  assertM16ReportReadAccess,
  assertM16SavedViewScope,
  assertM16ScheduledReportSafety,
  normalizeM16PermissionScope,
} from '../../core/compliance/report-dashboard-completion-policy.js';

const requiredScopesBySource: Record<string, string> = {
  CUSTOMERS: 'customer.view',
  VENDORS: 'vendor.view',
  PROJECTS: 'project.view',
  PROCUREMENT: 'purchase_request.view',
  INVENTORY: 'inventory.view',
  ASSETS: 'asset.view',
  FIELD_SERVICE: 'ticket.view',
  MAINTENANCE: 'maintenance.view',
  FINANCE_AR: 'finance.view',
  FINANCE_AP: 'finance.view',
  HR_EMPLOYEES: 'employee.view',
  AUDIT: 'audit.view',
};

function page(query: { page?: number; pageSize?: number }) {
  const current = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 25, 100);
  return { page: current, pageSize, skip: (current - 1) * pageSize, take: pageSize };
}

function assertScope(dataSource: string, permissionScope: string[]) {
  const required = requiredScopesBySource[dataSource];
  if (!required || !permissionScope.includes(required)) {
    throw new AppError(403, 'REPORT_PERMISSION_SCOPE_INVALID', 'Saved reports must retain the permission scope required by their data source.', { dataSource, required });
  }
}

function stringifyScope(scope: unknown): string[] {
  return normalizeM16PermissionScope(scope as readonly string[] | unknown);
}

function filterByReportScope<T extends { organizationId: string; permissionScope?: unknown }>(tenant: TenantRequestContext, actor: { userId: string; permissions?: string[] }, rows: T[]): T[] {
  const permissions = actor.permissions ?? [];
  return rows.filter((row) => {
    try {
      assertM16ReportReadAccess({ organizationId: tenant.organizationId, branchId: tenant.branchId, userId: actor.userId, permissions }, { organizationId: row.organizationId, permissionScope: row.permissionScope ?? [] });
      return true;
    } catch {
      return false;
    }
  });
}

export class ReportBuilderService {
  constructor(
    private readonly access: PlatformAccessFacade,
    private readonly repository = new ReportBuilderRepository(),
    private readonly audit = new AuditWriter(),
    private readonly events = new BusinessEventWriter(),
  ) {}

  private async enabled(organizationId: string) { await this.access.assertModuleEnabled(organizationId, 'reports'); }

  async listTemplates(tenant: TenantRequestContext, actor: { userId: string; permissions?: string[] }, query: any) {
    await this.enabled(tenant.organizationId);
    const p = page(query);
    const { rows, total } = await this.repository.listTemplates(tenant.organizationId, query, p);
    const visibleRows = filterByReportScope(tenant, actor, rows);
    return { rows: visibleRows, total: Math.min(total, visibleRows.length), page: p.page, pageSize: p.pageSize };
  }

  async getTemplateDetail(tenant: TenantRequestContext, actor: { userId: string; permissions?: string[] }, id: string) {
    await this.enabled(tenant.organizationId);
    const row = await this.repository.getTemplate(tenant.organizationId, id);
    if (!row) throw new AppError(404, 'REPORT_TEMPLATE_NOT_FOUND', 'Report template not found.');
    assertM16ReportReadAccess({ organizationId: tenant.organizationId, branchId: tenant.branchId, userId: actor.userId, permissions: actor.permissions ?? [] }, row);
    return row;
  }

  async createTemplate(tenant: TenantRequestContext, actor: { userId: string; ip: string | null; permissions?: string[] }, input: any) {
    await this.enabled(tenant.organizationId);
    assertScope(input.dataSource, input.permissionScope);
    assertM16ActorHasPermissionScope(actor.permissions ?? [], input.permissionScope);
    assertM16ReportBuilderFieldAllowlist(input.dataSource, input.selectedFields);
    return withTransaction(async (tx) => {
      const row = await this.repository.createTemplate(tx, {
        organizationId: tenant.organizationId,
        name: input.name,
        description: input.description ?? null,
        dataSource: input.dataSource,
        selectedFields: input.selectedFields,
        filterJson: input.filterJson,
        chartType: input.chartType,
        permissionScope: input.permissionScope,
        isSystem: input.isSystem,
        featureFlagId: null,
        createdById: actor.userId,
      });
      await this.audit.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'REPORT_TEMPLATE_CREATED', subjectType: 'ReportTemplate', subjectId: row.id, afterJson: { dataSource: row.dataSource, permissionScope: row.permissionScope }, ip: actor.ip });
      return row;
    });
  }

  async updateTemplate(tenant: TenantRequestContext, actor: { userId: string; ip: string | null; permissions?: string[] }, id: string, input: any) {
    const existing = await this.getTemplateDetail(tenant, actor, id);
    const dataSource = input.dataSource ?? existing.dataSource;
    const permissionScope = input.permissionScope ?? stringifyScope(existing.permissionScope);
    const selectedFields = input.selectedFields ?? (Array.isArray(existing.selectedFields) ? existing.selectedFields : []);
    assertScope(dataSource, permissionScope);
    assertM16ActorHasPermissionScope(actor.permissions ?? [], permissionScope);
    assertM16ReportBuilderFieldAllowlist(dataSource, selectedFields);
    return withTransaction(async (tx) => {
      const row = await this.repository.updateTemplate(tx, tenant.organizationId, id, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description ?? null } : {}),
        ...(input.dataSource !== undefined ? { dataSource } : {}),
        ...(input.selectedFields !== undefined ? { selectedFields } : {}),
        ...(input.filterJson !== undefined ? { filterJson: input.filterJson } : {}),
        ...(input.chartType !== undefined ? { chartType: input.chartType } : {}),
        ...(input.permissionScope !== undefined ? { permissionScope } : {}),
        ...(input.isSystem !== undefined ? { isSystem: input.isSystem } : {}),
      });
      await this.audit.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'REPORT_TEMPLATE_UPDATED', subjectType: 'ReportTemplate', subjectId: row.id, beforeJson: { permissionScope: existing.permissionScope }, afterJson: { permissionScope: row.permissionScope }, ip: actor.ip });
      return row;
    });
  }

  async listSavedReports(tenant: TenantRequestContext, actor: { userId: string; permissions?: string[] }, query: any) {
    await this.enabled(tenant.organizationId);
    const p = page(query);
    const { rows, total } = await this.repository.listSavedReports(tenant.organizationId, actor.userId, query, p);
    const visibleRows = filterByReportScope(tenant, actor, rows);
    return { rows: visibleRows, total: Math.min(total, visibleRows.length), page: p.page, pageSize: p.pageSize };
  }

  async getSavedReportDetail(tenant: TenantRequestContext, actor: { userId: string; permissions?: string[] }, id: string) {
    await this.enabled(tenant.organizationId);
    const row = await this.repository.getSavedReport(tenant.organizationId, id);
    if (!row) throw new AppError(404, 'SAVED_REPORT_NOT_FOUND', 'Saved report not found.');
    assertM16ReportReadAccess({ organizationId: tenant.organizationId, branchId: tenant.branchId, userId: actor.userId, permissions: actor.permissions ?? [] }, row);
    return row;
  }

  async createSavedReport(tenant: TenantRequestContext, actor: { userId: string; ip: string | null; permissions?: string[] }, input: any) {
    await this.enabled(tenant.organizationId);
    const template = await this.repository.getTemplate(tenant.organizationId, input.templateId);
    if (!template) throw new AppError(404, 'REPORT_TEMPLATE_NOT_FOUND', 'Report template not found.');
    assertScope(template.dataSource, input.permissionScope);
    assertM16ActorHasPermissionScope(actor.permissions ?? [], input.permissionScope);
    assertM16ReportBuilderFieldAllowlist(template.dataSource, input.selectedFields);
    return withTransaction(async (tx) => {
      const row = await this.repository.createSavedReport(tx, {
        organizationId: tenant.organizationId,
        templateId: input.templateId,
        name: input.name,
        selectedFields: input.selectedFields,
        filterJson: input.filterJson,
        chartType: input.chartType,
        permissionScope: input.permissionScope,
        ownerUserId: actor.userId,
      });
      await this.audit.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'SAVED_REPORT_CREATED', subjectType: 'SavedReport', subjectId: row.id, afterJson: { templateId: row.templateId, permissionScope: row.permissionScope }, ip: actor.ip });
      return row;
    });
  }

  async updateSavedReport(tenant: TenantRequestContext, actor: { userId: string; ip: string | null; permissions?: string[] }, id: string, input: any) {
    const existing = await this.getSavedReportDetail(tenant, actor, id);
    const permissionScope = input.permissionScope ?? stringifyScope(existing.permissionScope);
    const selectedFields = input.selectedFields ?? (Array.isArray(existing.selectedFields) ? existing.selectedFields : []);
    assertScope(existing.template.dataSource, permissionScope);
    assertM16ActorHasPermissionScope(actor.permissions ?? [], permissionScope);
    assertM16ReportBuilderFieldAllowlist(existing.template.dataSource, selectedFields);
    return withTransaction(async (tx) => {
      const row = await this.repository.updateSavedReport(tx, tenant.organizationId, id, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.selectedFields !== undefined ? { selectedFields } : {}),
        ...(input.filterJson !== undefined ? { filterJson: input.filterJson } : {}),
        ...(input.chartType !== undefined ? { chartType: input.chartType } : {}),
        ...(input.permissionScope !== undefined ? { permissionScope } : {}),
      });
      await this.audit.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'SAVED_REPORT_UPDATED', subjectType: 'SavedReport', subjectId: row.id, beforeJson: { permissionScope: existing.permissionScope }, afterJson: { permissionScope: row.permissionScope }, ip: actor.ip });
      return row;
    });
  }

  async listScheduledReports(tenant: TenantRequestContext, actor: { userId: string; permissions?: string[] }, query: any) {
    await this.enabled(tenant.organizationId);
    const p = page(query);
    const { rows, total } = await this.repository.listScheduledReports(tenant.organizationId, actor.userId, query, p);
    const visibleRows = filterByReportScope(tenant, actor, rows.map((row: any) => ({ ...row, permissionScope: row.savedReport?.permissionScope ?? [] })));
    return { rows: visibleRows, total: Math.min(total, visibleRows.length), page: p.page, pageSize: p.pageSize };
  }

  async getScheduledReportDetail(tenant: TenantRequestContext, actor: { userId: string; permissions?: string[] }, id: string) {
    await this.enabled(tenant.organizationId);
    const row = await this.repository.getScheduledReport(tenant.organizationId, id);
    if (!row) throw new AppError(404, 'SCHEDULED_REPORT_NOT_FOUND', 'Scheduled report not found.');
    assertM16ReportReadAccess({ organizationId: tenant.organizationId, branchId: tenant.branchId, userId: actor.userId, permissions: actor.permissions ?? [] }, { organizationId: row.organizationId, permissionScope: row.savedReport?.permissionScope ?? [] });
    return row;
  }

  async createScheduledReport(tenant: TenantRequestContext, actor: { userId: string; ip: string | null; permissions?: string[] }, input: any) {
    await this.enabled(tenant.organizationId);
    const saved = await this.repository.getSavedReport(tenant.organizationId, input.savedReportId);
    if (!saved) throw new AppError(404, 'SAVED_REPORT_NOT_FOUND', 'Saved report not found.');
    const permissionScope = Array.isArray(saved.permissionScope) ? saved.permissionScope : [];
    assertScope(saved.template.dataSource, permissionScope.map(String));
    assertM16ActorHasPermissionScope(actor.permissions ?? [], permissionScope.map(String));
    assertM16ScheduledReportSafety({ savedReportId: input.savedReportId, recipients: input.recipients, permissionScope, idempotencyKey: `${input.savedReportId}:${input.frequency}:${input.nextRunAt}` });

    return withTransaction(async (tx) => {
      const scheduled = await this.repository.createScheduledReport(tx, {
        organizationId: tenant.organizationId,
        savedReportId: input.savedReportId,
        frequency: input.frequency,
        timezone: input.timezone,
        nextRunAt: new Date(input.nextRunAt),
        recipientsJson: input.recipients,
        active: input.active,
        createdById: actor.userId,
      });
      const execution = await this.repository.createReportExecution(tx, {
        organizationId: tenant.organizationId,
        savedReportId: input.savedReportId,
        scheduledReportId: scheduled.id,
        requestedById: actor.userId,
        status: 'PENDING',
        permissionScope: permissionScope,
        filterJson: saved.filterJson,
      });
      await this.audit.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'SCHEDULED_REPORT_CREATED', subjectType: 'ScheduledReport', subjectId: scheduled.id, afterJson: { savedReportId: scheduled.savedReportId, frequency: scheduled.frequency, nextRunAt: scheduled.nextRunAt, reportExecutionId: execution.id }, ip: actor.ip });
      await this.events.append(tx, { organizationId: tenant.organizationId, type: 'report.scheduled', aggregateType: 'ScheduledReport', aggregateId: scheduled.id, payload: { reportExecutionId: execution.id, nextRunAt: scheduled.nextRunAt } });
      return { scheduledReport: scheduled, reportExecutionId: execution.id };
    });
  }

  async updateScheduledReport(tenant: TenantRequestContext, actor: { userId: string; ip: string | null; permissions?: string[] }, id: string, input: any) {
    const existing = await this.getScheduledReportDetail(tenant, actor, id);
    const permissionScope = stringifyScope(existing.savedReport?.permissionScope ?? []);
    if (input.recipients || input.frequency || input.nextRunAt) {
      assertM16ScheduledReportSafety({ savedReportId: existing.savedReportId, recipients: input.recipients ?? existing.recipientsJson ?? [], permissionScope, idempotencyKey: `${existing.savedReportId}:${input.frequency ?? existing.frequency}:${input.nextRunAt ?? existing.nextRunAt.toISOString()}` });
    }
    return withTransaction(async (tx) => {
      const row = await this.repository.updateScheduledReport(tx, tenant.organizationId, id, {
        ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        ...(input.nextRunAt !== undefined ? { nextRunAt: new Date(input.nextRunAt) } : {}),
        ...(input.recipients !== undefined ? { recipientsJson: input.recipients } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      });
      await this.audit.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'SCHEDULED_REPORT_UPDATED', subjectType: 'ScheduledReport', subjectId: row.id, afterJson: { active: row.active, nextRunAt: row.nextRunAt }, ip: actor.ip });
      return row;
    });
  }

  async listReportExecutions(tenant: TenantRequestContext, actor: { userId: string; permissions?: string[] }, query: any) {
    await this.enabled(tenant.organizationId);
    const p = page(query);
    const { rows, total } = await this.repository.listReportExecutions(tenant.organizationId, actor.userId, query, p);
    const visibleRows = filterByReportScope(tenant, actor, rows);
    return { rows: visibleRows, total: Math.min(total, visibleRows.length), page: p.page, pageSize: p.pageSize };
  }

  async getExecution(tenant: TenantRequestContext, actor: { userId?: string; permissions?: string[] } | string, id?: string) {
    await this.enabled(tenant.organizationId);
    const executionId = typeof actor === 'string' ? actor : id;
    const permissions = typeof actor === 'string' ? [] : actor.permissions ?? [];
    if (!executionId) throw new AppError(400, 'REPORT_EXECUTION_ID_REQUIRED', 'Report execution id is required.');
    const row = await this.repository.getReportExecution(tenant.organizationId, executionId);
    if (!row) throw new AppError(404, 'REPORT_EXECUTION_NOT_FOUND', 'Report execution not found.');
    if (typeof actor !== 'string') assertM16ReportReadAccess({ organizationId: tenant.organizationId, branchId: tenant.branchId, userId: actor.userId, permissions }, row);
    return row;
  }

  async listDashboardWidgets(tenant: TenantRequestContext, actor: { userId: string; permissions?: string[] }, query: any) {
    await this.enabled(tenant.organizationId);
    const p = page(query);
    const { rows, total } = await this.repository.listDashboardWidgets(tenant.organizationId, actor.userId, p);
    const visibleRows = rows.filter((row: any) => {
      try { assertM16DashboardWidgetScope({ dataSource: String(row.configJson?.dataSource ?? 'CUSTOM_REPORT'), permissionScope: row.permissionScope, actorPermissions: actor.permissions ?? [] }); return true; }
      catch { return false; }
    });
    return { rows: visibleRows, total: Math.min(total, visibleRows.length), page: p.page, pageSize: p.pageSize };
  }

  async createDashboardWidget(tenant: TenantRequestContext, actor: { userId: string; ip: string | null; permissions?: string[] }, input: any) {
    await this.enabled(tenant.organizationId);
    assertM16DashboardWidgetScope({ dataSource: input.dataSource, permissionScope: input.permissionScope, actorPermissions: actor.permissions ?? [] });
    return withTransaction(async (tx) => {
      const row = await this.repository.createDashboardWidget(tx, {
        organizationId: tenant.organizationId,
        userDashboardId: input.userDashboardId ?? null,
        savedReportId: input.savedReportId ?? null,
        title: input.title,
        widgetType: input.widgetType,
        layoutJson: input.layoutJson,
        configJson: { ...input.configJson, dataSource: input.dataSource },
        permissionScope: input.permissionScope,
      });
      await this.audit.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'DASHBOARD_WIDGET_CREATED', subjectType: 'DashboardWidget', subjectId: row.id, afterJson: { title: row.title, permissionScope: row.permissionScope }, ip: actor.ip });
      return row;
    });
  }

  async listSavedViews(tenant: TenantRequestContext, actor: { userId: string; permissions?: string[] }, query: any) {
    await this.enabled(tenant.organizationId);
    const p = page(query);
    const { rows, total } = await this.repository.listSavedViews(tenant.organizationId, actor.userId, query, p);
    const visibleRows = rows.filter((row: any) => {
      try { assertM16SavedViewScope({ entityType: row.entityType, permissionScope: row.permissionScope, actorPermissions: actor.permissions ?? [] }); return true; }
      catch { return false; }
    });
    return { rows: visibleRows, total: Math.min(total, visibleRows.length), page: p.page, pageSize: p.pageSize };
  }

  async getSavedView(tenant: TenantRequestContext, actor: { userId: string; permissions?: string[] }, id: string) {
    await this.enabled(tenant.organizationId);
    const row = await this.repository.getSavedView(tenant.organizationId, actor.userId, id);
    if (!row) throw new AppError(404, 'SAVED_VIEW_NOT_FOUND', 'Saved view not found.');
    assertM16SavedViewScope({ entityType: row.entityType, permissionScope: row.permissionScope, actorPermissions: actor.permissions ?? [] });
    return row;
  }

  async createSavedView(tenant: TenantRequestContext, actor: { userId: string; ip: string | null; permissions?: string[] }, input: any) {
    await this.enabled(tenant.organizationId);
    assertM16SavedViewScope({ entityType: input.entityType, permissionScope: input.permissionScope, actorPermissions: actor.permissions ?? [] });
    return withTransaction(async (tx) => {
      const row = await this.repository.createSavedView(tx, { organizationId: tenant.organizationId, userId: actor.userId, entityType: input.entityType, name: input.name, columnsJson: input.columns, filterJson: input.filterJson, sortJson: input.sortJson ?? null, isDefault: input.isDefault, permissionScope: input.permissionScope });
      await this.audit.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'SAVED_VIEW_CREATED', subjectType: 'SavedView', subjectId: row.id, afterJson: { entityType: row.entityType, permissionScope: row.permissionScope }, ip: actor.ip });
      return row;
    });
  }

  async updateSavedView(tenant: TenantRequestContext, actor: { userId: string; ip: string | null; permissions?: string[] }, id: string, input: any) {
    const existing = await this.getSavedView(tenant, actor, id);
    const permissionScope = input.permissionScope ?? stringifyScope(existing.permissionScope);
    const entityType = input.entityType ?? existing.entityType;
    assertM16SavedViewScope({ entityType, permissionScope, actorPermissions: actor.permissions ?? [] });
    return withTransaction(async (tx) => {
      const row = await this.repository.updateSavedView(tx, tenant.organizationId, actor.userId, id, {
        ...(input.entityType !== undefined ? { entityType } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.columns !== undefined ? { columnsJson: input.columns } : {}),
        ...(input.filterJson !== undefined ? { filterJson: input.filterJson } : {}),
        ...(input.sortJson !== undefined ? { sortJson: input.sortJson ?? null } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        ...(input.permissionScope !== undefined ? { permissionScope } : {}),
      });
      await this.audit.append(tx, { organizationId: tenant.organizationId, actorUserId: actor.userId, action: 'SAVED_VIEW_UPDATED', subjectType: 'SavedView', subjectId: row.id, beforeJson: { permissionScope: existing.permissionScope }, afterJson: { permissionScope: row.permissionScope }, ip: actor.ip });
      return row;
    });
  }
}
