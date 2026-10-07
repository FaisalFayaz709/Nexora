import { z } from 'zod';
import { NonEmptyStringSchema } from '../common';

export const MISSING_PASS_M21_SOURCE_PREFLIGHT_PERFORMANCE_BACKUP_OBSERVABILITY =
  'MISSING_PASS_M21_SOURCE_PREFLIGHT_PERFORMANCE_BACKUP_OBSERVABILITY' as const;

export const M21OperationalDomains = [
  'PERFORMANCE_SLO_BASELINES',
  'DATABASE_INDEX_AND_QUERY_PLAN',
  'API_LOAD_TEST',
  'WORKER_QUEUE_BACKPRESSURE',
  'BACKUP_SCHEDULE_RETENTION',
  'RESTORE_DRILL_RPO_RTO',
  'OBJECT_STORAGE_BACKUP',
  'REDIS_RECOVERY_PLAN',
  'LOGGING_METRICS_TRACES',
  'ALERTING_ONCALL_RUNBOOK',
  'HEALTH_READINESS_LIVENESS',
  'DISASTER_RECOVERY_ROLLBACK',
  'TENANT_DATA_EXPORT_SUPPORT',
  'PRODUCTION_CAPACITY_GO_NOGO',
] as const;
export type M21OperationalDomain = (typeof M21OperationalDomains)[number];

export const M21ControlIdSchema = z.enum([
  'M21-PERFORMANCE-SLO-BASELINES',
  'M21-DATABASE-INDEX-QUERY-PLAN-GATE',
  'M21-API-LOAD-TEST-GATE',
  'M21-WORKER-QUEUE-BACKPRESSURE-GATE',
  'M21-POSTGRES-BACKUP-SCHEDULE-RETENTION-GATE',
  'M21-RESTORE-DRILL-RPO-RTO-GATE',
  'M21-MINIO-OBJECT-BACKUP-GATE',
  'M21-REDIS-RECOVERY-PLAN-GATE',
  'M21-LOGGING-METRICS-TRACES-GATE',
  'M21-ALERTING-ONCALL-RUNBOOK-GATE',
  'M21-HEALTH-READINESS-LIVENESS-GATE',
  'M21-DISASTER-RECOVERY-ROLLBACK-GATE',
  'M21-TENANT-DATA-EXPORT-SUPPORT-GATE',
  'M21-PRODUCTION-CAPACITY-GO-NOGO-GATE',
]);
export type M21ControlId = z.infer<typeof M21ControlIdSchema>;

export const M21RuntimeProofStatusSchema = z.enum([
  'NOT_STARTED',
  'READY_TO_RUN',
  'PASSED',
  'FAILED',
  'BLOCKED',
]);
export type M21RuntimeProofStatus = z.infer<typeof M21RuntimeProofStatusSchema>;

export const M21MetricNameSchema = z.enum([
  'api_p95_ms',
  'api_error_rate_pct',
  'db_query_p95_ms',
  'report_export_p95_ms',
  'frontend_lcp_ms',
  'worker_queue_lag_seconds',
  'failed_request_count',
  'restore_rpo_minutes',
  'restore_rto_minutes',
]);
export type M21MetricName = z.infer<typeof M21MetricNameSchema>;

export const M21ThresholdComparisonSchema = z.enum(['LTE', 'GTE', 'EQ']);
export type M21ThresholdComparison = z.infer<typeof M21ThresholdComparisonSchema>;

export const M21SloThresholdSchema = z.object({
  metric: M21MetricNameSchema,
  comparison: M21ThresholdComparisonSchema,
  threshold: z.number().finite(),
  unit: NonEmptyStringSchema,
  blocksProduction: z.literal(true),
});
export type M21SloThreshold = z.infer<typeof M21SloThresholdSchema>;

export const M21OperationalReadinessRowSchema = z.object({
  domain: z.enum(M21OperationalDomains),
  controlId: M21ControlIdSchema,
  requiredEvidence: z.array(NonEmptyStringSchema).min(1),
  runtimeProof: NonEmptyStringSchema,
  runtimeRequired: z.literal(true),
  blocksProduction: z.literal(true),
});
export type M21OperationalReadinessRow = z.infer<typeof M21OperationalReadinessRowSchema>;

export const M21BackupRestoreEvidenceSchema = z.object({
  organizationId: NonEmptyStringSchema,
  backupRunId: NonEmptyStringSchema,
  restoreDrillId: NonEmptyStringSchema,
  postgresBackupChecksum: NonEmptyStringSchema,
  minioObjectManifestChecksum: NonEmptyStringSchema,
  backupEncrypted: z.boolean(),
  backupRetentionDays: z.number().int().min(1),
  rpoMinutes: z.number().finite().nonnegative(),
  rtoMinutes: z.number().finite().nonnegative(),
  restoreDrillPassed: z.boolean(),
  restoredDatabaseValidated: z.boolean(),
  restoredObjectSampleValidated: z.boolean(),
  crossTenantSampleDenied: z.boolean(),
});
export type M21BackupRestoreEvidence = z.infer<typeof M21BackupRestoreEvidenceSchema>;

