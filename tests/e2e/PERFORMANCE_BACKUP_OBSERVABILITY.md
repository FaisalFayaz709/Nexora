# M21 Runtime E2E Evidence Checklist

## M21-RUNTIME-API-P95-ERROR-RATE-SLO

Run the API load test against the release-candidate stack and attach p95/error-rate evidence. Failed critical requests must equal zero.

## M21-RUNTIME-DB-QUERY-PLAN-INDEX-GATE

Attach query plans for tenant/branch/date-scoped hot queries and reports. The evidence must prove indexes are used and unbounded table scans are absent for core lists.

## M21-RUNTIME-BACKUP-RESTORE-RPO-RTO

Create encrypted PostgreSQL and MinIO backups, restore into an isolated environment, validate sample records/documents and prove RPO <= 15 minutes and RTO <= 60 minutes.

## M21-RUNTIME-OBSERVABILITY-REDACTION-ALERTING

Attach request ID/correlation ID trace, structured logs, metrics, traces, health/readiness logs, redaction scan, audit sample, alert rules and on-call runbook.

## M21-RUNTIME-WORKER-BACKPRESSURE-DLQ

Prove worker queue lag stays within threshold, stalled jobs end at zero, DLQ/retry policy exists and poison jobs are isolated.

## M21-RUNTIME-DR-GO-NOGO-BLOCKER

Run the DR rollback rehearsal and record operational GO/NO-GO. Production remains HOLD until this evidence is attached.
