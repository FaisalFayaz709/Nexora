# Locked Architecture and Stack Rules

## Locked stack

| Layer | Locked technology | Rule |
|---|---|---|
| Workspace | Single TypeScript monorepo | Dependencies are managed from the repository root with pnpm workspace. |
| Frontend | Next.js + TypeScript | ERP web app, portals and PWA-capable technician UI live in `frontend/`. |
| UI | Tailwind CSS + reusable component system | Consistent forms, tables, drawers, dialogs and dashboards. |
| Server state | TanStack Query | API caching, mutations, invalidation, pagination and request lifecycle. |
| Backend | Fastify + TypeScript | REST API, domain modules, authorization, transactions and business logic. |
| Validation/contracts | Zod shared contracts | Browser-safe request/response schemas and inferred TypeScript types. |
| Database | PostgreSQL | Authoritative relational system of record. |
| ORM/migrations | Prisma ORM | Type-safe persistence, migrations and transactions. |
| Object storage | MinIO | Private documents, images, reports, signatures and project files. |
| Cache/locks/queues | Redis | Short-lived cache, locks, rate-limit state and BullMQ transport. |
| Background jobs | BullMQ | Email, PDFs, reminders, scheduled checks, exports and webhooks. |
| Proxy | Nginx | TLS termination, routing, headers and request limits. |
| Containers | Docker + Docker Compose | Repeatable local and initial production runtime. |
| CI/CD | GitHub Actions | Lint, typecheck, tests, security checks, builds and deployment. |
| IaC | Terraform later | Infrastructure provisioning after runtime architecture is stable. |

## Mandatory backend layering

| Layer | Allowed | Forbidden |
|---|---|---|
| Route | URL, method, schema binding, pre-handlers, controller binding | Business rules, direct Prisma queries |
| Controller | Translate HTTP input/output and status codes | Business calculations, direct database access |
| Service | Business rules, orchestration, authorization scope checks, transaction coordination | HTTP response formatting |
| Repository | Persistence queries for module-owned entities | Calling controllers or exposing database types as API contracts |
| Mapper | Persistence/domain to API DTO mapping | Database writes |
| Facade | Public synchronous API exposed to other modules | Leaking repositories or internal services |
| Event handler | Non-critical side effects and reactions | Replacing atomic business transactions |

## Cross-module rules

- Every business feature belongs to exactly one owning domain module.
- Routes and controllers never call Prisma directly.
- Module A cannot import Module B repositories or private services.
- Synchronous cross-module calls use the target module public facade.
- Non-critical asynchronous side effects use domain events or BullMQ.
- Critical changes that must remain consistent are committed in one database transaction.
- Prisma-generated types are internal persistence types; shared API contracts are separate.
- Frontend imports only browser-safe shared packages, never backend/database packages.
- All tenant-owned queries require tenant context.
- Critical mutations emit business audit events.

## Atomicity rule

Never use eventual consistency for stock balances, invoice balances, approval state, tax posting, payment posting, bank reconciliation closure or accounting postings when the workflow can be committed inside one PostgreSQL transaction.

## Definition-of-Done rule

A module is not complete when CRUD works. It is complete only when database migration, validation, service/repository logic, RBAC, tenant filtering, branch/resource scope, state transitions, audit, transactions, tests, API docs, error codes, indexes, frontend workflow and runtime proof are complete.
