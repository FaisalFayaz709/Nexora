import { describe, expect, it } from 'vitest';
import {
  approvalEngineChecklist,
  assertApprovalDecisionAllowed,
  assertApprovalDefinitionConfiguration,
  assertMakerCheckerPolicy,
} from './approval-engine-policy.js';

describe('C5 approval engine and maker-checker policy', () => {
  it('accepts contiguous role/user step definitions for a registered subject', () => {
    expect(() =>
      assertApprovalDefinitionConfiguration({
        subjectType: 'PurchaseOrder',
        condition: { all: [{ field: 'amount', operator: 'GT', value: 250000 }] },
        steps: [
          {
            sequence: 1,
            approverType: 'ROLE',
            approverRef: '11111111-1111-4111-8111-111111111111',
            minApprovals: 1,
          },
          {
            sequence: 2,
            approverType: 'USER',
            approverRef: '22222222-2222-4222-8222-222222222222',
            minApprovals: 1,
          },
        ],
      }),
    ).not.toThrow();
  });

  it('rejects approval definitions with sequence gaps', () => {
    expect(() =>
      assertApprovalDefinitionConfiguration({
        subjectType: 'PurchaseRequest',
        condition: null,
        steps: [
          {
            sequence: 1,
            approverType: 'ROLE',
            approverRef: '11111111-1111-4111-8111-111111111111',
            minApprovals: 1,
          },
          {
            sequence: 3,
            approverType: 'ROLE',
            approverRef: '22222222-2222-4222-8222-222222222222',
            minApprovals: 1,
          },
        ],
      }),
    ).toThrow(/contiguous/);
  });

  it('requires a rejection comment', () => {
    expect(() =>
      assertApprovalDecisionAllowed({
        currentStatus: 'IN_PROGRESS',
        action: 'REJECT',
        comment: 'Budget no longer available.',
      }),
    ).not.toThrow();

    expect(() =>
      assertApprovalDecisionAllowed({
        currentStatus: 'IN_PROGRESS',
        action: 'REJECT',
        comment: ' ',
      }),
    ).toThrow(/rejection comment/);
  });

  it('blocks creator self-action through maker-checker policy', () => {
    expect(() =>
      assertMakerCheckerPolicy({
        subjectType: 'PurchaseOrder',
        requestedById: '11111111-1111-4111-8111-111111111111',
        actorUserId: '11111111-1111-4111-8111-111111111111',
        action: 'APPROVE',
      }),
    ).toThrow(/creator\/requester/);
  });

  it('documents the locked C5 runtime evidence checklist', () => {
    const checklist = approvalEngineChecklist();
    expect(checklist.transactionBoundary).toContain('postgresql-transaction');
    expect(checklist.runtimeEvidenceRequired).toContain('cross-tenant-approval-idor-is-denied');
  });
});
