import { describe, expect, it } from 'vitest';
import { OrganizationService } from './organization.service.js';

describe('organization branch scope', () => {
  it('rejects branch-scoped creation of another branch', async () => {
    const service = new OrganizationService({} as never);
    await expect(
      service.createBranch(
        { membershipId: 'm1', organizationId: 'o1', branchId: 'b1' },
        { userId: 'u1', ip: null },
        { code: 'B2', name: 'Branch 2' },
      ),
    ).rejects.toMatchObject({ code: 'ORGANIZATION_BRANCH_SCOPE_DENIED' });
  });

  it('rejects a department target outside the active branch', async () => {
    const service = new OrganizationService({} as never);
    await expect(
      service.createDepartment(
        { membershipId: 'm1', organizationId: 'o1', branchId: 'b1' },
        { userId: 'u1', ip: null },
        { branchId: 'b2', name: 'Finance' },
      ),
    ).rejects.toMatchObject({ code: 'ORGANIZATION_BRANCH_SCOPE_DENIED' });
  });
});
