# M19_PRODUCTION_GO_NOGO_GATE — Final Go / No-Go Packet

This packet is the final production-readiness control surface for NEXORA ERP. It does not approve production by itself. It records the evidence that must exist before release owners can choose **GO / NO-GO / HOLD**.

## Locked architecture and stack statement

Decision status for the source archive: **NO STACK DEVIATION** detected by static gates.

The approved stack remains:

- Next.js + TypeScript frontend.
- Tailwind CSS and reusable component system.
- TanStack Query for server state.
- Fastify + TypeScript backend.
- Shared Zod contracts.
- PostgreSQL + Prisma.
- MinIO private object storage.
- Redis + BullMQ for cache, locks, queues and scheduled jobs.
- Docker Compose runtime with web, api, worker, postgres, redis, minio and nginx.
- GitHub Actions CI/CD.

## Current release decision

Current decision: **HOLD**

Reason: this archive contains the source/governance completion gate, but production release must remain blocked until real runtime and dependency evidence is attached.

## Hard hold rules

- HOLD_UNTIL_PNPM_LOCKFILE_EXISTS
- HOLD_UNTIL_FROZEN_INSTALL_PASSES
- HOLD_UNTIL_DOCKER_RUNTIME_PASSES
- HOLD_UNTIL_FULL_LIFECYCLE_E2E_ZERO_FAILED_ZERO_SKIPPED
- HOLD_UNTIL_SECURITY_SMOKE_AND_BACKUP_RESTORE_EVIDENCE_ATTACHED

## Evidence that must be attached before GO

| Area | Required proof | Current M19 position |
| --- | --- | --- |
| Dependency lock | `pnpm-lock.yaml` committed from real pnpm resolution | HOLD |
| Frozen install | `pnpm install --frozen-lockfile` log from clean checkout | HOLD |
| Static gates | `pnpm verify:static` passed | Ready to run after lockfile |
| Lint/type/build/test | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all passed | HOLD |
| Prisma/database | validate, generate, migrate deploy/status and seed evidence | HOLD |
| Docker runtime | `docker compose config/build/up`, health and readiness logs | HOLD |
| Worker/storage | Redis/BullMQ worker and MinIO bucket/upload proof | HOLD |
| Full lifecycle E2E | zero failed and zero skipped critical scenarios | HOLD |
| Security smoke | tenant isolation, RBAC, maker-checker, IDOR, upload and rate-limit proof | HOLD |
| Backup/restore | backup checksum, MinIO manifest, restore drill and rollback proof | HOLD |
| Observability | request id, audit log, redaction and alert evidence | HOLD |
| Release ownership | completed GO_NOGO_DECISION_TEMPLATE.md with approver | HOLD |

## Final command chain

On an online machine after generating the real lockfile:

```bash
pnpm install --frozen-lockfile
pnpm verify:static
pnpm lint
pnpm typecheck
pnpm test
pnpm db:validate
pnpm db:generate
pnpm build
pnpm final:certify
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\final-certify.ps1
```

The final certification chain now includes the production release certification gate. That gate remains strict and blocks production sign-off when runtime evidence, security smoke evidence, backup/restore evidence, or release approval is missing.

## Decision field for release owner

Decision: **GO / NO-GO / HOLD**

Approver:

Timestamp:

Evidence package checksum:

Notes:
