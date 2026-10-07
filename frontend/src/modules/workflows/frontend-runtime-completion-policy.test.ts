import { describe, expect, it } from 'vitest';
import type { FrontendWorkflowCommand } from '@nexora/shared';
import {
  assertM18CommandExecutionGuard,
  assertM18NoFrontendCriticalShortcuts,
  buildM18CommandHeaders,
  resolveM18CommandGate,
} from './frontend-runtime-completion-policy';

const command: FrontendWorkflowCommand = {
  id: 'post-payment',
  stage: 'FINANCE_MATCH_POST_PAY',
  label: 'Post payment',
  method: 'POST',
  endpointTemplate: '/payments',
  requiredPermission: 'payment.create',
  requiresIdempotencyKey: true,
  destructiveOrHighRisk: true,
  requiredStatus: ['APPROVED'],
  invalidates: ['payments'],
  defaultPayload: {},
};

describe('M18 frontend runtime command gates', () => {
  it('M18-WORKFLOW-COMMAND-PERMISSION-GATE blocks missing permission', () => {
    const decision = resolveM18CommandGate(command, {
      permissions: ['payment.view'],
      endpointResolved: true,
      confirmed: true,
      idempotencyKey: 'pay-1',
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.join(' ')).toContain('missing payment.create');
  });

  it('M18-WORKFLOW-COMMAND-IDEMPOTENCY-GATE requires a key for retry-sensitive actions', () => {
    expect(() => assertM18CommandExecutionGuard(command, {
      permissions: ['payment.create'],
      endpointResolved: true,
      confirmed: true,
      idempotencyKey: '',
    })).toThrow('Idempotency-Key');
  });

  it('M18-WORKFLOW-COMMAND-HIGH-RISK-CONFIRMATION blocks unconfirmed high-risk actions', () => {
    expect(resolveM18CommandGate(command, {
      permissions: ['payment.create'],
      endpointResolved: true,
      confirmed: false,
      idempotencyKey: 'pay-1',
    }).allowed).toBe(false);
  });

  it('M18-WORKFLOW-COMMAND-STATUS-EVIDENCE-GATE blocks impossible visible status', () => {
    expect(resolveM18CommandGate(command, {
      permissions: ['payment.create'],
      endpointResolved: true,
      confirmed: true,
      idempotencyKey: 'pay-1',
      statusEvidence: 'DRAFT',
    }).allowed).toBe(false);
  });

  it('M18-WORKFLOW-COMMAND-IDEMPOTENCY-GATE builds request headers', () => {
    expect(buildM18CommandHeaders(command, ' pay-1 ')).toEqual({ 'Idempotency-Key': 'pay-1' });
  });

  it('M18-NO-FRONTEND-CRITICAL-STATE-BYPASS rejects server-side shortcut imports', () => {
    expect(() => assertM18NoFrontendCriticalShortcuts("import { PrismaClient } from '@prisma/" + "client';")).toThrow('@prisma/' + 'client');
  });
});
