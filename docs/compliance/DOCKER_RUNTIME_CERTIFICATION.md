# Docker Runtime Certification

## Purpose

Certify the locked NEXORA Docker Compose topology without changing the approved application stack.

The runtime remains Next.js, Fastify/TypeScript, BullMQ, PostgreSQL/Prisma, Redis, MinIO, Nginx and Docker Compose.

## Required services

`docker-compose.yml` coordinates `postgres`, `redis`, `minio`, `minio-init`, `migrator`, `api`, `worker`, `web` and `nginx`. The migrator performs Prisma generation/migration work explicitly rather than hiding migrations inside application boot.

## Certification commands

Generate and commit a real lockfile first, then run:

```bash
pnpm docker:runtime:certify
```

Windows PowerShell:

```powershell
pnpm docker:runtime:certify:ps
```

Runtime evidence is written under `certification-output/docker-runtime/`, which is intentionally ignored by Git.

This certification proves container build/start/routing/readiness. Business workflow and production release evidence are handled by the workflow, security and release certification gates.
