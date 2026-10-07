import { withTransaction } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { PasswordHasher } from '../../core/security/password-hasher.js';
import type { PasswordPolicy } from '../../core/security/password-policy.js';
import { IdentityRepository } from './identity.repository.js';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function resolvePaging(page?: number, pageSize?: number) {
  const normalizedPage = Math.max(1, page ?? 1);
  const normalizedSize = Math.min(Math.max(1, pageSize ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  return {
    page: normalizedPage,
    pageSize: normalizedSize,
    skip: (normalizedPage - 1) * normalizedSize,
    take: normalizedSize,
  };
}

function assertBranchWithinTenant(
  tenant: TenantRequestContext,
  requestedBranchId: string | null | undefined,
): void {
  if (tenant.branchId && requestedBranchId && requestedBranchId !== tenant.branchId) {
    throw new AppError(
      403,
      'IDENTITY_BRANCH_SCOPE_DENIED',
      'Requested branch is outside the authenticated branch scope.',
    );
  }
}

/**
 * C1 user-management boundary for tenant identity administration.
 *
 * PASS 03 exposes this capability through locked `/api/v1/users`
 * administration endpoints. The service remains the boundary that enforces
 * tenant scope, branch scope, password policy, role validation and audit.
 */
export class UserManagementService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly passwordPolicy: PasswordPolicy,
    private readonly auditWriter = new AuditWriter(),
  ) {}

  async listUsers(
    tenant: TenantRequestContext,
    query: { page?: number; pageSize?: number; status?: string; search?: string; branchId?: string },
  ) {
    assertBranchWithinTenant(tenant, query.branchId);
    const paging = resolvePaging(query.page, query.pageSize);
    const result = await this.repository.listTenantUsers({
      organizationId: tenant.organizationId,
      branchScopeId: tenant.branchId,
      branchId: query.branchId,
      status: query.status,
      search: query.search,
      skip: paging.skip,
      take: paging.take,
    });
    return { ...paging, ...result };
  }

  async getUser(tenant: TenantRequestContext, membershipId: string) {
    const result = await this.repository.getTenantUser({
      organizationId: tenant.organizationId,
      branchScopeId: tenant.branchId,
      membershipId,
    });
    if (!result) {
      throw new AppError(404, 'IDENTITY_USER_NOT_FOUND', 'User membership not found in the active organization.');
    }
    return result;
  }

  async createUser(input: {
    tenant: TenantRequestContext;
    actorUserId: string;
    actorIp: string | null;
    email: string;
    password: string;
    branchId?: string | null;
    roleIds?: readonly string[];
  }) {
    assertBranchWithinTenant(input.tenant, input.branchId ?? null);
    this.passwordPolicy.assertCompliant(input.password);

    const email = input.email.trim().toLowerCase();
    if (await this.repository.findUserByEmail(email)) {
      throw new AppError(409, 'IDENTITY_EMAIL_ALREADY_EXISTS', 'A user with this email already exists.');
    }

    if (
      input.branchId &&
      !(await this.repository.branchBelongsToOrganization(input.tenant.organizationId, input.branchId))
    ) {
      throw new AppError(400, 'IDENTITY_BRANCH_INVALID', 'Branch does not belong to the active organization.');
    }

    for (const roleId of input.roleIds ?? []) {
      if (!(await this.repository.roleBelongsToOrganization(roleId, input.tenant.organizationId))) {
        throw new AppError(400, 'IDENTITY_ROLE_INVALID', 'Role does not belong to the active organization.', { roleId });
      }
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const user = await repo.createTenantUser({
        organizationId: input.tenant.organizationId,
        branchId: input.branchId ?? null,
        email,
        passwordHash,
        roleIds: input.roleIds ?? [],
      });

      await this.auditWriter.append(tx, {
        organizationId: input.tenant.organizationId,
        actorUserId: input.actorUserId,
        action: 'IDENTITY_USER_CREATED',
        subjectType: 'OrganizationMembership',
        subjectId: user.membershipId,
        afterJson: {
          userId: user.id,
          email: user.email,
          branchId: user.branchId,
          roleIds: input.roleIds ?? [],
        },
        ip: input.actorIp,
      });

      return user;
    });
  }

  async setUserStatus(input: {
    tenant: TenantRequestContext;
    actorUserId: string;
    actorIp: string | null;
    membershipId: string;
    status: 'ACTIVE' | 'LOCKED' | 'SUSPENDED' | 'PASSWORD_EXPIRED' | 'DISABLED';
  }) {
    const before = await this.getUser(input.tenant, input.membershipId);

    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const updated = await repo.setTenantUserStatus({
        organizationId: input.tenant.organizationId,
        membershipId: input.membershipId,
        status: input.status,
      });

      if (!updated) {
        throw new AppError(404, 'IDENTITY_USER_NOT_FOUND', 'User membership not found in the active organization.');
      }

      await this.auditWriter.append(tx, {
        organizationId: input.tenant.organizationId,
        actorUserId: input.actorUserId,
        action: 'IDENTITY_USER_STATUS_CHANGED',
        subjectType: 'OrganizationMembership',
        subjectId: input.membershipId,
        beforeJson: before,
        afterJson: updated,
        ip: input.actorIp,
      });

      return updated;
    });
  }
}
