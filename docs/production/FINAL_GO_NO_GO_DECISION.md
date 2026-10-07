# Final Go/No-Go Decision — Pass R22 Handoff

## Decision

**HOLD — source-level complete, runtime execution required before production GO.**

## Reason

The repository contains the source-level remediation for R0-R21 and the R22 final runtime handoff. Production certification still depends on evidence that must be generated on a real runtime machine:

- a real `pnpm-lock.yaml` generated from package resolution;
- frozen install;
- lint, typecheck, unit/integration tests and build;
- Prisma migration deploy/seed proof;
- Docker Compose runtime proof for web/api/worker/postgres/redis/minio/nginx;
- MinIO document upload/download proof;
- Redis/BullMQ worker execution proof;
- browser E2E proof for critical workflows;
- security smoke and cross-tenant tests;
- backup/restore test;
- release candidate manifest.

## Go condition

Change this decision to **GO candidate** only after this command succeeds on a real machine or CI runner:

```bash
bash scripts/pass-r22-final-runtime-unblocker.sh
```

or on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\pass-r22-final-runtime-unblocker.ps1
```

The resulting evidence file must show:

```txt
GO_CANDIDATE_RUNTIME_CERTIFIED
```

## Current allowed claim

The only safe claim for this archive is:

```txt
R0-R22 source-level remediation and final runtime handoff completed.
Production remains HOLD until runtime evidence passes.
```
