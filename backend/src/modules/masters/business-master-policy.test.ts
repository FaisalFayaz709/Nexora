import { describe, expect, it } from 'vitest';
import {
  assertBusinessMasterEditableFields,
  buildBusinessMasterListPolicy,
  BusinessMasterCompletionChecklist,
} from './business-master-policy.js';

describe('Pass C2 business master policy', () => {
  it('rejects immutable business master fields in update payloads', () => {
    expect(() =>
      assertBusinessMasterEditableFields('CUSTOMER', { code: 'C-002', name: 'Updated Customer' }),
    ).toThrow(/immutable field/);
  });

  it('publishes bounded list policy for branch-scoped warehouses', () => {
    const policy = buildBusinessMasterListPolicy('WAREHOUSE');
    expect(policy.branchScoped).toBe(true);
    expect(policy.maxPageSize).toBe(100);
    expect(policy.requiredGuards).toContain('warehouse.view');
  });

  it('keeps completion checklist stronger than CRUD-only delivery', () => {
    expect(BusinessMasterCompletionChecklist).toContain('repository_owns_prisma_access_only');
    expect(BusinessMasterCompletionChecklist).toContain('create_update_mutations_are_audited');
    expect(BusinessMasterCompletionChecklist).toContain('runtime_tests_cover_cross_tenant_and_branch_denial');
  });
});
