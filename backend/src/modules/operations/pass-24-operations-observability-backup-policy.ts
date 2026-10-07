import {
  Pass24BackupRestoreEvidenceSchema,
  Pass24IncidentDrEvidenceSchema,
  Pass24ObservabilityEvidenceSchema,
  Pass24OperationsReadinessRows,
  Pass24OperationsRuntimeEvidenceSchema,
  Pass24PerformanceEvidenceSchema,
  Pass24QueueBackpressureEvidenceSchema,
  type Pass24OperationsDecision,
  type Pass24OperationsRuntimeEvidence,
} from '@nexora/shared';

export const PASS_24_OPERATIONS_OBSERVABILITY_BACKUP_DR_POLICY =
  'PASS_24_OPERATIONS_OBSERVABILITY_BACKUP_DR_POLICY' as const;
// PASS_24_OPERATIONS_DOMAINS: PERFORMANCE_SLO DATABASE_QUERY_PLAN BACKUP_RETENTION RESTORE_DRILL OBJECT_STORAGE_RECOVERY REDIS_RECOVERY OBSERVABILITY_SIGNALS ALERTING_ONCALL HEALTH_READINESS_LIVENESS INCIDENT_RESPONSE DISASTER_RECOVERY ROLLBACK TENANT_EXPORT QUEUE_BACKPRESSURE


export type Pass24OperationsSourceReadiness = {
  readonly sourceGatePassed: boolean;
  readonly lockfilePresent: boolean;
  readonly frozenInstallPassed: boolean;
  readonly dockerRuntimePassed: boolean;
  readonly runtimeEvidencePresent: boolean;
  readonly performanceEvidencePassed: boolean;
  readonly backupRestoreEvidencePassed: boolean;
  readonly observabilityEvidencePassed: boolean;
  readonly queueBackpressureEvidencePassed: boolean;
  readonly incidentDrEvidencePassed: boolean;
};

export type Pass24OperationsDecisionResult = {
  readonly decision: Pass24OperationsDecision;
  readonly sourceGateIsNotRuntimeCertification: boolean;
  readonly cannotClaimProductionReadiness: boolean;
  readonly blockers: readonly string[];
};

function assertTrue(controlId: string, value: boolean, message: string): void {
  if (!value) {
    throw new Error(`${controlId}: ${message}`);
  }
}

export function assertPass24OperationsReadinessCatalog(): void {
  const ids = new Set<string>();
  assertTrue('PASS24-OPERATIONS-CATALOG', Pass24OperationsReadinessRows.length === 14, 'Pass 24 must cover fourteen operations controls.');
  for (const row of Pass24OperationsReadinessRows) {
    assertTrue(row.id, row.runtimeRequired, 'Every operations control must require runtime evidence.');
    assertTrue(row.id, row.blocksProduction, 'Every operations control must block production GO until proven.');
    assertTrue(row.id, Boolean(row.requiredArtifact), 'Every operations control must name the required evidence artifact.');
    ids.add(row.id);
  }
  assertTrue('PASS24-OPERATIONS-CATALOG', ids.size === Pass24OperationsReadinessRows.length, 'Pass 24 operations control IDs must be unique.');
}

export function assertPass24PerformanceEvidence(input: unknown): void {
  Pass24PerformanceEvidenceSchema.parse(input);
}

export function assertPass24BackupRestoreEvidence(input: unknown): void {
  Pass24BackupRestoreEvidenceSchema.parse(input);
}

export function assertPass24ObservabilityEvidence(input: unknown): void {
  Pass24ObservabilityEvidenceSchema.parse(input);
}

export function assertPass24QueueBackpressureEvidence(input: unknown): void {
  Pass24QueueBackpressureEvidenceSchema.parse(input);
}

export function assertPass24IncidentDrEvidence(input: unknown): void {
  Pass24IncidentDrEvidenceSchema.parse(input);
}

export function assertPass24RuntimeEvidence(input: Pass24OperationsRuntimeEvidence): void {
  Pass24OperationsRuntimeEvidenceSchema.parse(input);
}

export function evaluatePass24OperationsDecision(input: Pass24OperationsSourceReadiness): Pass24OperationsDecisionResult {
  const blockers: string[] = [];
  if (!input.sourceGatePassed) blockers.push('Pass 24 source gate has not passed.');
  if (!input.lockfilePresent) blockers.push('Root pnpm-lock.yaml is missing.');
  if (!input.frozenInstallPassed) blockers.push('Frozen pnpm install evidence is missing.');
  if (!input.dockerRuntimePassed) blockers.push('Docker runtime evidence is missing.');
  if (!input.runtimeEvidencePresent) blockers.push('Runtime operations evidence folder is missing.');
  if (!input.performanceEvidencePassed) blockers.push('Performance SLO evidence is missing or failed.');
  if (!input.backupRestoreEvidencePassed) blockers.push('Backup/restore and RPO/RTO evidence is missing or failed.');
  if (!input.observabilityEvidencePassed) blockers.push('Observability, log redaction, alert and health evidence is missing or failed.');
  if (!input.queueBackpressureEvidencePassed) blockers.push('Worker queue backpressure/DLQ evidence is missing or failed.');
  if (!input.incidentDrEvidencePassed) blockers.push('Incident response, rollback and DR evidence is missing or failed.');

  return {
    decision: blockers.length === 0 ? 'GO_OPERATIONS_RUNTIME_CERTIFIED' : 'HOLD_OPERATIONS_RUNTIME_EVIDENCE_REQUIRED',
    sourceGateIsNotRuntimeCertification: true,
    cannotClaimProductionReadiness: blockers.length > 0,
    blockers,
  };
}

export function assertPass24ProductionOperationsGo(input: Pass24OperationsSourceReadiness): void {
  const result = evaluatePass24OperationsDecision(input);
  if (result.decision !== 'GO_OPERATIONS_RUNTIME_CERTIFIED') {
    throw new Error(`PASS24-PRODUCTION-OPERATIONS-GO-GATE: ${result.blockers.join(' | ')}`);
  }
}