export const M21ObservabilityEvidenceSchema = z.object({
  requestIdTraceAttached: z.boolean(),
  correlationIdTraceAttached: z.boolean(),
  structuredLogsEnabled: z.boolean(),
  metricsEndpointReachable: z.boolean(),
  tracingEnabled: z.boolean(),
  healthEndpointReachable: z.boolean(),
  readinessEndpointReachable: z.boolean(),
  logRedactionVerified: z.boolean(),
  auditSampleAttached: z.boolean(),
  alertRulesConfigured: z.boolean(),
  oncallRunbookAttached: z.boolean(),
  productionLogRetentionDays: z.number().int().min(1),
});
export type M21ObservabilityEvidence = z.infer<typeof M21ObservabilityEvidenceSchema>;

export const M21PerformanceEvidenceSchema = z.object({
  runId: NonEmptyStringSchema,
  apiP95Ms: z.number().finite().nonnegative(),
  apiErrorRatePct: z.number().finite().nonnegative(),
  dbQueryP95Ms: z.number().finite().nonnegative(),
  reportExportP95Ms: z.number().finite().nonnegative(),
  frontendLcpMs: z.number().finite().nonnegative(),
  concurrentUsers: z.number().int().positive(),
  failedRequestCount: z.number().int().nonnegative(),
  queryPlanEvidenceFiles: z.array(NonEmptyStringSchema).min(1),
});
export type M21PerformanceEvidence = z.infer<typeof M21PerformanceEvidenceSchema>;

export const M21WorkerBackpressureEvidenceSchema = z.object({
  queueLagSeconds: z.number().finite().nonnegative(),
  stalledJobs: z.number().int().nonnegative(),
  deadLetterQueueEnabled: z.boolean(),
  retryPolicyDocumented: z.boolean(),
  poisonJobIsolated: z.boolean(),
  criticalMutationPayloadsRejected: z.boolean(),
});
export type M21WorkerBackpressureEvidence = z.infer<typeof M21WorkerBackpressureEvidenceSchema>;

export const M21SloThresholds = [
  { metric: 'api_p95_ms', comparison: 'LTE', threshold: 500, unit: 'milliseconds', blocksProduction: true },
  { metric: 'api_error_rate_pct', comparison: 'LTE', threshold: 1, unit: 'percent', blocksProduction: true },
  { metric: 'db_query_p95_ms', comparison: 'LTE', threshold: 250, unit: 'milliseconds', blocksProduction: true },
  { metric: 'report_export_p95_ms', comparison: 'LTE', threshold: 30000, unit: 'milliseconds', blocksProduction: true },
  { metric: 'frontend_lcp_ms', comparison: 'LTE', threshold: 2500, unit: 'milliseconds', blocksProduction: true },
  { metric: 'worker_queue_lag_seconds', comparison: 'LTE', threshold: 60, unit: 'seconds', blocksProduction: true },
  { metric: 'failed_request_count', comparison: 'EQ', threshold: 0, unit: 'count', blocksProduction: true },
  { metric: 'restore_rpo_minutes', comparison: 'LTE', threshold: 15, unit: 'minutes', blocksProduction: true },
  { metric: 'restore_rto_minutes', comparison: 'LTE', threshold: 60, unit: 'minutes', blocksProduction: true },
] as const satisfies readonly M21SloThreshold[];

