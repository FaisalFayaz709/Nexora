import { describe, expect, it } from 'vitest';
import { AppError } from '../http/errors.js';
import { assertAllowedStatusTransition, nextStatusForCommand } from './status-transition.js';

describe('status-transition core control', () => {
  const allowed = {
    DRAFT: ['SUBMITTED'],
    SUBMITTED: ['APPROVED', 'REJECTED'],
    APPROVED: [],
    REJECTED: [],
  } as const;

  it('allows explicit state-machine transitions only', () => {
    expect(() => assertAllowedStatusTransition({
      subjectType: 'PurchaseRequest',
      currentStatus: 'DRAFT',
      nextStatus: 'SUBMITTED',
      allowed,
    })).not.toThrow();
  });

  it('rejects free status patching', () => {
    expect(() => assertAllowedStatusTransition({
      subjectType: 'PurchaseRequest',
      currentStatus: 'DRAFT',
      nextStatus: 'APPROVED',
      allowed,
      action: 'approve',
    })).toThrow(AppError);
  });

  it('maps reviewed command names to next statuses', () => {
    expect(nextStatusForCommand('submit', { submit: 'SUBMITTED' } as const)).toBe('SUBMITTED');
  });
});
