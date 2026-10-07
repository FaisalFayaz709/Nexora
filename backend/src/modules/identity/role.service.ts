import { withTransaction } from '@nexora/database';
import { AppError } from '../../core/http/errors.js';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import { IdentityRepository } from './identity.repository.js';

export class RoleService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly auditWriter = new AuditWriter(),
  ) {}



listRoles(tenant: TenantRequestContext) {
  return this.repository.listRoles(tenant.organizationId);
}

listPermissions() {
  return this.repository.listPermissions();
}

async createRole(input: {
  tenant: TenantRequestContext;
  actorUserId: string;
  actorIp: string | null;
  name: string;
  mfaRequired?: boolean;
  permissionKeys?: readonly string[];
}) {
  if (input.tenant.branchId) {
    throw new AppError(403, 'IDENTITY_BRANCH_SCOPE_DENIED', 'A branch-scoped membership cannot create tenant roles.');
  }

  return withTransaction(async (tx) => {
    const repo = this.repository.withDb(tx);
    const permissionIds = await repo.permissionIdsByKeys(input.permissionKeys ?? []);
    const missing = (input.permissionKeys ?? []).filter((key) => !permissionIds.has(key));
    if (missing.length) {
      throw new AppError(400, 'IDENTITY_PERMISSION_UNKNOWN', 'Unknown permission key.', { missing });
    }

    const role = await repo.createRole({
      organizationId: input.tenant.organizationId,
      name: input.name,
      mfaRequired: input.mfaRequired ?? false,
      permissionIds: [...permissionIds.values()],
    });

    await this.auditWriter.append(tx, {
      organizationId: input.tenant.organizationId,
      actorUserId: input.actorUserId,
      action: 'IDENTITY_ROLE_CREATED',
      subjectType: 'Role',
      subjectId: role.id,
      afterJson: { ...role, permissionKeys: input.permissionKeys ?? [] },
      ip: input.actorIp,
    });

    return role;
  });
}

async updateMfaRequirement(input: {
  tenant: TenantRequestContext;
  actorUserId: string;
  actorIp: string | null;
  roleId: string;
  mfaRequired: boolean;
}) {
  if (!(await this.repository.roleBelongsToOrganization(input.roleId, input.tenant.organizationId))) {
    throw new AppError(404, 'IDENTITY_ROLE_NOT_FOUND', 'Role not found in the active organization.');
  }

  return withTransaction(async (tx) => {
    const repo = this.repository.withDb(tx);
    const role = await repo.updateRoleMfaRequirement(input.roleId, input.mfaRequired);
    await this.auditWriter.append(tx, {
      organizationId: input.tenant.organizationId,
      actorUserId: input.actorUserId,
      action: 'IDENTITY_ROLE_MFA_REQUIREMENT_CHANGED',
      subjectType: 'Role',
      subjectId: input.roleId,
      afterJson: { mfaRequired: input.mfaRequired },
      ip: input.actorIp,
    });
    return role;
  });
}
  async replacePermissions(input: {
    tenant: TenantRequestContext;
    actorUserId: string;
    actorIp: string | null;
    roleId: string;
    permissionKeys: readonly string[];
  }): Promise<void> {
    await withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);

      if (!(await repo.roleBelongsToOrganization(input.roleId, input.tenant.organizationId))) {
        throw new AppError(404, 'IDENTITY_ROLE_NOT_FOUND', 'Role not found in the active organization.');
      }

      const permissionIds = await repo.permissionIdsByKeys(input.permissionKeys);
      const missing = input.permissionKeys.filter((key) => !permissionIds.has(key));
      if (missing.length) {
        throw new AppError(400, 'IDENTITY_PERMISSION_UNKNOWN', 'Unknown permission key.', { missing });
      }

      await repo.replaceRolePermissions(input.roleId, [...permissionIds.values()]);
      await this.auditWriter.append(tx, {
        organizationId: input.tenant.organizationId,
        actorUserId: input.actorUserId,
        action: 'IDENTITY_ROLE_PERMISSIONS_CHANGED',
        subjectType: 'Role',
        subjectId: input.roleId,
        afterJson: { permissionKeys: [...input.permissionKeys].sort() },
        ip: input.actorIp,
      });
    });
  }

  async assignRole(input: {
    tenant: TenantRequestContext;
    actorUserId: string;
    actorIp: string | null;
    membershipId: string;
    roleId: string;
  }): Promise<void> {
    await withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);

      if (!(await repo.roleBelongsToOrganization(input.roleId, input.tenant.organizationId))) {
        throw new AppError(404, 'IDENTITY_ROLE_NOT_FOUND', 'Role not found in the active organization.');
      }
      if (!(await repo.membershipBelongsToOrganization(input.membershipId, input.tenant.organizationId))) {
        throw new AppError(404, 'IDENTITY_MEMBERSHIP_NOT_FOUND', 'Membership not found in the active organization.');
      }

      await repo.assignRole(input.membershipId, input.roleId);
      await this.auditWriter.append(tx, {
        organizationId: input.tenant.organizationId,
        actorUserId: input.actorUserId,
        action: 'IDENTITY_ROLE_ASSIGNED',
        subjectType: 'OrganizationMembership',
        subjectId: input.membershipId,
        afterJson: { roleId: input.roleId },
        ip: input.actorIp,
      });
    });
  }
}
