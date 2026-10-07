import { describe, expect, it } from 'vitest';
import { ApprovalEnginePassC5Manifest } from '@nexora/shared';
import { approvalEngineChecklist } from './approval-engine-policy.js';

const runtimeScenarios = [
  'C5-APPROVAL-DEFINITION-CONDITION-MATCHING',
  'C5-APPROVAL-SEQUENTIAL-STEP-ACTIVATION',
  'C5-APPROVAL-MIN-APPROVALS-GATE',
  'C5-MAKER-CHECKER-CREATOR-BLOCKED',
  'C5-APPROVAL-INELIGIBLE-ACTOR-DENIED',
  'C5-APPROVAL-DUPLICATE-ACTOR-DENIED',
  'C5-APPROVAL-REJECTION-COMMENT-REQUIRED',
  'C5-APPROVAL-RETURN-FOR-CORRECTION',
  'C5-APPROVAL-SUBJECT-FACADE-DECISION',
  'C5-APPROVAL-CROSS-TENANT-IDOR-DENIED',
  'C5-APPROVAL-AUDIT-ACTION-RECORDED',
];

describe('C5 approval runtime acceptance evidence registry', () => {
  it('locks the required approval and maker-checker scenarios for local runtime certification', () => {
    const checklist = approvalEngineChecklist();
    expect(ApprovalEnginePassC5Manifest.pass).toBe('C5_APPROVAL_ENGINE_MAKER_CHECKER');
    expect(checklist.runtimeEvidenceRequired).toEqual(
      expect.arrayContaining([
        'creator-cannot-self-approve-high-risk-subject',
        'role-step-approver-can-approve-when-membership-is-active',
        'final-approval-updates-subject-via-registered-domain-decision-handler',
        'cross-tenant-approval-idor-is-denied',
      ]),
    );
    expect(runtimeScenarios).toHaveLength(11);
  });

  it('preserves the rule that approval state is not mutated asynchronously', () => {
    expect(ApprovalEnginePassC5Manifest.forbiddenPatterns).toContain(
      'no-async-approval-state-mutation-through-bullmq',
    );
    expect(approvalEngineChecklist().transactionBoundary).toContain(
      'approval-request-plus-step-plus-action-plus-subject-decision-plus-audit',
    );
  });
});
