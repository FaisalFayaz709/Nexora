import { describe, expect, it } from 'vitest';
import {
  backendBoundaryTransactionRules,
  criticalTransactionalWorkflows,
  isCriticalTransactionalWorkflow,
} from './backend-boundary-transaction-audit.js';

describe('Pass R17 backend boundary and transaction audit policy', () => {
  it('locks the source-level backend architecture rules as blockers', () => {
    expect(backendBoundaryTransactionRules).toHaveLength(6);
    expect(backendBoundaryTransactionRules.every((rule) => rule.severity === 'blocker')).toBe(true);
    expect(backendBoundaryTransactionRules.map((rule) => rule.id)).toEqual([
      'R17-ROUTE-CONTROLLER-NO-DB',
      'R17-CROSS-MODULE-FACADE-ONLY',
      'R17-CRITICAL-TRANSACTION-BOUNDARY',
      'R17-NO-ASYNC-SOURCE-OF-TRUTH',
      'R17-TENANT-BRANCH-AUDIT',
      'R17-FRONTEND-BACKEND-SEPARATION',
    ]);
  });

  it('tracks critical workflows that must not be moved to asynchronous source-of-truth handling', () => {
    expect(criticalTransactionalWorkflows).toContain('goods receipt');
    expect(criticalTransactionalWorkflows).toContain('payment posting and allocation');
    expect(criticalTransactionalWorkflows).toContain('technician offline-sync command application');
    expect(isCriticalTransactionalWorkflow('Goods Receipt')).toBe(true);
    expect(isCriticalTransactionalWorkflow('email notification')).toBe(false);
  });
});
