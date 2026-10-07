import {
  M21OperationalReadinessRows,
  M21SloThresholds,
  type M21BackupRestoreEvidence,
  type M21ObservabilityEvidence,
  type M21PerformanceEvidence,
  type M21WorkerBackpressureEvidence,
} from '@nexora/shared';

export const M21_PERFORMANCE_BACKUP_OBSERVABILITY_POLICY =
  'M21_PERFORMANCE_BACKUP_OBSERVABILITY_POLICY' as const;

function fail(controlId: string, message: string): never {
  throw new Error(`${controlId}: ${message}`);
}

function assertLte(controlId: string, metric: string, actual: number, threshold: number): void {
  if (!Number.isFinite(actual) || actual > threshold) {
    fail(controlId, `${metric} must be <= ${threshold}, received ${actual}.`);
  }
}

function assertEq(controlId: string, metric: string, actual: number, expected: number): void {
  if (!Number.isFinite(actual) || actual !== expected) {
    fail(controlId, `${metric} must equal ${expected}, received ${actual}.`);
  }
}

export function assertM21OperationalReadinessCatalog(): void {
  if (M21OperationalReadinessRows.length !== 14) {
    fail('M21-PRODUCTION-CAPACITY-GO-NOGO-GATE', 'M21 catalog must cover all fourteen operational readiness controls.');
  }
  const controls = new Set<string>();
  for (const row of M21OperationalReadinessRows) {
    controls.add(row.controlId);
    if (!row.runtimeRequired || !row.blocksProduction) {
      fail(row.controlId, 'Every M21 control must be runtime-required and production-blocking.');
    }
    if (row.requiredEvidence.length === 0) {
      fail(row.controlId, 'Every M21 control must declare evidence.');
    }
  }
  if (controls.size !== M21OperationalReadinessRows.length) {
    fail('M21-PRODUCTION-CAPACITY-GO-NOGO-GATE', 'M21 control IDs must be unique.');
  }
  if (M21SloThresholds.length < 9) {
    fail('M21-PERFORMANCE-SLO-BASELINES', 'M21 SLO threshold catalog is incomplete.');
  }
}

export function assertM21PerformanceSloEvidence(evidence: M21PerformanceEvidence): void {
  assertLte('M21-API-LOAD-TEST-GATE', 'apiP95Ms', evidence.apiP95Ms, 500);
  assertLte('M21-API-LOAD-TEST-GATE', 'apiErrorRatePct', evidence.apiErrorRatePct, 1);
  assertLte('M21-DATABASE-INDEX-QUERY-PLAN-GATE', 'dbQueryP95Ms', evidence.dbQueryP95Ms, 250);
  assertLte('M21-PERFORMANCE-SLO-BASELINES', 'reportExportP95Ms', evidence.reportExportP95Ms, 30000);
  assertLte('M21-PERFORMANCE-SLO-BASELINES', 'frontendLcpMs', evidence.frontendLcpMs, 2500);
  assertEq('M21-API-LOAD-TEST-GATE', 'failedRequestCount', evidence.failedRequestCount, 0);
  if (evidence.concurrentUsers < 50) {
    fail('M21-API-LOAD-TEST-GATE', `Load test must prove at least 50 concurrent users, received ${evidence.concurrentUsers}.`);
  }
  if (evidence.queryPlanEvidenceFiles.length === 0) {
    fail('M21-DATABASE-INDEX-QUERY-PLAN-GATE', 'Database performance proof requires query-plan evidence files.');
  }
}

export function assertM21BackupRestoreEvidence(evidence: M21BackupRestoreEvidence): void {
  if (!evidence.backupEncrypted) {
    fail('M21-POSTGRES-BACKUP-SCHEDULE-RETENTION-GATE', 'Database/object backups must be encrypted.');
  }
  if (!evidence.postgresBackupChecksum || !evidence.minioObjectManifestChecksum) {
    fail('M21-RESTORE-DRILL-RPO-RTO-GATE', 'PostgreSQL and MinIO backup checksums must be recorded.');
  }
  if (evidence.backupRetentionDays < 30) {
    fail('M21-POSTGRES-BACKUP-SCHEDULE-RETENTION-GATE', 'Backup retention must be at least 30 days for production readiness.');
  }
  assertLte('M21-RESTORE-DRILL-RPO-RTO-GATE', 'rpoMinutes', evidence.rpoMinutes, 15);
  assertLte('M21-RESTORE-DRILL-RPO-RTO-GATE', 'rtoMinutes', evidence.rtoMinutes, 60);
  if (!evidence.restoreDrillPassed || !evidence.restoredDatabaseValidated || !evidence.restoredObjectSampleValidated) {
    fail('M21-RESTORE-DRILL-RPO-RTO-GATE', 'Restore drill must pass database and object validation.');
  }
  if (!evidence.crossTenantSampleDenied) {
    fail('M21-TENANT-DATA-EXPORT-SUPPORT-GATE', 'Restored/backup sample access must deny cross-tenant reads.');
  }
}

