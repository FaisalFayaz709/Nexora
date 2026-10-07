import { describe, expect, it } from 'vitest';
import {
  assertM21BackupRestoreEvidence,
  assertM21ObservabilityEvidence,
  assertM21OperationalReadinessCatalog,
  assertM21PerformanceSloEvidence,
  assertM21ProductionCapacityGoNoGo,
  assertM21WorkerBackpressureEvidence,
  m21OperationalReadinessChecklist,
} from './m21-performance-backup-observability-policy.js';

describe('M21 performance, backup, restore and observability policy', () => {
  it('keeps the operational readiness catalog production-blocking', () => {
    assertM21OperationalReadinessCatalog();
    expect(m21OperationalReadinessChecklist()).toHaveLength(14);
  });

  it('accepts performance evidence only when SLOs and query-plan evidence pass', () => {
    expect(() => assertM21PerformanceSloEvidence({
      runId: 'run-001',
      apiP95Ms: 320,
      apiErrorRatePct: 0.2,
      dbQueryP95Ms: 80,
      reportExportP95Ms: 12000,
      frontendLcpMs: 1800,
      concurrentUsers: 75,
      failedRequestCount: 0,
      queryPlanEvidenceFiles: ['certification-output/pass-m21/query-plans/customer-list.txt'],
    })).not.toThrow();
  });

  it('rejects overloaded API or DB runtime evidence', () => {
    expect(() => assertM21PerformanceSloEvidence({
      runId: 'run-002',
      apiP95Ms: 900,
      apiErrorRatePct: 0.4,
      dbQueryP95Ms: 80,
      reportExportP95Ms: 12000,
      frontendLcpMs: 1800,
      concurrentUsers: 75,
      failedRequestCount: 0,
      queryPlanEvidenceFiles: ['plan.txt'],
    })).toThrow('M21-API-LOAD-TEST-GATE');
  });

  it('requires backup checksum, encryption, RPO/RTO and tenant-isolation restore proof', () => {
    expect(() => assertM21BackupRestoreEvidence({
      organizationId: 'org-001',
      backupRunId: 'backup-001',
      restoreDrillId: 'restore-001',
      postgresBackupChecksum: 'sha256:pg',
      minioObjectManifestChecksum: 'sha256:minio',
      backupEncrypted: true,
      backupRetentionDays: 35,
      rpoMinutes: 10,
      rtoMinutes: 45,
      restoreDrillPassed: true,
      restoredDatabaseValidated: true,
      restoredObjectSampleValidated: true,
      crossTenantSampleDenied: true,
    })).not.toThrow();
  });

  it('rejects restore drills outside RTO', () => {
    expect(() => assertM21BackupRestoreEvidence({
      organizationId: 'org-001',
      backupRunId: 'backup-002',
      restoreDrillId: 'restore-002',
      postgresBackupChecksum: 'sha256:pg',
      minioObjectManifestChecksum: 'sha256:minio',
      backupEncrypted: true,
      backupRetentionDays: 35,
      rpoMinutes: 10,
      rtoMinutes: 90,
      restoreDrillPassed: true,
      restoredDatabaseValidated: true,
      restoredObjectSampleValidated: true,
      crossTenantSampleDenied: true,
    })).toThrow('M21-RESTORE-DRILL-RPO-RTO-GATE');
  });

  it('requires request traces, metrics, alerts, redaction and runbook evidence', () => {
    expect(() => assertM21ObservabilityEvidence({
      requestIdTraceAttached: true,
      correlationIdTraceAttached: true,
      structuredLogsEnabled: true,
      metricsEndpointReachable: true,
      tracingEnabled: true,
      healthEndpointReachable: true,
      readinessEndpointReachable: true,
      logRedactionVerified: true,
      auditSampleAttached: true,
      alertRulesConfigured: true,
      oncallRunbookAttached: true,
      productionLogRetentionDays: 45,
    })).not.toThrow();
  });

  it('requires bounded queue lag, DLQ, retry policy and critical-mutation rejection', () => {
    expect(() => assertM21WorkerBackpressureEvidence({
      queueLagSeconds: 12,
      stalledJobs: 0,
      deadLetterQueueEnabled: true,
      retryPolicyDocumented: true,
      poisonJobIsolated: true,
      criticalMutationPayloadsRejected: true,
    })).not.toThrow();
  });

  it('blocks production until operational Go/No-Go evidence is complete', () => {
    expect(() => assertM21ProductionCapacityGoNoGo({
      performancePassed: true,
      backupRestorePassed: true,
      observabilityPassed: true,
      workerBackpressurePassed: true,
      drRunbookRehearsed: true,
      rollbackDecisionRecorded: true,
      unresolvedCriticalOperationalRisks: 0,
      goDecision: 'HOLD',
    })).toThrow('M21-PRODUCTION-CAPACITY-GO-NOGO-GATE');
  });
});
