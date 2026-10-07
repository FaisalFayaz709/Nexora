import { describe, expect, it } from 'vitest';
import {
  assertM22ApprovalChain,
  assertM22EvidenceBinder,
  assertM22GateCatalog,
  assertM22LockedComplianceCarryForward,
  assertM22ProductionDecision,
  assertM22RuntimeEvidenceZeroDefect,
  m22ProductionGoNoGoChecklist,
} from './m22-production-go-nogo-policy.js';
import { M22ProductionGateIds } from '@nexora/shared';

describe('M22 production Go/No-Go final policy', () => {
  it('keeps every final production gate runtime-required and production-blocking', () => {
    assertM22GateCatalog();
    expect(m22ProductionGoNoGoChecklist()).toHaveLength(11);
  });

  it('requires a complete M0-M21 locked compliance carry-forward with zero deviations', () => {
    expect(() => assertM22LockedComplianceCarryForward({
      architectureGatePassed: true,
      contractGatePassed: true,
      databaseFoundationGatePassed: true,
      auditM0M17Passed: true,
      priorM21PreflightPassed: true,
      lockedStackDeviationCount: 0,
      lockedSpecDeviationCount: 0,
    })).not.toThrow();
  });

  it('rejects production GO when a locked stack deviation exists', () => {
    expect(() => assertM22LockedComplianceCarryForward({
      architectureGatePassed: true,
      contractGatePassed: true,
      databaseFoundationGatePassed: true,
      auditM0M17Passed: true,
      priorM21PreflightPassed: true,
      lockedStackDeviationCount: 1,
      lockedSpecDeviationCount: 0,
    })).toThrow('M22-LOCKED-SPEC-ARCHITECTURE-STACK-BASELINE');
  });

  it('requires runtime evidence with zero failed and zero skipped critical scenarios', () => {
    expect(() => assertM22RuntimeEvidenceZeroDefect({
      pnpmLockfilePresent: true,
      frozenInstallPassed: true,
      staticGatesPassed: true,
      migrationsPassed: true,
      seedPassed: true,
      dockerRuntimePassed: true,
      fullLifecycleE2ePassed: true,
      securitySmokePassed: true,
      makerCheckerPassed: true,
      performanceSloPassed: true,
      backupRestorePassed: true,
      observabilityPassed: true,
      postDeploymentSmokePassed: true,
      rollbackWindowPrepared: true,
      failedCriticalScenarios: 0,
      skippedCriticalScenarios: 0,
      unresolvedCriticalDefects: 0,
      unresolvedHighRisksWithoutApproval: 0,
    })).not.toThrow();
  });

  it('blocks final GO if any critical scenario is skipped', () => {
    expect(() => assertM22RuntimeEvidenceZeroDefect({
      pnpmLockfilePresent: true,
      frozenInstallPassed: true,
      staticGatesPassed: true,
      migrationsPassed: true,
      seedPassed: true,
      dockerRuntimePassed: true,
      fullLifecycleE2ePassed: true,
      securitySmokePassed: true,
      makerCheckerPassed: true,
      performanceSloPassed: true,
      backupRestorePassed: true,
      observabilityPassed: true,
      postDeploymentSmokePassed: true,
      rollbackWindowPrepared: true,
      failedCriticalScenarios: 0,
      skippedCriticalScenarios: 1,
      unresolvedCriticalDefects: 0,
      unresolvedHighRisksWithoutApproval: 0,
    })).toThrow('M22-FULL-LIFECYCLE-E2E-ZERO-FAIL-SKIP');
  });

  it('requires all owner approvals and release responsibility assignments', () => {
    expect(() => assertM22ApprovalChain({
      productOwnerApproval: true,
      engineeringOwnerApproval: true,
      securityOwnerApproval: true,
      operationsOwnerApproval: true,
      rollbackOwnerNamed: true,
      dataBackupOwnerNamed: true,
      goNoGoMeetingRecorded: true,
    })).not.toThrow();
  });

  it('requires a complete passed evidence binder for every M22 gate', () => {
    expect(() => assertM22EvidenceBinder(M22ProductionGateIds.map((gateId) => ({
      gateId,
      status: 'PASSED' as const,
      evidenceFiles: [`certification-output/pass-m22/${gateId}.json`],
      notes: ['evidence attached'],
    })))).not.toThrow();
  });

  it('blocks production when final decision remains HOLD', () => {
    expect(() => assertM22ProductionDecision({
      releaseCandidateId: 'rc-2026-09-06-001',
      sourceArchiveChecksum: 'sha256:source',
      manifestChecksum: 'sha256:manifest',
      evidenceBinderPath: 'certification-output/pass-m22/evidence-binder.json',
      runtimeEvidence: {
        pnpmLockfilePresent: true,
        frozenInstallPassed: true,
        staticGatesPassed: true,
        migrationsPassed: true,
        seedPassed: true,
        dockerRuntimePassed: true,
        fullLifecycleE2ePassed: true,
        securitySmokePassed: true,
        makerCheckerPassed: true,
        performanceSloPassed: true,
        backupRestorePassed: true,
        observabilityPassed: true,
        postDeploymentSmokePassed: true,
        rollbackWindowPrepared: true,
        failedCriticalScenarios: 0,
        skippedCriticalScenarios: 0,
        unresolvedCriticalDefects: 0,
        unresolvedHighRisksWithoutApproval: 0,
      },
      approvals: {
        productOwnerApproval: true,
        engineeringOwnerApproval: true,
        securityOwnerApproval: true,
        operationsOwnerApproval: true,
        rollbackOwnerNamed: true,
        dataBackupOwnerNamed: true,
        goNoGoMeetingRecorded: true,
      },
      decision: 'HOLD',
      decisionReason: 'runtime evidence not attached',
      decidedAt: new Date().toISOString(),
    })).toThrow('M22-FINAL-PRODUCTION-GO-NOGO-DECISION');
  });
});
