import { describe, expect, it } from 'vitest';
import {
  assertContainerImageNginxHealthReadiness,
  assertDatabaseMigrationBackupRollback,
  assertEnvironmentSecretMatrix,
  assertFrozenSourceArchive,
  assertLockedDeploymentTopology,
  assertObservabilityAuditLogPiiRedaction,
  assertProductionReleaseEvidenceCatalog,
  assertProductionReleaseGateCatalog,
  assertReleaseNotesKnownRisksGoNoGo,
  assertRuntimeE2eSecuritySmokeEvidence,
} from './production-release-policy.js';

const passedEvidence = [
  'C18-SOURCE-ARCHIVE-FROZEN-CHECKSUMED-REPRODUCIBLE',
  'C18-LOCKED-STACK-DEPLOYMENT-TOPOLOGY-UNCHANGED',
  'C18-ENVIRONMENT-SECRETS-AND-CONFIGURATION-MATRIX',
  'C18-DATABASE-MIGRATION-BACKUP-RESTORE-ROLLBACK-GATE',
  'C18-CONTAINER-IMAGE-NGINX-HEALTH-READINESS-GATE',
  'C18-RUNTIME-E2E-SECURITY-SMOKE-EVIDENCE-GATE',
  'C18-OBSERVABILITY-AUDIT-LOG-PII-REDACTION-GATE',
  'C18-RELEASE-NOTES-KNOWN-RISKS-GO-NOGO-DECISION',
] as const;

