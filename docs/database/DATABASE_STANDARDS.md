# Locked Database Standards

- PostgreSQL remains the system of record.
- Prisma remains ORM/migration layer.
- UUID identifiers are standardized.
- Tenant-owned foundation models carry `organizationId`.
- Branch scope is represented where the source defines branch ownership/scope.
- Money will use DECIMAL/NUMERIC, never floating point; The database foundation introduces no money fields.
- Future quantities use NUMERIC with explicit UOM.
- Persisted timestamps use timezone-aware PostgreSQL timestamps.
- Ledgers are append-only or reversal-based.
- State transitions are service controlled.
- Critical concurrency uses transactions/constraints/locking/version controls.
- Tenant key leads common compound indexes.
- Business numbers remain separate from UUID primary keys.
- Explicit foreign keys are preferred when referenced models exist.

The database foundation uses PostgreSQL `gen_random_uuid()` consistently for physical UUID generation. This is an implementation choice compatible with the locked UUID standard.
