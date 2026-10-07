export type Pass23RuntimeDecisionStatus =
  | 'GO_RUNTIME_DEPLOYMENT_CERTIFIED'
  | 'HOLD_RUNTIME_EVIDENCE_REQUIRED'
  | 'NO_GO_RUNTIME_DEPLOYMENT_FAILED';

export interface Pass23RuntimeDeploymentEvidence {
  readonly pnpmLockfilePresent: boolean;
  readonly frozenInstallPassed: boolean;
  readonly staticVerificationPassed: boolean;
  readonly lintPassed: boolean;
  readonly typecheckPassed: boolean;
  readonly testsPassed: boolean;
  readonly buildPassed: boolean;
  readonly prismaValidatePassed: boolean;
  readonly migrationDeployPassed: boolean;
  readonly seedPassed: boolean;
  readonly dockerComposeConfigPassed: boolean;
  readonly dockerComposeBuildPassed: boolean;
  readonly postgresHealthy: boolean;
  readonly redisHealthy: boolean;
  readonly minioHealthy: boolean;
  readonly apiReady: boolean;
  readonly workerReady: boolean;
  readonly webReady: boolean;
  readonly nginxHealthzReady: boolean;
  readonly minioUploadDownloadProofPassed: boolean;
  readonly fullWorkflowE2ePassed: boolean;
  readonly securitySmokePassed: boolean;
  readonly evidenceManifestWritten: boolean;
  readonly failedCriticalRuntimeChecks: number;
}

export interface Pass23RuntimeDeploymentDecision {
  readonly status: Pass23RuntimeDecisionStatus;
  readonly sourceGateIsNotRuntimeCertification: boolean;
  readonly cannotClaimProductionReadiness: boolean;
  readonly missing: readonly string[];
}

const requiredEvidenceKeys: readonly (keyof Pass23RuntimeDeploymentEvidence)[] = [
  'pnpmLockfilePresent',
  'frozenInstallPassed',
  'staticVerificationPassed',
  'lintPassed',
  'typecheckPassed',
  'testsPassed',
  'buildPassed',
  'prismaValidatePassed',
  'migrationDeployPassed',
  'seedPassed',
  'dockerComposeConfigPassed',
  'dockerComposeBuildPassed',
  'postgresHealthy',
  'redisHealthy',
  'minioHealthy',
  'apiReady',
  'workerReady',
  'webReady',
  'nginxHealthzReady',
  'minioUploadDownloadProofPassed',
  'fullWorkflowE2ePassed',
  'securitySmokePassed',
  'evidenceManifestWritten',
];

export function evaluatePass23RuntimeDeploymentDecision(
  evidence: Pass23RuntimeDeploymentEvidence,
): Pass23RuntimeDeploymentDecision {
  const missing = requiredEvidenceKeys.filter((key) => evidence[key] !== true).map(String);
  if (evidence.failedCriticalRuntimeChecks > 0) {
    return {
      status: 'NO_GO_RUNTIME_DEPLOYMENT_FAILED',
      sourceGateIsNotRuntimeCertification: true,
      cannotClaimProductionReadiness: true,
      missing,
    };
  }
  if (missing.length > 0) {
    return {
      status: 'HOLD_RUNTIME_EVIDENCE_REQUIRED',
      sourceGateIsNotRuntimeCertification: true,
      cannotClaimProductionReadiness: true,
      missing,
    };
  }
  return {
    status: 'GO_RUNTIME_DEPLOYMENT_CERTIFIED',
    sourceGateIsNotRuntimeCertification: false,
    cannotClaimProductionReadiness: false,
    missing: [],
  };
}

export const PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION = {
  pass: 'PASS_23',
  name: 'Docker, Deployment, CI/CD and Runtime Certification',
  sourceGateIsNotRuntimeCertification: true,
  requiredRuntimeEvidenceDirectory: 'certification-output/pass-23-runtime-deployment',
  requiredServices: ['postgres', 'redis', 'minio', 'minio-init', 'migrator', 'api', 'worker', 'web', 'nginx'] as const,
} as const;
