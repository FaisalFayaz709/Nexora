# Disaster Recovery Drill Runbook

## Drill steps

1. Record release-candidate image tags and source checksum.
2. Capture PostgreSQL and MinIO backup references.
3. Restore database and object storage into an isolated environment.
4. Run health/readiness checks against restored services.
5. Run tenant-isolation smoke checks against restored records.
6. Rehearse rollback decision using the rollback plan.
7. Record the GO/NO-GO decision.

## Required outcome

The restore drill, rollback decision and operational GO/NO-GO signoff must be attached before production. Any missing evidence keeps the release in HOLD.
