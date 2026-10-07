import { describe, expect, it } from 'vitest';
import { evaluatePass23RuntimeDeploymentDecision, type Pass23RuntimeDeploymentEvidence } from './pass-23-runtime-deployment-policy.js';

const complete: Pass23RuntimeDeploymentEvidence = {
  pnpmLockfilePresent: true,
  frozenInstallPassed: true,
  staticVerificationPassed: true,
  lintPassed: true,
  typecheckPassed: true,
  testsPassed: true,
  buildPassed: true,
  prismaValidatePassed: true,
  migrationDeployPassed: true,
  seedPassed: true,
  dockerComposeConfigPassed: true,
  dockerComposeBuildPassed: true,
  postgresHealthy: true,
  redisHealthy: true,
  minioHealthy: true,
  apiReady: true,
  workerReady: true,
  webReady: true,
  nginxHealthzReady: true,
  minioUploadDownloadProofPassed: true,
  fullWorkflowE2ePassed: true,
  securitySmokePassed: true,
  evidenceManifestWritten: true,
  failedCriticalRuntimeChecks: 0,
};

describe('PASS_23 runtime deployment release decision', () => {
  it('keeps the release on HOLD when lockfile/frozen install evidence is missing', () => {
    const decision = evaluatePass23RuntimeDeploymentDecision({ ...complete, pnpmLockfilePresent: false, frozenInstallPassed: false });
    expect(decision.status).toBe('HOLD_RUNTIME_EVIDENCE_REQUIRED');
    expect(decision.sourceGateIsNotRuntimeCertification).toBe(true);
    expect(decision.cannotClaimProductionReadiness).toBe(true);
    expect(decision.missing).toContain('pnpmLockfilePresent');
    expect(decision.missing).toContain('frozenInstallPassed');
  });

  it('returns NO-GO when a critical runtime check failed', () => {
    const decision = evaluatePass23RuntimeDeploymentDecision({ ...complete, failedCriticalRuntimeChecks: 1 });
    expect(decision.status).toBe('NO_GO_RUNTIME_DEPLOYMENT_FAILED');
    expect(decision.cannotClaimProductionReadiness).toBe(true);
  });

  it('returns GO only with complete runtime evidence', () => {
    const decision = evaluatePass23RuntimeDeploymentDecision(complete);
    expect(decision.status).toBe('GO_RUNTIME_DEPLOYMENT_CERTIFIED');
    expect(decision.missing).toEqual([]);
  });
});
