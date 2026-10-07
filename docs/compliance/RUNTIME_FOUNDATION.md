# Repository Runtime Foundation

## Purpose

The repository is configured for reproducible execution without changing the locked stack, framework, database, module ownership, or domain boundaries.

## Locked decisions preserved

- One TypeScript monorepo.
- Root workspace dependency installation only.
- Package manager: `pnpm@10.15.0`.
- Node runtime: Node 22.
- Frontend: Next.js + TypeScript.
- Backend: Fastify + TypeScript.
- Database: PostgreSQL + Prisma.
- Object storage: MinIO through the backend storage boundary.
- Async runtime: Redis + BullMQ.
- Runtime topology: web, api, worker, postgres, redis, minio, nginx.

## Lockfile generation

A real `pnpm-lock.yaml` must be generated from the package registry; it must never be fabricated or manually edited.

Linux/macOS:

```bash
bash scripts/generate-lockfile.sh
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate-lockfile.ps1
```

Then verify reproducibility and the static capability gates:

```bash
pnpm install --frozen-lockfile
pnpm dependencies:check
pnpm verify:static
```

The repository is not release-ready until a clean frozen install succeeds.