export const M21OperationalReadinessRows = [
  { domain: 'PERFORMANCE_SLO_BASELINES', controlId: 'M21-PERFORMANCE-SLO-BASELINES', requiredEvidence: ['SLO threshold catalog', 'measured runtime results'], runtimeProof: 'Runtime load test proves API, DB, report and frontend thresholds are within limits.', runtimeRequired: true, blocksProduction: true },
  { domain: 'DATABASE_INDEX_AND_QUERY_PLAN', controlId: 'M21-DATABASE-INDEX-QUERY-PLAN-GATE', requiredEvidence: ['tenant index inventory', 'EXPLAIN/ANALYZE samples for hot queries'], runtimeProof: 'Hot queries use tenant/branch/date indexes and do not run unbounded table scans.', runtimeRequired: true, blocksProduction: true },
  { domain: 'API_LOAD_TEST', controlId: 'M21-API-LOAD-TEST-GATE', requiredEvidence: ['load-test run log', 'request p95/error-rate summary'], runtimeProof: 'API load test finishes with p95/error-rate inside SLO and zero failed critical workflow requests.', runtimeRequired: true, blocksProduction: true },
  { domain: 'WORKER_QUEUE_BACKPRESSURE', controlId: 'M21-WORKER-QUEUE-BACKPRESSURE-GATE', requiredEvidence: ['BullMQ lag snapshot', 'DLQ/retry evidence'], runtimeProof: 'Worker retries, stalled jobs and poison jobs are bounded without critical business-state mutation.', runtimeRequired: true, blocksProduction: true },
  { domain: 'BACKUP_SCHEDULE_RETENTION', controlId: 'M21-POSTGRES-BACKUP-SCHEDULE-RETENTION-GATE', requiredEvidence: ['PostgreSQL backup checksum', 'retention policy'], runtimeProof: 'Encrypted backup exists before release and retention is recorded.', runtimeRequired: true, blocksProduction: true },
  { domain: 'RESTORE_DRILL_RPO_RTO', controlId: 'M21-RESTORE-DRILL-RPO-RTO-GATE', requiredEvidence: ['isolated restore drill log', 'RPO/RTO measurement'], runtimeProof: 'Restore drill validates database and object evidence inside the documented RPO/RTO.', runtimeRequired: true, blocksProduction: true },
  { domain: 'OBJECT_STORAGE_BACKUP', controlId: 'M21-MINIO-OBJECT-BACKUP-GATE', requiredEvidence: ['MinIO object manifest checksum', 'sample restored document'], runtimeProof: 'Object backup manifest matches and restored document sample passes checksum/authorization checks.', runtimeRequired: true, blocksProduction: true },
  { domain: 'REDIS_RECOVERY_PLAN', controlId: 'M21-REDIS-RECOVERY-PLAN-GATE', requiredEvidence: ['Redis recovery decision record', 'queue replay/skip procedure'], runtimeProof: 'Redis/queue recovery documents which jobs replay and which idempotent evidence jobs are skipped.', runtimeRequired: true, blocksProduction: true },
  { domain: 'LOGGING_METRICS_TRACES', controlId: 'M21-LOGGING-METRICS-TRACES-GATE', requiredEvidence: ['request ID trace', 'metrics snapshot', 'redaction scan'], runtimeProof: 'Logs, metrics and traces correlate a request without leaking secrets or tenant data.', runtimeRequired: true, blocksProduction: true },
  { domain: 'ALERTING_ONCALL_RUNBOOK', controlId: 'M21-ALERTING-ONCALL-RUNBOOK-GATE', requiredEvidence: ['alert rule list', 'on-call runbook'], runtimeProof: 'Alerts cover health/readiness, DB, Redis, MinIO, queues, backup failures and security anomalies.', runtimeRequired: true, blocksProduction: true },
  { domain: 'HEALTH_READINESS_LIVENESS', controlId: 'M21-HEALTH-READINESS-LIVENESS-GATE', requiredEvidence: ['healthz log', 'readiness dependency log'], runtimeProof: 'Health, liveness and readiness endpoints report dependency status for api, worker, Postgres, Redis and MinIO.', runtimeRequired: true, blocksProduction: true },
  { domain: 'DISASTER_RECOVERY_ROLLBACK', controlId: 'M21-DISASTER-RECOVERY-ROLLBACK-GATE', requiredEvidence: ['DR runbook', 'rollback drill log'], runtimeProof: 'Rollback and restore decisions are rehearsed and recorded before production Go/No-Go.', runtimeRequired: true, blocksProduction: true },
  { domain: 'TENANT_DATA_EXPORT_SUPPORT', controlId: 'M21-TENANT-DATA-EXPORT-SUPPORT-GATE', requiredEvidence: ['tenant export proof', 'cross-tenant denial proof'], runtimeProof: 'Tenant-scoped export and backup samples cannot expose another organization/branch.', runtimeRequired: true, blocksProduction: true },
  { domain: 'PRODUCTION_CAPACITY_GO_NOGO', controlId: 'M21-PRODUCTION-CAPACITY-GO-NOGO-GATE', requiredEvidence: ['capacity checklist', 'Go/No-Go capacity signoff'], runtimeProof: 'Production remains HOLD until SLO, backup/restore, observability and capacity evidence all pass.', runtimeRequired: true, blocksProduction: true },
] as const satisfies readonly M21OperationalReadinessRow[];

export const M21RuntimeRequiredScenarios = [
  'API p95 and error-rate load test stays within SLO',
  'database hot queries have tenant/branch/date indexes and query-plan evidence',
  'report export completes within SLO without memory exhaustion',
  'worker queue lag, retries and DLQ behavior stay bounded',
  'encrypted PostgreSQL backup is created with checksum and retention metadata',
  'MinIO object manifest backup restores sample documents by checksum',
  'isolated restore drill validates database, objects and tenant isolation within RPO/RTO',
  'logs/metrics/traces correlate request ID while redacting secrets and PII',
  'alerts fire for API readiness, DB, Redis, MinIO, queues, backup failure and security anomalies',
  'DR rollback runbook is rehearsed before production Go/No-Go',
] as const;

export const M21PerformanceBackupObservabilityManifest = {
  pass: 'M21',
  name: 'Performance, Backup, Restore, Observability and DR Completion',
  sourcePreflightToken: MISSING_PASS_M21_SOURCE_PREFLIGHT_PERFORMANCE_BACKUP_OBSERVABILITY,
  thresholds: M21SloThresholds,
  controls: M21OperationalReadinessRows,
  runtimeRequiredScenarios: M21RuntimeRequiredScenarios,
  lockedStackUnchanged: true,
  lockedArchitectureUnchanged: true,
  productionBlockedUntilRuntimeCertified: true,
} as const;
