# Backup and Restore Runbook

## Backup scope

- PostgreSQL database dump or managed snapshot.
- MinIO buckets and object metadata.
- Environment configuration references, excluding secrets from the artifact.
- Release image tags and migration version.

## Restore validation

1. Restore PostgreSQL to an isolated environment.
2. Restore MinIO objects and metadata.
3. Start API/worker/web against restored services.
4. Verify document download URLs for restored document records.
5. Verify stock ledger, journal ledger and audit records remain immutable.
6. Run representative workflow smoke tests.
7. Record evidence in `certification-output/backup-restore.log`.
