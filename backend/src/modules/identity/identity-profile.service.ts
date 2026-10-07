import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { IdentityFacade } from './identity.facade.js';
import { IdentityRepository } from './identity.repository.js';

export class IdentityProfileService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly facade: IdentityFacade,
  ) {}

  async me(input: {
    userId: string;
    tenant: TenantRequestContext | undefined;
    requestedOrganizationId: string | undefined;
  }) {
    const user = await this.repository.findUserById(input.userId);
    if (!user) {
      throw new AppError(
        401,
        'AUTH_USER_NOT_FOUND',
        'Authenticated user no longer exists.',
      );
    }

    const memberships = await this.repository.listMemberships(user.id);
    let activeMembership = null;
    let permissions: string[] = [];

    try {
      if (input.tenant) {
        activeMembership =
          memberships.find((item) => item.id === input.tenant!.membershipId) ?? null;
        permissions = await this.facade.permissions(user.id, input.tenant);
      } else if (
        input.requestedOrganizationId ||
        memberships.filter((item) => item.status === 'ACTIVE').length === 1
      ) {
        activeMembership = null;
      }
    } catch {
      activeMembership = null;
      permissions = [];
    }

    return {
      id: user.id,
      email: user.email,
      memberships,
      activeMembership,
      permissions,
    };
  }
}
