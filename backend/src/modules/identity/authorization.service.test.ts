import { describe, expect, it } from 'vitest';
import { AuthorizationService } from './authorization.service.js';

const tenant = {
  membershipId: 'm1',
  organizationId: 'o1',
  branchId: null,
};

describe('RBAC authorization', () => {
  it('requires the exact canonical permission', async () => {
    const service = new AuthorizationService({
      getMembershipAuthorization: async () => ({
        id: 'm1',
        organizationId: 'o1',
        branchId: null,
        status: 'ACTIVE',
        permissionKeys: ['branch.view'],
      }),
    } as never);

    await expect(service.assertPermission('u1', tenant, 'branch.view')).resolves.toBeUndefined();
    await expect(service.assertPermission('u1', tenant, 'branch.update')).rejects.toMatchObject({
      code: 'AUTH_PERMISSION_DENIED',
    });
  });
});
