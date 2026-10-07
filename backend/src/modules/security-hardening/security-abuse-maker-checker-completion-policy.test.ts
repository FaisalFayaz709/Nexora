import { describe, expect, it } from 'vitest';
import {
  assertM19AbuseCaseDenied,
  assertM19CommandSecurityEnvelope,
  assertM19HighRiskCommandRegistry,
  assertM19NoSecurityBypassBoundary,
  assertM19SecurityReleaseEvidence,
  m19SecurityCompletionChecklist,
} from './security-abuse-maker-checker-completion-policy.js';

describe('M19 security abuse and maker-checker completion policy', () => {
  it('validates the high-risk command registry and checklist', () => {
    expect(() => assertM19HighRiskCommandRegistry()).not.toThrow();
    expect(m19SecurityCompletionChecklist().highRiskCommandCount).toBeGreaterThanOrEqual(12);
  });

  it('allows a fully scoped, audited, idempotent high-risk command', () => {
    expect(() => assertM19CommandSecurityEnvelope({
      actorUserId: 'approver-2',
      makerUserId: 'maker-1',
      subjectType: 'PAYMENT',
      subjectId: 'pay-1',
      commandCategory: 'PAYMENT_POSTING',
      actorPermissions: ['payment.create'],
      tenantScoped: true,
      branchScoped: true,
      resourceScoped: true,
      idempotencyKeyPresent: true,
      auditWillBeWritten: true,
      postgresTransactionActive: true,
    })).not.toThrow();
  });

  it('blocks self-approval/self-posting maker-checker violations', () => {
    expect(() => assertM19CommandSecurityEnvelope({
      actorUserId: 'maker-1',
      makerUserId: 'maker-1',
      subjectType: 'PAYMENT',
      subjectId: 'pay-1',
      commandCategory: 'PAYMENT_POSTING',
      actorPermissions: ['payment.create'],
      tenantScoped: true,
      branchScoped: true,
      resourceScoped: true,
      idempotencyKeyPresent: true,
      auditWillBeWritten: true,
      postgresTransactionActive: true,
    })).toThrow('M19-MAKER-CHECKER-ENFORCED');
  });

  it('blocks missing permission and missing idempotency evidence', () => {
    expect(() => assertM19CommandSecurityEnvelope({
      actorUserId: 'approver-2',
      makerUserId: 'maker-1',
      subjectType: 'STOCK_ADJUSTMENT',
      subjectId: 'adj-1',
      commandCategory: 'STOCK_LEDGER_MUTATION',
      actorPermissions: ['inventory.view'],
      tenantScoped: true,
      branchScoped: true,
      resourceScoped: true,
      idempotencyKeyPresent: false,
      auditWillBeWritten: true,
      postgresTransactionActive: true,
    })).toThrow('M19-PRIVILEGE-ESCALATION-DENIAL-MATRIX');
  });

  it('requires abuse cases to be denied and audited', () => {
    expect(() => assertM19AbuseCaseDenied({ caseId: 'IDOR-001', attemptedAction: 'read another tenant asset', crossTenant: true, crossBranch: false, missingPermission: false, resourceScopeViolation: true, denied: true, auditRecorded: true })).not.toThrow();
    expect(() => assertM19AbuseCaseDenied({ caseId: 'IDOR-002', attemptedAction: 'read another tenant invoice', crossTenant: true, crossBranch: false, missingPermission: false, resourceScopeViolation: true, denied: true, auditRecorded: false })).toThrow('M19-ABUSE-CASE-IDOR-TENANT-BRANCH-RESOURCE-SCOPE');
  });

  it('blocks frontend, worker, body tenant and QR authorization bypasses', () => {
    expect(() => assertM19NoSecurityBypassBoundary({ frontendHasServerSideImports: false, workerMutatesCriticalState: false, routeTrustsOrganizationIdFromBody: false, qrTokenGrantsAccessWithoutAuthorization: false })).not.toThrow();
    expect(() => assertM19NoSecurityBypassBoundary({ frontendHasServerSideImports: false, workerMutatesCriticalState: true, routeTrustsOrganizationIdFromBody: false, qrTokenGrantsAccessWithoutAuthorization: false })).toThrow('M19-NO-SECURITY-BYPASS-IN-FRONTEND-OR-WORKER');
  });

  it('keeps production blocked until runtime security evidence is complete', () => {
    expect(() => assertM19SecurityReleaseEvidence({ architectureGatePassed: true, contractGatePassed: true, c16SecurityGatePassed: true, m18FrontendGatePassed: true, abuseSuitePassed: true, makerCheckerSuitePassed: true, idempotencySuitePassed: true, auditRedactionSuitePassed: true, backupRestoreEvidencePassed: true, runtimeCertificationPassed: true, unresolvedCriticalFindings: 0 })).not.toThrow();
    expect(() => assertM19SecurityReleaseEvidence({ architectureGatePassed: true, contractGatePassed: true, c16SecurityGatePassed: true, m18FrontendGatePassed: true, abuseSuitePassed: true, makerCheckerSuitePassed: true, idempotencySuitePassed: true, auditRedactionSuitePassed: true, backupRestoreEvidencePassed: false, runtimeCertificationPassed: true, unresolvedCriticalFindings: 0 })).toThrow('M19-PRODUCTION-RELEASE-BLOCKER-SECURITY-EVIDENCE');
  });
});