describe('C18 production deployment release candidate policy', () => {
  it('requires a frozen checksumed source archive and reproducible install evidence', () => {
    expect(() => assertFrozenSourceArchive({ archiveChecksumRecorded: true, manifestChecksumRecorded: true, releaseTagOrCommitRecorded: true, pnpmLockfilePresent: true, frozenInstallLogAttached: true, dirtyWorkingTree: false })).not.toThrow();
    expect(() => assertFrozenSourceArchive({ archiveChecksumRecorded: true, manifestChecksumRecorded: true, releaseTagOrCommitRecorded: true, pnpmLockfilePresent: false, frozenInstallLogAttached: true, dirtyWorkingTree: false })).toThrow('C18-SOURCE-ARCHIVE-FROZEN-CHECKSUMED-REPRODUCIBLE');
  });

  it('requires the locked deployment stack and topology to remain unchanged', () => {
    expect(() => assertLockedDeploymentTopology({ nextjsFrontend: true, fastifyBackend: true, postgresPrisma: true, minioStorage: true, redisBullmq: true, dockerNginx: true, githubActions: true, architectureGatePassed: true, composeConfigPassed: true })).not.toThrow();
    expect(() => assertLockedDeploymentTopology({ nextjsFrontend: true, fastifyBackend: true, postgresPrisma: true, minioStorage: true, redisBullmq: false, dockerNginx: true, githubActions: true, architectureGatePassed: true, composeConfigPassed: true })).toThrow('C18-LOCKED-STACK-DEPLOYMENT-TOPOLOGY-UNCHANGED');
  });

  it('requires production configuration to use secret references and zero placeholders', () => {
    expect(() => assertEnvironmentSecretMatrix({ envMatrixDocumented: true, secretManagerReferencesRecorded: true, databaseUrlProvidedBySecret: true, authSecretsProvidedBySecret: true, minioSecretsProvidedBySecret: true, redisUrlProvidedBySecret: true, productionPlaceholderSecretsDetected: 0 })).not.toThrow();
    expect(() => assertEnvironmentSecretMatrix({ envMatrixDocumented: true, secretManagerReferencesRecorded: true, databaseUrlProvidedBySecret: true, authSecretsProvidedBySecret: true, minioSecretsProvidedBySecret: true, redisUrlProvidedBySecret: true, productionPlaceholderSecretsDetected: 1 })).toThrow('C18-ENVIRONMENT-SECRETS-AND-CONFIGURATION-MATRIX');
  });

  it('requires migration, backup, restore and rollback evidence', () => {
    expect(() => assertDatabaseMigrationBackupRollback({ prismaValidatePassed: true, migrationDeployPassed: true, migrationStatusClean: true, preReleaseBackupCaptured: true, restoreTestPassed: true, rollbackPlanHasMigrationDecision: true })).not.toThrow();
    expect(() => assertDatabaseMigrationBackupRollback({ prismaValidatePassed: true, migrationDeployPassed: true, migrationStatusClean: true, preReleaseBackupCaptured: false, restoreTestPassed: true, rollbackPlanHasMigrationDecision: true })).toThrow('C18-DATABASE-MIGRATION-BACKUP-RESTORE-ROLLBACK-GATE');
  });

  it('requires all container images and runtime health checks to pass', () => {
    expect(() => assertContainerImageNginxHealthReadiness({ webImageBuilt: true, apiImageBuilt: true, workerImageBuilt: true, postgresHealthy: true, redisHealthy: true, minioHealthy: true, apiReady: true, workerReady: true, webReady: true, nginxHealthzReady: true })).not.toThrow();
    expect(() => assertContainerImageNginxHealthReadiness({ webImageBuilt: true, apiImageBuilt: true, workerImageBuilt: true, postgresHealthy: true, redisHealthy: true, minioHealthy: true, apiReady: false, workerReady: true, webReady: true, nginxHealthzReady: true })).toThrow('C18-CONTAINER-IMAGE-NGINX-HEALTH-READINESS-GATE');
  });

  it('requires runtime E2E and security smoke to pass with zero skipped critical scenarios', () => {
    expect(() => assertRuntimeE2eSecuritySmokeEvidence({ dockerRuntimeCertified: true, securitySmokePassed: true, fullWorkflowE2ePassed: true, failedCriticalScenarios: 0, skippedCriticalScenarios: 0, tenantIsolationPassed: true, makerCheckerPassed: true })).not.toThrow();
    expect(() => assertRuntimeE2eSecuritySmokeEvidence({ dockerRuntimeCertified: true, securitySmokePassed: true, fullWorkflowE2ePassed: true, failedCriticalScenarios: 0, skippedCriticalScenarios: 1, tenantIsolationPassed: true, makerCheckerPassed: true })).toThrow('C18-RUNTIME-E2E-SECURITY-SMOKE-EVIDENCE-GATE');
  });

  it('requires observability, audit and redaction proof', () => {
    expect(() => assertObservabilityAuditLogPiiRedaction({ requestIdsPresent: true, healthTelemetryAvailable: true, criticalMutationAuditSampleAttached: true, piiRedactionVerified: true, secretRedactionVerified: true, productionLogRetentionDocumented: true })).not.toThrow();
    expect(() => assertObservabilityAuditLogPiiRedaction({ requestIdsPresent: true, healthTelemetryAvailable: true, criticalMutationAuditSampleAttached: true, piiRedactionVerified: false, secretRedactionVerified: true, productionLogRetentionDocumented: true })).toThrow('C18-OBSERVABILITY-AUDIT-LOG-PII-REDACTION-GATE');
  });

  it('keeps the release on hold until notes, risks, approvals and Go decision are complete', () => {
    expect(() => assertReleaseNotesKnownRisksGoNoGo({ releaseNotesAttached: true, knownRisksRecorded: true, unresolvedCriticalDefects: 0, rollbackOwnerNamed: true, ownerApprovalRecorded: true, goDecision: 'GO' })).not.toThrow();
    expect(() => assertReleaseNotesKnownRisksGoNoGo({ releaseNotesAttached: true, knownRisksRecorded: true, unresolvedCriticalDefects: 1, rollbackOwnerNamed: true, ownerApprovalRecorded: true, goDecision: 'GO' })).toThrow('C18-RELEASE-NOTES-KNOWN-RISKS-GO-NOGO-DECISION');
  });

  it('requires all C18 gate evidence before production', () => {
    expect(() => assertProductionReleaseGateCatalog()).not.toThrow();
    expect(() => assertProductionReleaseEvidenceCatalog(passedEvidence.map((gateId) => ({ gateId, status: 'PASSED', evidenceFiles: [`certification-output/pass-c18/${gateId}.json`], notes: ['evidence recorded'] })))).not.toThrow();
    expect(() => assertProductionReleaseEvidenceCatalog([{ gateId: 'C18-SOURCE-ARCHIVE-FROZEN-CHECKSUMED-REPRODUCIBLE', status: 'BLOCKED', evidenceFiles: [], notes: ['missing runtime proof'] }])).toThrow('C18-SOURCE-ARCHIVE-FROZEN-CHECKSUMED-REPRODUCIBLE');
  });
});
