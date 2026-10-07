import { withTransaction } from '@nexora/database';
import { AppError } from '../../core/http/errors.js';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import { OrganizationRepository } from './organization.repository.js';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function paging(page?: number, pageSize?: number) {
  const normalizedPage = page ?? 1;
  const normalizedSize = Math.min(pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  return {
    page: normalizedPage,
    pageSize: normalizedSize,
    skip: (normalizedPage - 1) * normalizedSize,
    take: normalizedSize,
  };
}

export class OrganizationService {
  constructor(
    private readonly repository: OrganizationRepository,
    private readonly auditWriter = new AuditWriter(),
  ) {}

  async listBranches(tenant: TenantRequestContext, query: { page?: number; pageSize?: number }) {
    const page = paging(query.page, query.pageSize);
    const result = await this.repository.listBranches({
      organizationId: tenant.organizationId,
      branchScopeId: tenant.branchId,
      skip: page.skip,
      take: page.take,
    });
    return { ...page, ...result };
  }

  async getBranch(tenant: TenantRequestContext, id: string) {
    const branch = await this.repository.getBranch(
      tenant.organizationId,
      tenant.branchId,
      id,
    );
    if (!branch) throw new AppError(404, 'ORGANIZATION_BRANCH_NOT_FOUND', 'Branch not found.');
    return branch;
  }

  async createBranch(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    input: { code: string; name: string; addressId?: string | null },
  ) {
    if (tenant.branchId) {
      throw new AppError(
        403,
        'ORGANIZATION_BRANCH_SCOPE_DENIED',
        'A branch-scoped membership cannot create additional branches.',
      );
    }

    if (
      input.addressId &&
      !(await this.repository.addressBelongsToOrganization(tenant.organizationId, input.addressId))
    ) {
      throw new AppError(400, 'ORGANIZATION_ADDRESS_INVALID', 'Address does not belong to the active organization.');
    }

    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const branch = await repo.createBranch({
        organizationId: tenant.organizationId,
        code: input.code,
        name: input.name,
        addressId: input.addressId ?? null,
      });

      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'ORGANIZATION_BRANCH_CREATED',
        subjectType: 'Branch',
        subjectId: branch.id,
        afterJson: branch,
        ip: actor.ip,
      });

      return branch;
    });
  }

  async updateBranch(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
    input: { code?: string; name?: string; addressId?: string | null },
  ) {
    const before = await this.getBranch(tenant, id);
    if (
      input.addressId &&
      !(await this.repository.addressBelongsToOrganization(tenant.organizationId, input.addressId))
    ) {
      throw new AppError(400, 'ORGANIZATION_ADDRESS_INVALID', 'Address does not belong to the active organization.');
    }

    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const branch = await repo.updateBranch(tenant.organizationId, id, input);

      if (!branch || branch.organizationId !== tenant.organizationId) {
        throw new AppError(404, 'ORGANIZATION_BRANCH_NOT_FOUND', 'Branch not found.');
      }

      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'ORGANIZATION_BRANCH_UPDATED',
        subjectType: 'Branch',
        subjectId: branch.id,
        beforeJson: before,
        afterJson: branch,
        ip: actor.ip,
      });

      const { organizationId: _organizationId, ...result } = branch;
      return result;
    });
  }

  async listDepartments(
    tenant: TenantRequestContext,
    query: { page?: number; pageSize?: number; branchId?: string },
  ) {
    if (tenant.branchId && query.branchId && query.branchId !== tenant.branchId) {
      throw new AppError(
        403,
        'ORGANIZATION_BRANCH_SCOPE_DENIED',
        'Requested branch is outside the authenticated branch scope.',
      );
    }

    const page = paging(query.page, query.pageSize);
    const result = await this.repository.listDepartments({
      organizationId: tenant.organizationId,
      branchScopeId: tenant.branchId,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      skip: page.skip,
      take: page.take,
    });
    return { ...page, ...result };
  }

  async getDepartment(tenant: TenantRequestContext, id: string) {
    const department = await this.repository.getDepartment(
      tenant.organizationId,
      tenant.branchId,
      id,
    );
    if (!department) {
      throw new AppError(404, 'ORGANIZATION_DEPARTMENT_NOT_FOUND', 'Department not found.');
    }
    return department;
  }

  async createDepartment(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    input: { branchId: string; name: string },
  ) {
    if (tenant.branchId && input.branchId !== tenant.branchId) {
      throw new AppError(
        403,
        'ORGANIZATION_BRANCH_SCOPE_DENIED',
        'Department branch is outside the authenticated branch scope.',
      );
    }

    if (!(await this.repository.branchExists(tenant.organizationId, input.branchId))) {
      throw new AppError(400, 'ORGANIZATION_BRANCH_INVALID', 'Department branch does not exist in the active organization.');
    }

    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const department = await repo.createDepartment({
        organizationId: tenant.organizationId,
        branchId: input.branchId,
        name: input.name,
      });

      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'ORGANIZATION_DEPARTMENT_CREATED',
        subjectType: 'Department',
        subjectId: department.id,
        afterJson: department,
        ip: actor.ip,
      });

      return department;
    });
  }

  async updateDepartment(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
    input: { name?: string },
  ) {
    const before = await this.getDepartment(tenant, id);

    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const department = await repo.updateDepartment(
        tenant.organizationId,
        id,
        input,
      );

      if (
        !department ||
        department.organizationId !== tenant.organizationId ||
        (tenant.branchId && department.branchId !== tenant.branchId)
      ) {
        throw new AppError(404, 'ORGANIZATION_DEPARTMENT_NOT_FOUND', 'Department not found.');
      }

      await this.auditWriter.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'ORGANIZATION_DEPARTMENT_UPDATED',
        subjectType: 'Department',
        subjectId: department.id,
        beforeJson: before,
        afterJson: department,
        ip: actor.ip,
      });

      const { organizationId: _organizationId, ...result } = department;
      return result;
    });
  }
}
