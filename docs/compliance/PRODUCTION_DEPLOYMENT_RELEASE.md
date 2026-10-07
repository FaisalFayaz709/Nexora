# Production Deployment / Release Candidate

## Purpose

capability gate converts the cumulative NEXORA ERP source into a release-candidate package with production-blocking evidence gates. It does not claim a live production deployment. It defines the exact proof required before a deployment can be approved.

## Locked stack compliance

production-release does not replace or add an alternative application stack. The project remains:

- TypeScript monorepo
- Next.js frontend
- Fastify + TypeScript backend
- PostgreSQL + Prisma
- MinIO object storage
- Redis + BullMQ for side effects
- Docker + Nginx
- GitHub Actions

## Locked architecture compliance

production-release keeps the locked architecture rules:

- frontend uses public API contracts only;
- route/controller layer does not call Prisma directly;
- services use repositories and public facades;
- synchronous cross-domain coordination goes through public module surfaces;
- BullMQ remains limited to side effects and scheduled scans;
- stock, finance, approval and critical workflow state remain transactional;
- production release is blocked until runtime evidence exists.

## production-release release gates

1. production-release-SOURCE-ARCHIVE-FROZEN-CHECKSUMED-REPRODUCIBLE
2. production-release-LOCKED-STACK-DEPLOYMENT-TOPOLOGY-UNCHANGED
3. production-release-ENVIRONMENT-SECRETS-AND-CONFIGURATION-MATRIX
4. production-release-DATABASE-MIGRATION-BACKUP-RESTORE-ROLLBACK-GATE
5. production-release-CONTAINER-IMAGE-NGINX-HEALTH-READINESS-GATE
6. production-release-RUNTIME-E2E-SECURITY-SMOKE-EVIDENCE-GATE
7. production-release-OBSERVABILITY-AUDIT-LOG-PII-REDACTION-GATE
8. production-release-RELEASE-NOTES-KNOWN-RISKS-GO-NOGO-DECISION

## Production decision rule

The release decision is HOLD until all runtime evidence files are attached, all critical scenarios have zero failures and zero skipped results, backups and rollback are verified, and owner approval is recorded.
