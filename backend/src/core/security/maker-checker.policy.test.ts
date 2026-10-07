import { describe, expect, it } from 'vitest';
import { MakerCheckerPolicy, assertHighRiskMakerCheckerDecision } from './maker-checker.policy.js';

describe('maker-checker baseline', () => {
  const policy = new MakerCheckerPolicy();

  it('rejects the creator as sole high-risk approver', () => {
    expect(() => policy.assertDifferentActor('u1', 'u1')).toThrow();
  });

  it('allows a different actor', () => {
    expect(() => policy.assertDifferentActor('u2', 'u1')).not.toThrow();
  });
});

it('M19-MAKER-CHECKER-ENFORCED requires distinct checker and audit evidence for high-risk subjects', () => {
  expect(() => assertHighRiskMakerCheckerDecision({ subject: 'PAYMENT_POSTING', makerUserId: 'maker-1', checkerUserId: 'checker-2', auditAction: 'PAYMENT_POSTED' })).not.toThrow();
  expect(() => assertHighRiskMakerCheckerDecision({ subject: 'PAYMENT_POSTING', makerUserId: 'maker-1', checkerUserId: 'maker-1', auditAction: 'PAYMENT_POSTED' })).toThrow('MAKER_CHECKER_VIOLATION');
  expect(() => assertHighRiskMakerCheckerDecision({ subject: 'PAYMENT_POSTING', makerUserId: 'maker-1', checkerUserId: 'checker-2', auditAction: null })).toThrow('MAKER_CHECKER_AUDIT_REQUIRED');
});
