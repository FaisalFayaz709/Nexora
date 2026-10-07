import { describe, expect, it } from 'vitest';
import { evaluatePass22TestingReleaseDecision } from './pass-22-testing-completion-policy.js';

describe('PASS_22 runtime evidence production block', () => {
  it('does not allow production GO when browser E2E is missing', () => {
    const base = {
      lockfilePresent: true,
      frozenInstallPassed: true,
      typecheckPassed: true,
      lintPassed: true,
      unitTestsPassed: true,
      integrationTestsPassed: true,
      workflowTestsPassed: true,
      browserE2ePassed: false,
      securityTestsPassed: true,
      migrationTestsPassed: true,
      performanceSmokePassed: true,
      backupRestorePassed: true,
      dockerRuntimePassed: true,
      evidenceArtifactsRecorded: true,
    };
    const decision = evaluatePass22TestingReleaseDecision(base);
    expect(decision.status).toBe('HOLD_TESTING_RUNTIME_EVIDENCE_REQUIRED');
    expect(decision.missing).toContain('browserE2ePassed');
  });
});
