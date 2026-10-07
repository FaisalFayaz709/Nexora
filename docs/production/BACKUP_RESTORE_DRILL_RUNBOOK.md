# Backup and Restore Drill Runbook

## Required backup evidence

- PostgreSQL backup checksum.
- MinIO object manifest checksum.
- Backup encryption proof.
- Retention policy with at least 30 days retained.
- Backup metadata tied to release-candidate commit/tag.

## Restore drill

1. Restore the PostgreSQL backup into an isolated database.
2. Restore sampled MinIO objects from the object manifest.
3. Validate migration status after restore.
4. Validate sample documents by checksum.
5. Run tenant-isolation sample checks against the restored data.
6. Record RPO <= 15 minutes.
7. Record RTO <= 60 minutes.

## Blocker

Production remains HOLD when restore proof, checksum proof, encryption proof, tenant-isolation proof, `RPO <= 15 minutes`, or `RTO <= 60 minutes` is missing.
