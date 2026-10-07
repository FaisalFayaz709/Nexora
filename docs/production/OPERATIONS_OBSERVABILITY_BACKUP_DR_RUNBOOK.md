# PASS 24 Operations, Observability, Backup and DR Runbook

## Goal

Produce the runtime evidence required to move PASS 24 from `HOLD_OPERATIONS_RUNTIME_EVIDENCE_REQUIRED` to `GO_OPERATIONS_RUNTIME_CERTIFIED`.

## Required order

1. Generate and commit a real root `pnpm-lock.yaml`.
2. Run `pnpm install --frozen-lockfile`.
3. Run source gates: `pnpm verify:static` and `pnpm pass:24:check`.
4. Start Docker runtime through the PASS 23 runbook.
5. Capture performance evidence.
6. Capture PostgreSQL query-plan evidence.
7. Capture backup checksums and retention proof.
8. Run restore drill and validate RPO/RTO.
9. Restore a MinIO object sample and validate checksum.
10. Confirm Redis recovery plan and queue retry/DLQ behavior.
11. Capture structured logs, request ID, correlation ID, traces and metrics.
12. Verify alert rules and on-call ownership.
13. Confirm health/readiness/liveness endpoints.
14. Rehearse incident response, DR and rollback.
15. Produce `pass-24-runtime-evidence-manifest.json` inside `certification-output/pass-24-operations-observability-backup-dr/`.

## Commands

```bash
pnpm pass:24:check
bash scripts/pass-24-operations-observability-backup-dr-certify.sh
```

PowerShell:

```powershell
pnpm pass:24:check
powershell -ExecutionPolicy Bypass -File scripts\pass-24-operations-observability-backup-dr-certify.ps1
```

## GO rule

GO is allowed only when every required artifact exists and the manifest records no open critical incident, no failed request, no restore failure, no missing backup checksum, no missing traces, no alerting gap and no queue backpressure/DLQ gap.
