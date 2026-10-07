import { describe, expect, it } from 'vitest';
import { evaluateSecurityReleaseEvidence } from './security-release-gate.js';

describe('PASS 21 production security release gate', () => {
  const go = {
    lockfilePresent: true,
    frozenInstallPassed: true,
    typecheckPassed: true,
    testSuitePassed: true,
    securitySmokePassed: true,
    crossTenantSuitePassed: true,
    privilegeEscalationSuitePassed: true,
    uploadAbuseSuitePassed: true,
    csrfHeaderSuitePassed: true,
    dependencyAuditPassed: true,
    codeqlPassed: true,
    semgrepPassed: true,
    backupRestoreProofPassed: true,
    runtimeCertificationPassed: true,
    unresolvedCriticalFindings: 0,
  } as const;

  it('allows GO only when every security/runtime proof is present', () => {
    expect(evaluateSecurityReleaseEvidence(go).status).toBe('GO');
    expect(evaluateSecurityReleaseEvidence({ ...go, runtimeCertificationPassed: false }).status).toBe('HOLD');
  });
});
