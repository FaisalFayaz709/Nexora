export const PASS_21_SECURITY_RELEASE_GATE = 'PASS_21_SECURITY_RELEASE_GATE' as const;

export interface SecurityReleaseEvidence {
  readonly lockfilePresent: boolean;
  readonly frozenInstallPassed: boolean;
  readonly typecheckPassed: boolean;
  readonly testSuitePassed: boolean;
  readonly securitySmokePassed: boolean;
  readonly crossTenantSuitePassed: boolean;
  readonly privilegeEscalationSuitePassed: boolean;
  readonly uploadAbuseSuitePassed: boolean;
  readonly csrfHeaderSuitePassed: boolean;
  readonly dependencyAuditPassed: boolean;
  readonly codeqlPassed: boolean;
  readonly semgrepPassed: boolean;
  readonly backupRestoreProofPassed: boolean;
  readonly runtimeCertificationPassed: boolean;
  readonly unresolvedCriticalFindings: number;
}

export function evaluateSecurityReleaseEvidence(evidence: SecurityReleaseEvidence): {
  readonly status: 'GO' | 'HOLD';
  readonly blockers: readonly string[];
} {
  const blockers: string[] = [];
  for (const [key, value] of Object.entries(evidence)) {
    if (key === 'unresolvedCriticalFindings') continue;
    if (value !== true) blockers.push(key);
  }
  if (evidence.unresolvedCriticalFindings > 0) blockers.push('unresolvedCriticalFindings');
  return { status: blockers.length ? 'HOLD' : 'GO', blockers };
}
