# PASS 24 Backup and Restore Drill Checklist

## PostgreSQL

- Capture encrypted backup.
- Record checksum.
- Restore into isolated database.
- Run migrations status check.
- Validate tenant isolation samples.
- Validate finance/inventory/approval records exist and reconcile.

## MinIO

- Export object manifest.
- Restore sample private object.
- Validate checksum.
- Verify private-bucket policy.

## Redis/BullMQ

- Document retry policy.
- Verify DLQ/poison job isolation.
- Prove critical stock/money/approval mutations are not processed as background jobs.

## RPO/RTO

- RPO must be <= 15 minutes.
- RTO must be <= 60 minutes.
