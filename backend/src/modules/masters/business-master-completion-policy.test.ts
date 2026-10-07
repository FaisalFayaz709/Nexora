import { describe, expect, it } from 'vitest';
import { BusinessMasterCompletionRows } from '@nexora/shared';
import {
  assertBusinessMasterCompletionMatrix,
  RuntimeBusinessMasterSubjects,
  businessMasterCompletionFor,
} from './business-master-completion-policy.js';

describe('M7 business master completion policy', () => {
  it('covers every runtime business master subject', () => {
    expect(assertBusinessMasterCompletionMatrix()).toBe(true);
    for (const subject of RuntimeBusinessMasterSubjects) {
      const row = businessMasterCompletionFor(subject);
      expect(row.productionStatus).toBe('RUNTIME_CERTIFICATION_PENDING');
      expect(row.capabilities).toContain('tenant_scoped_repository');
      expect(row.capabilities).toContain('audit_on_mutation');
      expect(row.capabilities).toContain('import_template');
    }
  });

  it('keeps the public master-data completion set intentionally bounded', () => {
    const runtimeSubjects = BusinessMasterCompletionRows.map((row) => row.subject).sort();
    expect(runtimeSubjects).toEqual([...RuntimeBusinessMasterSubjects].sort());
  });
});
