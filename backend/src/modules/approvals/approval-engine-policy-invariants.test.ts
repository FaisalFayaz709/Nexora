import { describe, expect, it } from 'vitest';
import { AppError } from '../../core/http/errors.js';
import {
  assertApprovalDecisionAllowed,
  assertMakerCheckerPolicy,
} from './approval-engine-policy.js';

function expectAppErrorCode(action: () => void, code: string) {
  try {
    action();
    throw new Error(`Expected AppError ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
  }
}

describe('Approval engine invariant policy', () => {
  it('blocks maker-checker self action with the locked violation code', () => {
    expectAppErrorCode(
      () =>
        assertMakerCheckerPolicy({
          requestedById: '11111111-1111-4111-8111-111111111111',
          actorUserId: '11111111-1111-4111-8111-111111111111',
          action: 'APPROVE',
          subjectType: 'PurchaseRequest',
        }),
      'MAKER_CHECKER_VIOLATION',
    );
  });

  it('requires rejection comments with the locked validation code', () => {
    expectAppErrorCode(
      () =>
        assertApprovalDecisionAllowed({
          currentStatus: 'PENDING',
          action: 'REJECT',
          comment: '   ',
        }),
      'APPROVAL_REJECTION_COMMENT_REQUIRED',
    );
  });

  it('allows an open approval with a valid reject comment', () => {
    expect(() =>
      assertApprovalDecisionAllowed({
        currentStatus: 'IN_PROGRESS',
        action: 'REJECT',
        comment: 'Budget is not approved.',
      }),
    ).not.toThrow();
  });
});
