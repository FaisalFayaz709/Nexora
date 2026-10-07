import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import { PlatformRuntimeRepository } from './platform-runtime.repository.js';
import { assertM16CalendarItemVisibility, assertM16GlobalSearchEntryVisibility } from '../../core/compliance/report-dashboard-completion-policy.js';

function page(query: { page?: number; pageSize?: number }) {
  const current = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 25, 100);
  return { page: current, pageSize, skip: (current - 1) * pageSize, take: pageSize };
}
function split(value?: string) { return value ? value.split(',').map((x) => x.trim()).filter(Boolean) : null; }
function asDate(value: string, end = false) { return new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}Z`); }

export class PlatformRuntimeService {
  constructor(private readonly repository = new PlatformRuntimeRepository()) {}

  async search(tenant: TenantRequestContext, auth: { permissions?: string[]; userId?: string }, query: any) {
    const p = page(query);
    const permissions = auth.permissions?.length ? auth.permissions : [];
    const { rows, total } = await this.repository.search(tenant.organizationId, tenant.branchId, query.q.trim(), permissions, split(query.entityTypes), p.skip, p.take);
    for (const row of rows) {
      assertM16GlobalSearchEntryVisibility({ organizationId: tenant.organizationId, branchId: tenant.branchId, userId: auth.userId, permissions }, row);
    }
    return { rows, total, page: p.page, pageSize: p.pageSize };
  }

  async calendar(tenant: TenantRequestContext, auth: { permissions?: string[]; userId?: string }, query: any) {
    const from = asDate(query.from);
    const to = asDate(query.to, true);
    if (to.getTime() < from.getTime()) throw new AppError(400, 'CALENDAR_RANGE_INVALID', 'Calendar end date cannot be before start date.');
    const p = page(query);
    const permissions = auth.permissions?.length ? auth.permissions : [];
    const { rows, total } = await this.repository.calendar(tenant.organizationId, tenant.branchId, permissions, from, to, split(query.entityTypes), p.skip, p.take);
    for (const row of rows) {
      assertM16CalendarItemVisibility({ organizationId: tenant.organizationId, branchId: tenant.branchId, userId: auth.userId, permissions }, row);
    }
    return { rows, total, page: p.page, pageSize: p.pageSize };
  }

  async auditLogs(tenant: TenantRequestContext, query: any) {
    const p = page(query);
    const { rows, total } = await this.repository.auditLogs(tenant.organizationId, query, p.skip, p.take);
    return { rows, total, page: p.page, pageSize: p.pageSize };
  }

  async auditLog(tenant: TenantRequestContext, id: string) {
    const row = await this.repository.auditLog(tenant.organizationId, id);
    if (!row) throw new AppError(404, 'AUDIT_LOG_NOT_FOUND', 'Audit log not found.');
    return row;
  }
}
