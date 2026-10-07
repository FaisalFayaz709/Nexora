# Deployment Runbook

1. Create release branch from static-complete statically verified source.
2. Generate and commit `pnpm-lock.yaml`.
3. Run CI with frozen install.
4. Build images for web, api and worker.
5. Run image scan and verify non-root runtime users where practical.
6. Deploy PostgreSQL migrations through a controlled migration job.
7. Deploy Redis, MinIO, API, worker, web and Nginx.
8. Verify health endpoints and readiness checks.
9. Run smoke tests for the critical workflows.
10. Keep rollback image tags and database backup references with release notes.

No production deployment should bypass migration status, tenant-isolation tests,
or audit-log verification.
