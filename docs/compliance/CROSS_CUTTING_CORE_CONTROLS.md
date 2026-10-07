# Cross-Cutting Core Controls

## Purpose

the runtime implementation establishes the shared backend controls that every future business module must use without changing the locked NEXORA ERP stack or architecture. This implementation does not complete business workflows by itself; it provides the required guardrails for identity/organization and later business capabilities.

## Locked stack compliance

This implementation keeps the approved stack unchanged:

- TypeScript monorepo
- Next.js frontend
- Fastify + TypeScript backend
- PostgreSQL + Prisma persistence
- MinIO object storage
- Redis + BullMQ for asynchronous and scheduled work
- Docker Compose / Nginx / GitHub Actions
- Terraform later only

No Express, NestJS, MongoDB, Firebase, Supabase, Laravel, Django, FastAPI, or microservice rewrite is introduced.

## Required protected-command pipeline

All protected command endpoints must preserve this sequence:

```text
authenticate -> resolve tenant -> module enabled -> permission -> payload validation -> service/resource scope -> transaction -> audit/event -> post-commit async side effects
```

The new `createRouteGuard` helper centralizes the route-level portion:

```text
authenticate -> resolve tenant -> module enabled -> permission
```

Resource-level checks remain inside services/repositories because permissions alone are not enough. Services must verify tenant, branch, ownership, assignment, portal identity, and subject-specific access before executing commands.

## Added core controls

| Area | Files | Rule enforced |
|---|---|---|
| Request context | `backend/src/core/request/authenticated-context.ts` | Controllers/services must receive actor and tenant context from the auth pipeline, not request body fields. |
| Route guard | `backend/src/core/authorization/route-guard.ts` | Standard Fastify pre-handler order for auth, tenant resolution, module enablement and permission checks. |
| Resource scope | `backend/src/core/authorization/resource-scope.ts` | Tenant and branch scope assertions for tenant-owned records. |
| Status transitions | `backend/src/core/workflow/status-transition.ts` | Clients cannot freely patch statuses; commands must follow allowed state-machine transitions. |
| Idempotency | `backend/src/core/idempotency/*` | Retry-sensitive commands can reserve keys, compare stable request hashes and replay stored responses. |
| Pagination | `backend/src/core/http/pagination-policy.ts` | ERP grids must use bounded pagination windows. |
| Sort/filter policy | `backend/src/core/http/sort-filter-policy.ts` | Endpoints must allowlist sortable/filterable fields and reject raw database expressions. |
| Transactional effects | `backend/src/core/transactions/transactional-command.ts` | Critical command audit/events can be persisted inside the same PostgreSQL transaction. |

## Idempotency rule

Idempotency is required or strongly recommended for retry-sensitive commands such as payments, GRNs, invoice posting, bank reconciliation close, stock count posting, landed cost posting and import commit.

Idempotency keys are tenant-scoped by:

```text
organizationId + route + key
```

Reusing the same key with a different payload must fail. Reusing the same key with the same payload can safely replay the stored response after completion.

## Transaction rule

Do not move stock, money, approval state, tax posting, payment posting, landed-cost posting, stock variance posting or accounting effects to BullMQ when they can be committed in one PostgreSQL transaction.

Queues are allowed only after commit for:

- email
- notifications
- PDFs
- exports
- analytics
- webhooks
- optional document scanning

## Route/controller rule

routes/controllers must not call Prisma and must not import `@nexora/database`. Controllers are responsible for HTTP input/output, request context, parsing contracts and response envelopes. Business rules and transaction plans remain in services. Persistence remains in repositories.

## Tenant isolation rule

Do not trust organizationId from request bodies as authorization context. Tenant context must come from authenticated membership resolution. Tenant-owned repository queries must include `organizationId`, and branch-owned operational records must also apply branch scope where required.

## Exit status

the runtime implementation is considered source/static complete when:

- the the runtime foundation core-control files exist;
- their unit tests exist;
- `core-controls:check` passes;
- the locked architecture gate still passes;
- no forbidden stack dependency or route/controller Prisma access is introduced.

Full runtime certification remains pending until local dependency install, database migration, Docker runtime and integration tests are executed.
