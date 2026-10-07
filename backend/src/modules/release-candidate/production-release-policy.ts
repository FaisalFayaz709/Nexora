import { ProductionReleaseGateCatalog, ProductionReleaseGateIds, type ProductionReleaseEvidence } from '@nexora/shared';

function fail(gateId: string, message: string): never {
  throw new Error(`${gateId}: ${message}`);
}

export interface FrozenSourceArchiveProof {
  readonly archiveChecksumRecorded: boolean;
  readonly manifestChecksumRecorded: boolean;
  readonly releaseTagOrCommitRecorded: boolean;
  readonly pnpmLockfilePresent: boolean;
  readonly frozenInstallLogAttached: boolean;
  readonly dirtyWorkingTree: boolean;
}

export interface LockedDeploymentTopologyProof {
  readonly nextjsFrontend: boolean;
  readonly fastifyBackend: boolean;
  readonly postgresPrisma: boolean;
  readonly minioStorage: boolean;
  readonly redisBullmq: boolean;
  readonly dockerNginx: boolean;
  readonly githubActions: boolean;
  readonly architectureGatePassed: boolean;
  readonly composeConfigPassed: boolean;
}

export interface EnvironmentSecretMatrixProof {
  readonly envMatrixDocumented: boolean;
  readonly secretManagerReferencesRecorded: boolean;
  readonly databaseUrlProvidedBySecret: boolean;
  readonly authSecretsProvidedBySecret: boolean;
  readonly minioSecretsProvidedBySecret: boolean;
  readonly redisUrlProvidedBySecret: boolean;
  readonly productionPlaceholderSecretsDetected: number;
}

export interface DatabaseReleaseProof {
  readonly prismaValidatePassed: boolean;
  readonly migrationDeployPassed: boolean;
  readonly migrationStatusClean: boolean;
  readonly preReleaseBackupCaptured: boolean;
  readonly restoreTestPassed: boolean;
  readonly rollbackPlanHasMigrationDecision: boolean;
}

export interface ContainerRuntimeProof {
  readonly webImageBuilt: boolean;
  readonly apiImageBuilt: boolean;
  readonly workerImageBuilt: boolean;
  readonly postgresHealthy: boolean;
  readonly redisHealthy: boolean;
  readonly minioHealthy: boolean;
  readonly apiReady: boolean;
  readonly workerReady: boolean;
  readonly webReady: boolean;
  readonly nginxHealthzReady: boolean;
}

export interface RuntimeCertificationProof {
  readonly dockerRuntimeCertified: boolean;
  readonly securitySmokePassed: boolean;
  readonly fullWorkflowE2ePassed: boolean;
  readonly failedCriticalScenarios: number;
  readonly skippedCriticalScenarios: number;
  readonly tenantIsolationPassed: boolean;
  readonly makerCheckerPassed: boolean;
}

export interface ObservabilityAuditProof {
  readonly requestIdsPresent: boolean;
  readonly healthTelemetryAvailable: boolean;
  readonly criticalMutationAuditSampleAttached: boolean;
  readonly piiRedactionVerified: boolean;
  readonly secretRedactionVerified: boolean;
  readonly productionLogRetentionDocumented: boolean;
}

export interface ReleaseDecisionProof {
  readonly releaseNotesAttached: boolean;
  readonly knownRisksRecorded: boolean;
  readonly unresolvedCriticalDefects: number;
  readonly rollbackOwnerNamed: boolean;
  readonly ownerApprovalRecorded: boolean;
  readonly goDecision: 'GO' | 'NO_GO' | 'HOLD';
}

export function assertFrozenSourceArchive(input: FrozenSourceArchiveProof): void {
  if (!input.archiveChecksumRecorded || !input.manifestChecksumRecorded || !input.releaseTagOrCommitRecorded) {
    fail('C18-SOURCE-ARCHIVE-FROZEN-CHECKSUMED-REPRODUCIBLE', 'Release archive, manifest checksum and source commit/tag must be recorded.');
  }
  if (!input.pnpmLockfilePresent || !input.frozenInstallLogAttached || input.dirtyWorkingTree) {
    fail('C18-SOURCE-ARCHIVE-FROZEN-CHECKSUMED-REPRODUCIBLE', 'Release candidate requires pnpm-lock.yaml, frozen install evidence and clean source tree.');
  }
}

export function assertLockedDeploymentTopology(input: LockedDeploymentTopologyProof): void {
  const lockedStackPresent = input.nextjsFrontend && input.fastifyBackend && input.postgresPrisma && input.minioStorage && input.redisBullmq && input.dockerNginx && input.githubActions;
  if (!lockedStackPresent || !input.architectureGatePassed || !input.composeConfigPassed) {
    fail('C18-LOCKED-STACK-DEPLOYMENT-TOPOLOGY-UNCHANGED', 'Locked stack and deployment topology must pass architecture and Docker Compose gates.');
  }
}

