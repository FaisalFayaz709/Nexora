# Final Blueprint Compliance Matrix — Pass R21

This matrix is generated for the latest 90-page NEXORA ERP blueprint and its Appendix F / Appendix G additions. It separates **source-level compliance** from **runtime/production certification**.

| Area | Requirement | Current source status | Production status |
|---|---|---:|---:|
| Source of truth | Latest 90-page blueprint, Appendix F and Appendix G active | PASS | PASS |
| Locked stack | Next.js + TypeScript frontend, Fastify + TypeScript backend, PostgreSQL + Prisma, MinIO, Redis, BullMQ, Docker, GitHub Actions | PASS | Needs runtime proof |
| Monorepo | Root pnpm workspace dependency model | PASS source | HOLD: lockfile missing |
| Backend architecture | Domain-first modular monolith, route/controller/service/repository/facade boundaries | PASS source | Needs tests/build proof |
| Tenant/RBAC | Tenant context, branch/resource scope, permission gates and audit rules | PASS source | Needs integration/security proof |
| API | Fastify `/api/v1`, shared contracts, command endpoints, stable errors, idempotency | PASS source | Needs API integration proof |
| Appendix G frontend | shadcn/ui-compatible primitives, app/data/forms/feedback/workflow wrappers | PASS source | Needs typecheck/component tests |
| Frontend forms | React Hook Form + Zod resolver and backend error mapping | PASS source | Needs runtime tests |
| Frontend grids | TanStack Table and module column files | PASS source | Needs runtime tests |
| Shells | `(auth)`, `(erp)`, `(portal)`, `(technician)` route-group layouts | PASS source | Needs browser E2E proof |
| Business API access | Central API client/query layer; no duplicate Next.js business API | PASS source | Needs runtime proof |
| Offline sync | Fastify `POST /api/v1/portal/technician/offline-sync` | PASS source | Needs integration/E2E proof |
| Business modules | Identity, masters, inventory, procurement, projects/assets, service/maintenance/PWA, finance, platform/portals/reports | PASS source | Needs runtime proof |
| Tests | R18 test matrix and critical workflow specs | PASS source | HOLD until tests execute |
| Docker/runtime | R19 runtime certification scripts and topology | PASS source | HOLD until Docker executes |
| CI/CD | R20 hardened workflows and branch protection docs | PASS source | HOLD until GitHub CI runs |
| Final production GO | Full blueprint-compliant release candidate | HOLD | HOLD |

## Runtime evidence still required

- `pnpm-lock.yaml`
- `pnpm install --frozen-lockfile`
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm db:validate`
- `pnpm db:migrate:deploy`
- `pnpm db:seed`
- `pnpm test`
- `pnpm build`
- `docker compose config`
- `docker compose build`
- `docker compose up`
- health checks
- MinIO upload/download proof
- Redis/BullMQ worker proof
- browser E2E proof
- security smoke proof
- backup/restore proof
- final release candidate manifest