export function assertM21ObservabilityEvidence(evidence: M21ObservabilityEvidence): void {
  const basics = evidence.requestIdTraceAttached && evidence.correlationIdTraceAttached && evidence.structuredLogsEnabled && evidence.metricsEndpointReachable && evidence.tracingEnabled;
  if (!basics) {
    fail('M21-LOGGING-METRICS-TRACES-GATE', 'Request ID, correlation ID, structured logs, metrics and traces must all be present.');
  }
  if (!evidence.healthEndpointReachable || !evidence.readinessEndpointReachable) {
    fail('M21-HEALTH-READINESS-LIVENESS-GATE', 'Health and readiness endpoints must be reachable in the runtime environment.');
  }
  if (!evidence.logRedactionVerified || !evidence.auditSampleAttached) {
    fail('M21-LOGGING-METRICS-TRACES-GATE', 'Observability evidence requires redaction proof and audit samples.');
  }
  if (!evidence.alertRulesConfigured || !evidence.oncallRunbookAttached) {
    fail('M21-ALERTING-ONCALL-RUNBOOK-GATE', 'Alert rules and on-call runbook must be attached.');
  }
  if (evidence.productionLogRetentionDays < 30) {
    fail('M21-LOGGING-METRICS-TRACES-GATE', 'Production log retention must be documented for at least 30 days.');
  }
}

export function assertM21WorkerBackpressureEvidence(evidence: M21WorkerBackpressureEvidence): void {
  assertLte('M21-WORKER-QUEUE-BACKPRESSURE-GATE', 'queueLagSeconds', evidence.queueLagSeconds, 60);
  if (evidence.stalledJobs !== 0) {
    fail('M21-WORKER-QUEUE-BACKPRESSURE-GATE', `Runtime worker proof must finish with zero stalled jobs, received ${evidence.stalledJobs}.`);
  }
  if (!evidence.deadLetterQueueEnabled || !evidence.retryPolicyDocumented || !evidence.poisonJobIsolated) {
    fail('M21-WORKER-QUEUE-BACKPRESSURE-GATE', 'DLQ, retry policy and poison-job isolation are required.');
  }
  if (!evidence.criticalMutationPayloadsRejected) {
    fail('M21-WORKER-QUEUE-BACKPRESSURE-GATE', 'Worker operational jobs must reject critical business mutation payloads.');
  }
}

export function assertM21ProductionCapacityGoNoGo(input: {
  performancePassed: boolean;
  backupRestorePassed: boolean;
  observabilityPassed: boolean;
  workerBackpressurePassed: boolean;
  drRunbookRehearsed: boolean;
  rollbackDecisionRecorded: boolean;
  unresolvedCriticalOperationalRisks: number;
  goDecision: 'GO' | 'NO_GO' | 'HOLD';
}): void {
  const complete = input.performancePassed && input.backupRestorePassed && input.observabilityPassed && input.workerBackpressurePassed && input.drRunbookRehearsed && input.rollbackDecisionRecorded;
  if (!complete || input.unresolvedCriticalOperationalRisks !== 0 || input.goDecision !== 'GO') {
    fail('M21-PRODUCTION-CAPACITY-GO-NOGO-GATE', 'Production remains HOLD until performance, backup/restore, observability, worker and DR evidence all pass with zero critical operational risks.');
  }
}

export function m21OperationalReadinessChecklist() {
  return M21OperationalReadinessRows.map((row) => ({
    controlId: row.controlId,
    domain: row.domain,
    requiredEvidence: [...row.requiredEvidence],
    runtimeProof: row.runtimeProof,
    blocksProduction: row.blocksProduction,
  }));
}