export function assertEnvironmentSecretMatrix(input: EnvironmentSecretMatrixProof): void {
  const required = input.envMatrixDocumented && input.secretManagerReferencesRecorded && input.databaseUrlProvidedBySecret && input.authSecretsProvidedBySecret && input.minioSecretsProvidedBySecret && input.redisUrlProvidedBySecret;
  if (!required || input.productionPlaceholderSecretsDetected !== 0) {
    fail('C18-ENVIRONMENT-SECRETS-AND-CONFIGURATION-MATRIX', 'Production configuration must use secret references and contain zero local placeholder secrets.');
  }
}

export function assertDatabaseMigrationBackupRollback(input: DatabaseReleaseProof): void {
  const passed = input.prismaValidatePassed && input.migrationDeployPassed && input.migrationStatusClean && input.preReleaseBackupCaptured && input.restoreTestPassed && input.rollbackPlanHasMigrationDecision;
  if (!passed) {
    fail('C18-DATABASE-MIGRATION-BACKUP-RESTORE-ROLLBACK-GATE', 'Migration, backup, restore and rollback evidence must all be complete.');
  }
}

export function assertContainerImageNginxHealthReadiness(input: ContainerRuntimeProof): void {
  const imagesBuilt = input.webImageBuilt && input.apiImageBuilt && input.workerImageBuilt;
  const runtimeHealthy = input.postgresHealthy && input.redisHealthy && input.minioHealthy && input.apiReady && input.workerReady && input.webReady && input.nginxHealthzReady;
  if (!imagesBuilt || !runtimeHealthy) {
    fail('C18-CONTAINER-IMAGE-NGINX-HEALTH-READINESS-GATE', 'All images and runtime services must build and report healthy/readiness status.');
  }
}

export function assertRuntimeE2eSecuritySmokeEvidence(input: RuntimeCertificationProof): void {
  if (!input.dockerRuntimeCertified || !input.securitySmokePassed || !input.fullWorkflowE2ePassed || !input.tenantIsolationPassed || !input.makerCheckerPassed) {
    fail('C18-RUNTIME-E2E-SECURITY-SMOKE-EVIDENCE-GATE', 'Runtime, E2E, security smoke, tenant and maker-checker evidence must pass.');
  }
  if (input.failedCriticalScenarios !== 0 || input.skippedCriticalScenarios !== 0) {
    fail('C18-RUNTIME-E2E-SECURITY-SMOKE-EVIDENCE-GATE', 'Production release requires zero failed and zero skipped critical scenarios.');
  }
}

export function assertObservabilityAuditLogPiiRedaction(input: ObservabilityAuditProof): void {
  const passed = input.requestIdsPresent && input.healthTelemetryAvailable && input.criticalMutationAuditSampleAttached && input.piiRedactionVerified && input.secretRedactionVerified && input.productionLogRetentionDocumented;
  if (!passed) {
    fail('C18-OBSERVABILITY-AUDIT-LOG-PII-REDACTION-GATE', 'Production support requires request IDs, health telemetry, audit samples and PII/secret redaction proof.');
  }
}

export function assertReleaseNotesKnownRisksGoNoGo(input: ReleaseDecisionProof): void {
  const complete = input.releaseNotesAttached && input.knownRisksRecorded && input.rollbackOwnerNamed && input.ownerApprovalRecorded && input.unresolvedCriticalDefects === 0;
  if (!complete || input.goDecision !== 'GO') {
    fail('C18-RELEASE-NOTES-KNOWN-RISKS-GO-NOGO-DECISION', 'Release must stay HOLD/NO-GO until notes, risks, approvals, rollback ownership and zero critical defects are recorded.');
  }
}

export function assertProductionReleaseEvidenceCatalog(evidence: readonly ProductionReleaseEvidence[]): void {
  const expected = new Set<string>(ProductionReleaseGateIds);
  for (const item of evidence) {
    expected.delete(item.gateId);
    if (item.status !== 'PASSED') {
      fail(item.gateId, `Release evidence status must be PASSED, received ${item.status}.`);
    }
    if (item.evidenceFiles.length === 0) {
      fail(item.gateId, 'Every release gate must attach at least one evidence file.');
    }
  }
  if (expected.size > 0) {
    fail('C18-RELEASE-NOTES-KNOWN-RISKS-GO-NOGO-DECISION', `Missing production release evidence for: ${Array.from(expected).join(', ')}`);
  }
}

export function assertProductionReleaseGateCatalog(): void {
  if (ProductionReleaseGateCatalog.length !== ProductionReleaseGateIds.length) {
    fail('C18-RELEASE-NOTES-KNOWN-RISKS-GO-NOGO-DECISION', 'Production release gate catalog must map every C18 gate.');
  }
  const notBlocking = ProductionReleaseGateCatalog.filter((gate) => !gate.blocksProduction || !gate.runtimeRequired);
  if (notBlocking.length > 0) {
    fail('C18-RELEASE-NOTES-KNOWN-RISKS-GO-NOGO-DECISION', 'Every C18 gate must be runtime-required and production-blocking.');
  }
}
