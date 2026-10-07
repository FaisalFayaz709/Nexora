# NEXORA ERP — Locked Technology Stack

**Baseline:** Specification Freeze & Compliance Baseline
**Authority:** NEXORA ERP Complete Technical Specification v1.0 (28 Aug 2026) + Commercial Completeness Addendum v1.1
**Status:** LOCKED

## Locked implementation stack

| Layer | Locked technology | Role |
|---|---|---|
| Frontend | Next.js + TypeScript | ERP web app, customer/vendor portals, PWA-capable technician UI |
| UI | Tailwind CSS + reusable component system | Forms, tables, drawers, dialogs, dashboards |
| Server state | TanStack Query | API caching, mutations, invalidation, pagination |
| Backend | Fastify + TypeScript | REST API, domain modules, authorization, transactions, business logic |
| Validation / contracts | Zod (shared) | Runtime validation + inferred TypeScript request/response types |
| Database | PostgreSQL | Authoritative relational system of record |
| ORM | Prisma ORM | Type-safe persistence, migrations, transactions |
| Object storage | MinIO (S3-compatible) | Private documents, images, reports, signatures, project files |
| Cache / locks / queue transport | Redis | Cache, distributed locks, rate-limit state, BullMQ transport |
| Background jobs | BullMQ | Email, PDFs, reminders, scheduled checks, exports, webhooks |
| Proxy | Nginx | TLS termination, routing, security headers, request limits |
| Containers | Docker + Docker Compose | Repeatable local and initial production runtime |
| CI/CD | GitHub Actions | Lint, typecheck, tests, security checks, builds, deployment |
| IaC later | Terraform | Repeatable infrastructure provisioning |
| Package model | Single TypeScript monorepo / root workspace install | Shared dependency environment |
| API | HTTPS JSON REST under `/api/v1` | Public application contract |
| Architecture | Opinionated domain-first modular monolith | One deployable platform with hard module boundaries |
| AI dependency | None required | Automation remains deterministic/rule/queue/schedule based |

## Non-negotiable prohibitions

The implementation must not silently replace the locked stack or architecture. In particular:

- Do not replace Fastify with Express, NestJS, or another backend framework.
- Do not replace PostgreSQL/Prisma with MongoDB, Sequelize, Firebase, Supabase-as-the-database, or another persistence model.
- Do not split the system into microservices during baseline implementation.
- Do not allow frontend code to import backend/database/server-only code.
- Do not bypass module boundaries for convenience.
- Do not let browser input determine authoritative `organizationId`.
- Do not move stock, money, approval state, or other same-transaction critical effects into asynchronous queues.
- Do not use floating point for money.
- Do not destructively edit posted/immutable ledger records.

Any future change to a locked item requires an explicit architecture decision and specification change. It is not an implementation convenience decision.
