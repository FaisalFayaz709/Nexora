# Release Evidence Binder

This binder defines the durable evidence required before production GO. Generated logs and release-specific evidence should be stored outside the source tree or in ignored `certification-output/`.

| Gate | Required evidence |
| --- | --- |
| Specification / architecture / stack | `pnpm architecture:check`, contract and database-foundation gate logs |
| Dependency integrity | `pnpm-lock.yaml`, frozen-install log and dependency audit |
| Static capability verification | `pnpm verify:static` output |
| Database deployment | Prisma validate/generate/migrate/seed logs plus rollback proof |
| Container runtime | Docker Compose build/start, service health and readiness logs |
| Full lifecycle E2E | Critical workflow results with zero failed or skipped critical scenarios |
| Security | Security smoke/abuse tests, tenant-isolation evidence and dependency/image scans |
| Operations | Performance, observability, backup/restore and disaster-recovery evidence |
| Release decision | Completed `GO_NOGO_DECISION_TEMPLATE.md` with reviewer approvals |

Historical build-pass status files, manifests and audit packets are not release prerequisites.
