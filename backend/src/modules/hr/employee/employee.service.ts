import { withTransaction } from '@nexora/database';
import { AuditWriter } from '../../../core/audit/audit-writer.js';
import { AppError } from '../../../core/http/errors.js';
import type { TenantRequestContext } from '../../../core/tenant/tenant-context.js';
import type { IdentityFacade } from '../../identity/index.js';
import type { OrganizationFacade } from '../../organization/index.js';
import { EmployeeRepository } from './employee.repository.js';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function dto(row: any) {
  return {
    ...row,
    joiningDate: row.joiningDate ? row.joiningDate.toISOString().slice(0, 10) : null,
  };
}

export class EmployeeService {
  constructor(
    private readonly identity: IdentityFacade,
    private readonly organization: OrganizationFacade,
    private readonly repository = new EmployeeRepository(),
    private readonly auditWriter = new AuditWriter(),
  ) {}

  async list(tenant: TenantRequestContext, query: any) {
    if (tenant.branchId && query.branchId && query.branchId !== tenant.branchId) {
      throw new AppError(403, 'EMPLOYEE_BRANCH_SCOPE_DENIED', 'Requested branch is outside the active branch scope.');
    }
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const result = await this.repository.list({
      organizationId: tenant.organizationId,
      branchScopeId: tenant.branchId,
      branchId: query.branchId,
      departmentId: query.departmentId,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { rows: result.rows.map(dto), total: result.total, page, pageSize };
  }

  async get(tenant: TenantRequestContext, id: string) {
    const row = await this.repository.get(tenant.organizationId, tenant.branchId, id);
    if (!row) throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found.');
    return dto(row);
  }

  async create(tenant: TenantRequestContext, actor: any, input: any) {
    await this.assertReferences(tenant, input);
    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const row = await repo.create({
        organizationId: tenant.organizationId,
        employeeNo: input.employeeNo,
        name: input.name,
        branchId: input.branchId,
        departmentId: input.departmentId,
        userId: input.userId ?? null,
        managerId: input.managerId ?? null,
        jobTitle: input.jobTitle ?? null,
        joiningDate: input.joiningDate ? new Date(`${input.joiningDate}T00:00:00Z`) : null,
        employmentType: input.employmentType ?? null,
        contactJson: input.contact ?? null,
        emergencyContactJson: input.emergencyContact ?? null,
        bankInformationJson: input.bankInformation ?? null,
        baseSalary: input.baseSalary ?? null,
        allowancesJson: input.allowances ?? null,
      });
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'EMPLOYEE_CREATED',
        subjectType: 'Employee',
        subjectId: row.id,
        afterJson: dto(row),
        ip: actor.ip,
      });
      return dto(row);
    });
  }

  async update(tenant: TenantRequestContext, actor: any, id: string, input: any) {
    const before = await this.get(tenant, id);
    const merged = {
      branchId: input.branchId ?? before.branchId,
      departmentId: input.departmentId ?? before.departmentId,
      userId: input.userId === undefined ? before.userId : input.userId,
      managerId: input.managerId === undefined ? before.managerId : input.managerId,
    };
    await this.assertReferences(tenant, merged);

    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const row = await repo.updateScoped(tenant.organizationId, tenant.branchId, id, {
        ...input,
        joiningDate:
          input.joiningDate === undefined
            ? undefined
            : input.joiningDate
              ? new Date(`${input.joiningDate}T00:00:00Z`)
              : null,
        contactJson: input.contact,
        emergencyContactJson: input.emergencyContact,
        bankInformationJson: input.bankInformation,
        baseSalary: input.baseSalary === undefined ? undefined : input.baseSalary,
        allowancesJson: input.allowances,
        contact: undefined,
        emergencyContact: undefined,
        bankInformation: undefined,
        allowances: undefined,
      });
      if (!row) {
        throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found.');
      }
      const after = dto(row);
      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'EMPLOYEE_UPDATED',
        subjectType: 'Employee',
        subjectId: id,
        beforeJson: before,
        afterJson: after,
        ip: actor.ip,
      });
      const { organizationId: _organizationId, ...result } = after;
      return result;
    });
  }

  private async assertReferences(
    tenant: TenantRequestContext,
    input: {
      branchId: string;
      departmentId: string;
      userId?: string | null;
      managerId?: string | null;
    },
  ) {
    if (tenant.branchId && input.branchId !== tenant.branchId) {
      throw new AppError(403, 'EMPLOYEE_BRANCH_SCOPE_DENIED', 'Employee branch is outside the active branch scope.');
    }

    await this.organization.getBranch(tenant, input.branchId);
    const department = await this.organization.getDepartment(tenant, input.departmentId);
    if (department.branchId !== input.branchId) {
      throw new AppError(400, 'EMPLOYEE_DEPARTMENT_INVALID', 'Employee department does not belong to the selected branch.');
    }

    if (
      input.userId &&
      !(await this.identity.userHasActiveMembership(input.userId, tenant.organizationId))
    ) {
      throw new AppError(
        400,
        'EMPLOYEE_USER_INVALID',
        'Linked user does not have an active membership in the active organization.',
      );
    }

    if (
      input.managerId &&
      !(await this.repository.employeeBelongsToOrganization(tenant.organizationId, input.managerId))
    ) {
      throw new AppError(
        400,
        'EMPLOYEE_MANAGER_INVALID',
        'Manager does not belong to the active organization.',
      );
    }
  }
}
