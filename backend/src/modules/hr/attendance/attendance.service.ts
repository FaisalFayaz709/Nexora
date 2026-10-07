import { AppError } from '../../../core/http/errors.js';
import type { TenantRequestContext } from '../../../core/tenant/tenant-context.js';
import type { PlatformAccessFacade } from '../../platform/configuration/index.js';
import { AttendanceRepository } from './attendance.repository.js';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
function paging(q: { page?: number; pageSize?: number }) { const page = q.page ?? 1; const pageSize = Math.min(q.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE); return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }; }
function day(value?: string) { return value ? new Date(`${value}T00:00:00.000Z`) : undefined; }
export class AttendanceService {
  constructor(private readonly access: PlatformAccessFacade, private readonly repository = new AttendanceRepository()) {}
  async list(tenant: TenantRequestContext, query: any) {
    await this.access.assertModuleEnabled(tenant.organizationId, 'hr');
    if (tenant.branchId && query.branchId && query.branchId !== tenant.branchId) throw new AppError(403, 'ATTENDANCE_BRANCH_SCOPE_DENIED', 'Requested branch is outside the active branch scope.');
    const p = paging(query);
    const result = await this.repository.list({ organizationId: tenant.organizationId, branchScopeId: tenant.branchId, employeeId: query.employeeId, branchId: query.branchId, status: query.status, from: day(query.from), to: day(query.to), skip: p.skip, take: p.take });
    return { ...p, rows: result.rows, total: result.total };
  }
  async get(tenant: TenantRequestContext, id: string) {
    await this.access.assertModuleEnabled(tenant.organizationId, 'hr');
    const row = await this.repository.get(tenant.organizationId, tenant.branchId, id);
    if (!row) throw new AppError(404, 'ATTENDANCE_NOT_FOUND', 'Attendance record not found.');
    return row;
  }
}
