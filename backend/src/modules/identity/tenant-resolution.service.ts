import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import { IdentityRepository } from './identity.repository.js';

export class TenantResolutionService {
  constructor(private readonly repository: IdentityRepository) {}

  async userHasActiveMembership(userId: string, organizationId: string): Promise<boolean> {
    return this.repository.userHasActiveMembership(userId, organizationId);
  }

  async resolve(
    userId: string,
    requestedOrganizationId?: string,
  ): Promise<TenantRequestContext> {
    if (requestedOrganizationId) {
      const membership = await this.repository.getMembershipAuthorization(
        userId,
        requestedOrganizationId,
      );

      if (!membership) {
        throw new AppError(
          403,
          'TENANT_ACCESS_DENIED',
          'The authenticated user does not have an active membership in the requested organization.',
        );
      }

      return {
        membershipId: membership.id,
        organizationId: membership.organizationId,
        branchId: membership.branchId,
      };
    }

    const memberships = (await this.repository.listMemberships(userId)).filter(
      (membership) => membership.status === 'ACTIVE',
    );

    if (memberships.length === 0) {
      throw new AppError(403, 'TENANT_MEMBERSHIP_REQUIRED', 'No active organization membership exists.');
    }

    if (memberships.length > 1) {
      throw new AppError(
        400,
        'TENANT_CONTEXT_REQUIRED',
        'An organization context must be selected for this request.',
      );
    }

    const [membership] = memberships;
    return {
      membershipId: membership!.id,
      organizationId: membership!.organizationId,
      branchId: membership!.branchId,
    };
  }
}
