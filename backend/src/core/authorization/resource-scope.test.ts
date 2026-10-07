import { describe, expect, it } from 'vitest';
import { AppError } from '../http/errors.js';
import { assertBranchScope, assertTenantScope, tenantBranchWhere, tenantWhere } from './resource-scope.js';

describe('resource scope core controls', () => {
  const tenant = { membershipId: 'mem-1', organizationId: 'org-1', branchId: 'branch-1' };

  it('builds tenant and tenant+branch where filters', () => {
    expect(tenantWhere(tenant)).toEqual({ organizationId: 'org-1' });
    expect(tenantBranchWhere(tenant)).toEqual({ organizationId: 'org-1', branchId: 'branch-1' });
  });

  it('rejects records from another organization', () => {
    expect(() => assertTenantScope(tenant, { organizationId: 'org-2' }, 'Project')).toThrow(AppError);
  });

  it('rejects records outside active branch scope', () => {
    expect(() => assertBranchScope(tenant, { organizationId: 'org-1', branchId: 'branch-2' }, 'Warehouse')).toThrow(AppError);
  });
});
