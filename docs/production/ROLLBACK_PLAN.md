# Rollback Plan

## Before deployment

- Record current image tags for web, API and worker.
- Capture PostgreSQL backup or managed snapshot.
- Capture MinIO bucket/object metadata backup reference.
- Record current migration version and Prisma migration status.
- Confirm rollback owner and escalation contacts.

## Rollback triggers

- Failed health/readiness after deployment.
- Failed tenant isolation, maker-checker, security smoke or full-workflow E2E critical scenario.
- Database migration failure or unclean migration status.
- Invoice/journal/stock/asset history mismatch.
- Error-rate, latency or data-integrity threshold breach during smoke.

## Rollback procedure

1. Stop release traffic or return ingress to previous stable target.
2. Re-deploy previous web/API/worker image tags.
3. Keep database forward-only where migrations are compatible.
4. Restore database only when the rollback decision record confirms data loss/corruption risk and business owner approval.
5. Restore MinIO/object metadata if document evidence proves object-level corruption.
6. Re-run health, tenant isolation, finance/stock smoke and document download checks.
7. Record final rollback evidence and incident notes.

## Non-negotiable rule

Never silently edit posted stock ledger or journal records during rollback. Use reversal/correction records when the system is live and data has been committed.
