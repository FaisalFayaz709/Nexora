import { describe, expect, it } from 'vitest';
import {
  PASS_22_REQUIRED_LAYER_EVIDENCE,
  assertPass22LayerEvidenceComplete,
  evaluatePass22TestingReleaseDecision,
} from './pass-22-testing-completion-policy.js';

describe('PASS_22_TESTING_COMPLETION backend policy', () => {
  it('requires every blueprint test layer to have source and runtime evidence contract', () => {
    expect(assertPass22LayerEvidenceComplete()).toBe(true);
    expect(PASS_22_REQUIRED_LAYER_EVIDENCE.map((l) => l.layer)).toContain('UNIT_BUSINESS_RULES');
    expect(PASS_22_REQUIRED_LAYER_EVIDENCE.map((l) => l.layer)).toContain('REPOSITORY_POSTGRES_INTEGRATION');
    expect(PASS_22_REQUIRED_LAYER_EVIDENCE.map((l) => l.layer)).toContain('FASTIFY_API_INTEGRATION');
    expect(PASS_22_REQUIRED_LAYER_EVIDENCE.map((l) => l.layer)).toContain('CROSS_MODULE_WORKFLOW_INTEGRATION');
    expect(PASS_22_REQUIRED_LAYER_EVIDENCE.map((l) => l.layer)).toContain('FRONTEND_COMPONENT_AND_HOOKS');
    expect(PASS_22_REQUIRED_LAYER_EVIDENCE.map((l) => l.layer)).toContain('BROWSER_E2E_FULL_STACK');
    expect(PASS_22_REQUIRED_LAYER_EVIDENCE.map((l) => l.layer)).toContain('SECURITY_ABUSE_AUTHORIZATION');
    expect(PASS_22_REQUIRED_LAYER_EVIDENCE.map((l) => l.layer)).toContain('MIGRATION_SCHEMA_EVOLUTION');
    expect(PASS_22_REQUIRED_LAYER_EVIDENCE.map((l) => l.layer)).toContain('PERFORMANCE_CRITICAL_PATHS');
    expect(PASS_22_REQUIRED_LAYER_EVIDENCE.map((l) => l.layer)).toContain('BACKUP_RESTORE_OPERATIONAL_RECOVERY');
  });

  it('keeps final decision on HOLD when runtime evidence is missing', () => {
    const decision = evaluatePass22TestingReleaseDecision({
      lockfilePresent: false,
      frozenInstallPassed: false,
      typecheckPassed: false,
      lintPassed: false,
      unitTestsPassed: false,
      integrationTestsPassed: false,
      workflowTestsPassed: false,
      browserE2ePassed: false,
      securityTestsPassed: false,
      migrationTestsPassed: false,
      performanceSmokePassed: false,
      backupRestorePassed: false,
      dockerRuntimePassed: false,
      evidenceArtifactsRecorded: false,
    });
    expect(decision.status).toBe('HOLD_TESTING_RUNTIME_EVIDENCE_REQUIRED');
    expect(decision.sourceGateIsNotRuntimeCertification).toBe(true);
    expect(decision.cannotClaimProductionReadiness).toBe(true);
    expect(decision.missing).toContain('lockfilePresent');
  });

  it('allows GO only when all strict runtime gates are true', () => {
    const decision = evaluatePass22TestingReleaseDecision({
      lockfilePresent: true,
      frozenInstallPassed: true,
      typecheckPassed: true,
      lintPassed: true,
      unitTestsPassed: true,
      integrationTestsPassed: true,
      workflowTestsPassed: true,
      browserE2ePassed: true,
      securityTestsPassed: true,
      migrationTestsPassed: true,
      performanceSmokePassed: true,
      backupRestorePassed: true,
      dockerRuntimePassed: true,
      evidenceArtifactsRecorded: true,
    });
    expect(decision.status).toBe('GO_TESTING_RUNTIME_CERTIFIED');
    expect(decision.missing).toEqual([]);
  });
});
