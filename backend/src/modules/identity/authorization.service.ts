import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import { IdentityRepository } from './identity.repository.js';

export class AuthorizationService {
  constructor(private readonly repository: IdentityRepository) {}

  async permissions(userId: string, tenant: TenantRequestContext): Promise<string[]> {
    const membership = await this.repository.getMembershipAuthorization(
      userId,
      tenant.organizationId,
    );

    if (!membership || membership.id !== tenant.membershipId) {
      throw new AppError(403, 'TENANT_ACCESS_DENIED', 'Tenant membership is no longer active.');
    }

    return [...membership.permissionKeys];
  }


  async roleIds(
    userId: string,
    tenant: TenantRequestContext,
  ): Promise<string[]> {
    const membership = await this.repository.getMembershipAuthorization(
      userId,
      tenant.organizationId,
    );
    if (!membership || membership.id !== tenant.membershipId) {
      throw new AppError(403, 'TENANT_ACCESS_DENIED', 'Tenant membership is no longer active.');
    }
    return [...membership.roleIds];
  }

  async roleBelongsToOrganization(roleId: string, organizationId: string): Promise<boolean> {
    return this.repository.roleBelongsToOrganization(roleId, organizationId);
  }

  async assertPermission(
    userId: string,
    tenant: TenantRequestContext,
    requiredPermission: string,
  ): Promise<void> {
    const permissions = await this.permissions(userId, tenant);
    if (!permissions.includes(requiredPermission)) {
      throw new AppError(403, 'AUTH_PERMISSION_DENIED', 'Required permission is missing.', {
        permission: requiredPermission,
      });
    }
  }
}
