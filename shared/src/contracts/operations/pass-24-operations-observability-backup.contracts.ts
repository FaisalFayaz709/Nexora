import { z } from 'zod';
import { NonEmptyStringSchema, UuidSchema } from '../common';

export const PASS_24_OPERATIONS_OBSERVABILITY_BACKUP_DR =
  'PASS_24_OPERATIONS_OBSERVABILITY_BACKUP_DR' as const;

export const Pass24OperationsDecisionSchema = z.enum([
  'GO_OPERATIONS_RUNTIME_CERTIFIED',
  'HOLD_OPERATIONS_RUNTIME_EVIDENCE_REQUIRED',
  'NO_GO_OPERATIONS_RUNTIME_FAILED',
]);
export type Pass24OperationsDecision = z.infer<typeof Pass24OperationsDecisionSchema>;

export const Pass24OperationalDomainSchema = z.enum([
  'PERFORMANCE_SLO',
  'DATABASE_QUERY_PLAN',
  'BACKUP_RETENTION',
  'RESTORE_DRILL',
  'OBJECT_STORAGE_RECOVERY',
  'REDIS_RECOVERY',
  'OBSERVABILITY_SIGNALS',
  'ALERTING_ONCALL',
  'HEALTH_READINESS_LIVENESS',
  'INCIDENT_RESPONSE',
  'DISASTER_RECOVERY',
  'ROLLBACK',
  'TENANT_EXPORT',
  'QUEUE_BACKPRESSURE',
]);
export type Pass24OperationalDomain = z.infer<typeof Pass24OperationalDomainSchema>;

export const Pass24EvidenceStatusSchema = z.enum([
  'NOT_STARTED',
  'READY_TO_RUN',
  'PASSED',
  'FAILED',
  'BLOCKED',
]);
export type Pass24EvidenceStatus = z.infer<typeof Pass24EvidenceStatusSchema>;

export const Pass24EvidenceItemSchema = z.object({
  id: NonEmptyStringSchema,
  domain: Pass24OperationalDomainSchema,
  requiredArtifact: NonEmptyStringSchema,
  status: Pass24EvidenceStatusSchema,
  runtimeRequired: z.literal(true),
  blocksProduction: z.literal(true),
});
export type Pass24EvidenceItem = z.infer<typeof Pass24EvidenceItemSchema>;

export const Pass24PerformanceEvidenceSchema = z.object({
  apiP95Ms: z.number().finite().nonnegative().max(500),
  apiErrorRatePct: z.number().finite().min(0).max(1),
  dbQueryP95Ms: z.number().finite().nonnegative().max(250),
  frontendLcpMs: z.number().finite().nonnegative().max(2500),
  reportExportP95Ms: z.number().finite().nonnegative().max(30000),
  concurrentUsers: z.number().int().min(50),
  failedRequestCount: z.number().int().nonnegative().max(0),
  queryPlanEvidenceFiles: z.array(NonEmptyStringSchema).min(1),
});
export type Pass24PerformanceEvidence = z.infer<typeof Pass24PerformanceEvidenceSchema>;

export const Pass24BackupRestoreEvidenceSchema = z.object({
  organizationId: UuidSchema,
  backupEncrypted: z.literal(true),
  backupRetentionDays: z.number().int().min(30),
  postgresBackupChecksum: NonEmptyStringSchema,
  minioObjectManifestChecksum: NonEmptyStringSchema,
  redisRecoveryPlanAttached: z.literal(true),
  rpoMinutes: z.number().finite().nonnegative().max(15),
  rtoMinutes: z.number().finite().nonnegative().max(60),
  restoreDrillPassed: z.literal(true),
  restoredDatabaseValidated: z.literal(true),
  restoredObjectSampleValidated: z.literal(true),
  crossTenantSampleDenied: z.literal(true),
});
export type Pass24BackupRestoreEvidence = z.infer<typeof Pass24BackupRestoreEvidenceSchema>;

export const Pass24ObservabilityEvidenceSchema = z.object({
  requestIdTraceAttached: z.literal(true),
  correlationIdTraceAttached: z.literal(true),
  structuredLogsEnabled: z.literal(true),
  metricsEndpointReachable: z.literal(true),
  tracingEnabled: z.literal(true),
  healthEndpointReachable: z.literal(true),
  readinessEndpointReachable: z.literal(true),
  logRedactionVerified: z.literal(true),
  auditSampleAttached: z.literal(true),
  alertRulesConfigured: z.literal(true),
  oncallRunbookAttached: z.literal(true),
  productionLogRetentionDays: z.number().int().min(30),
});
export type Pass24ObservabilityEvidence = z.infer<typeof Pass24ObservabilityEvidenceSchema>;

export const Pass24QueueBackpressureEvidenceSchema = z.object({
  queueLagSeconds: z.number().finite().nonnegative().max(60),
  stalledJobs: z.number().int().nonnegative().max(0),
  deadLetterQueueEnabled: z.literal(true),
  retryPolicyDocumented: z.literal(true),
  poisonJobIsolated: z.literal(true),
  criticalMutationPayloadsRejected: z.literal(true),
});
export type Pass24QueueBackpressureEvidence = z.infer<typeof Pass24QueueBackpressureEvidenceSchema>;

export const Pass24IncidentDrEvidenceSchema = z.object({
  incidentResponseRunbookAttached: z.literal(true),
  disasterRecoveryRunbookAttached: z.literal(true),
  rollbackPlanAttached: z.literal(true),
  rollbackDrillPassed: z.literal(true),
  openCriticalIncidents: z.number().int().nonnegative().max(0),
  ownerApprovalRecorded: z.literal(true),
});
export type Pass24IncidentDrEvidence = z.infer<typeof Pass24IncidentDrEvidenceSchema>;

