# PASS 23 Runtime Deployment Certification Runbook

## Purpose

Use this runbook to prove that NEXORA runs as one coordinated deployment: Next.js web, Fastify API, BullMQ worker, PostgreSQL, Redis, MinIO and Nginx.

## Prerequisites

- Docker Desktop or Docker Engine is running.
- Node 22 is installed.
- Corepack is available.
- Internet access is available for dependency resolution and image pulls.
- Root `pnpm-lock.yaml` has been generated and committed.

## Commands

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install --frozen-lockfile
pnpm pass:23:check
pnpm verify:static
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:validate
bash scripts/pass-23-runtime-deployment-certification-certify.sh
```

## Expected evidence

The certification script writes evidence to:

```text
certification-output/pass-23-runtime-deployment/
```

Expected files:

- `pass-23-runtime-deployment-certification.log`
- `docker-compose.config.yml`
- `docker-compose-ps.txt`
- `nginx-healthz.txt`
- `api-live.json`
- `api-ready.json`
- `web-home.html`
- `minio-upload-download-proof.txt`
- `docker-compose-logs.tail.txt`
- `pass-23-runtime-evidence-manifest.json`

## Required runtime checks

- Nginx `/healthz` returns success.
- Fastify `/api/v1/health/live` returns success through Nginx.
- Fastify `/api/v1/health/ready` returns success through Nginx.
- Next.js home route loads through Nginx.
- MinIO private bucket accepts and returns proof object.
- PostgreSQL, Redis, MinIO, API, worker, web and Nginx are healthy.
- Full workflow and security smoke gates are either passed or recorded as blockers.

## Decision rule

- `GO` only when every runtime evidence file is present and all runtime checks passed.
- `HOLD` if lockfile, install, build, migration, seed, Docker, health, MinIO, E2E or security proof is missing.
- `NO_GO` if any critical runtime/security/business workflow fails.

Decision marker: GO only when every runtime evidence file is present and all runtime checks passed.
