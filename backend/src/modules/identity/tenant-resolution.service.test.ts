import { describe, expect, it } from 'vitest';
import { TenantResolutionService } from './tenant-resolution.service.js';

function fakeRepository(memberships: Array<{
  id: string;
  organizationId: string;
  branchId: string | null;
  status: string;
}>) {
  return {
    listMemberships: async () => memberships,
    getMembershipAuthorization: async (_userId: string, organizationId: string) => {
      const found = memberships.find(
        (item) => item.organizationId === organizationId && item.status === 'ACTIVE',
      );
      return found ? { ...found, permissionKeys: [] } : null;
    },
  };
}

describe('tenant resolution', () => {
  it('auto-selects the only active membership', async () => {
    const service = new TenantResolutionService(fakeRepository([
      { id: 'm1', organizationId: 'o1', branchId: null, status: 'ACTIVE' },
    ]) as never);

    await expect(service.resolve('u1')).resolves.toEqual({
      membershipId: 'm1',
      organizationId: 'o1',
      branchId: null,
    });
  });

  it('requires tenant selection when multiple active memberships exist', async () => {
    const service = new TenantResolutionService(fakeRepository([
      { id: 'm1', organizationId: 'o1', branchId: null, status: 'ACTIVE' },
      { id: 'm2', organizationId: 'o2', branchId: null, status: 'ACTIVE' },
    ]) as never);

    await expect(service.resolve('u1')).rejects.toMatchObject({
      code: 'TENANT_CONTEXT_REQUIRED',
    });
  });

  it('does not trust an organization id that is not an active membership', async () => {
    const service = new TenantResolutionService(fakeRepository([
      { id: 'm1', organizationId: 'o1', branchId: null, status: 'ACTIVE' },
    ]) as never);

    await expect(service.resolve('u1', 'o2')).rejects.toMatchObject({
      code: 'TENANT_ACCESS_DENIED',
    });
  });
});