export const Pass24OperationsRuntimeEvidenceSchema = z.object({
  sourceGatePassed: z.literal(true),
  lockfilePresent: z.literal(true),
  frozenInstallPassed: z.literal(true),
  dockerRuntimePassed: z.literal(true),
  performance: Pass24PerformanceEvidenceSchema,
  backupRestore: Pass24BackupRestoreEvidenceSchema,
  observability: Pass24ObservabilityEvidenceSchema,
  queueBackpressure: Pass24QueueBackpressureEvidenceSchema,
  incidentDr: Pass24IncidentDrEvidenceSchema,
});
export type Pass24OperationsRuntimeEvidence = z.infer<typeof Pass24OperationsRuntimeEvidenceSchema>;

export const Pass24OperationsReadinessRows = [
  { id: 'PASS24-PERFORMANCE-SLO-GATE', domain: 'PERFORMANCE_SLO', requiredArtifact: 'k6/load-test-summary.json', status: 'READY_TO_RUN', runtimeRequired: true, blocksProduction: true },
  { id: 'PASS24-DATABASE-QUERY-PLAN-GATE', domain: 'DATABASE_QUERY_PLAN', requiredArtifact: 'postgres/query-plan-samples.json', status: 'READY_TO_RUN', runtimeRequired: true, blocksProduction: true },
  { id: 'PASS24-BACKUP-RETENTION-GATE', domain: 'BACKUP_RETENTION', requiredArtifact: 'backups/retention-policy.json', status: 'READY_TO_RUN', runtimeRequired: true, blocksProduction: true },
  { id: 'PASS24-RESTORE-DRILL-GATE', domain: 'RESTORE_DRILL', requiredArtifact: 'restore/restore-drill-report.json', status: 'READY_TO_RUN', runtimeRequired: true, blocksProduction: true },
  { id: 'PASS24-MINIO-RECOVERY-GATE', domain: 'OBJECT_STORAGE_RECOVERY', requiredArtifact: 'restore/minio-object-sample.json', status: 'READY_TO_RUN', runtimeRequired: true, blocksProduction: true },
  { id: 'PASS24-REDIS-RECOVERY-GATE', domain: 'REDIS_RECOVERY', requiredArtifact: 'redis/recovery-plan.md', status: 'READY_TO_RUN', runtimeRequired: true, blocksProduction: true },
  { id: 'PASS24-OBSERVABILITY-SIGNALS-GATE', domain: 'OBSERVABILITY_SIGNALS', requiredArtifact: 'observability/request-trace-sample.json', status: 'READY_TO_RUN', runtimeRequired: true, blocksProduction: true },
  { id: 'PASS24-ALERTING-ONCALL-GATE', domain: 'ALERTING_ONCALL', requiredArtifact: 'observability/alert-rules-and-oncall.md', status: 'READY_TO_RUN', runtimeRequired: true, blocksProduction: true },
  { id: 'PASS24-HEALTH-READINESS-GATE', domain: 'HEALTH_READINESS_LIVENESS', requiredArtifact: 'health/health-ready-live.json', status: 'READY_TO_RUN', runtimeRequired: true, blocksProduction: true },
  { id: 'PASS24-INCIDENT-RESPONSE-GATE', domain: 'INCIDENT_RESPONSE', requiredArtifact: 'incidents/incident-response-drill.md', status: 'READY_TO_RUN', runtimeRequired: true, blocksProduction: true },
  { id: 'PASS24-DISASTER-RECOVERY-GATE', domain: 'DISASTER_RECOVERY', requiredArtifact: 'dr/disaster-recovery-drill-report.md', status: 'READY_TO_RUN', runtimeRequired: true, blocksProduction: true },
  { id: 'PASS24-ROLLBACK-GATE', domain: 'ROLLBACK', requiredArtifact: 'rollback/rollback-proof.md', status: 'READY_TO_RUN', runtimeRequired: true, blocksProduction: true },
  { id: 'PASS24-TENANT-EXPORT-GATE', domain: 'TENANT_EXPORT', requiredArtifact: 'tenant-export/export-sample-redacted.json', status: 'READY_TO_RUN', runtimeRequired: true, blocksProduction: true },
  { id: 'PASS24-QUEUE-BACKPRESSURE-GATE', domain: 'QUEUE_BACKPRESSURE', requiredArtifact: 'queues/backpressure-and-dlq-proof.json', status: 'READY_TO_RUN', runtimeRequired: true, blocksProduction: true },
] as const satisfies readonly Pass24EvidenceItem[];

export const Pass24OperationsReadinessManifest = Object.freeze({
  pass: PASS_24_OPERATIONS_OBSERVABILITY_BACKUP_DR,
  status: 'SOURCE_READY_RUNTIME_EVIDENCE_REQUIRED',
  productionDecision: 'HOLD_OPERATIONS_RUNTIME_EVIDENCE_REQUIRED',
  rows: Pass24OperationsReadinessRows,
  thresholds: Object.freeze({
    apiP95Ms: 500,
    apiErrorRatePct: 1,
    dbQueryP95Ms: 250,
    frontendLcpMs: 2500,
    reportExportP95Ms: 30000,
    queueLagSeconds: 60,
    restoreRpoMinutes: 15,
    restoreRtoMinutes: 60,
    backupRetentionDays: 30,
  }),
});
