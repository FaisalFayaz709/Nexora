# Blueprint Source of Truth

## Frozen source after R0 rebase

The source of truth for this project is:

**NEXORA ERP — Complete Software Architecture, Database, API & Implementation Specification**

- Base document version: **1.0**
- Base document date: **28 August 2026**
- Total pages: **90**
- Addendum: **Appendix F — Commercial Completeness Addendum v1.1**
- Addendum: **Appendix G — Frontend Implementation Completion Addendum v1.2**, dated **08 September 2026**
- Archived repository copy: `docs/source/NEXORA_ERP_Complete_Technical_Specification_v1.2_2026-09-08.pdf`
- Platform vision: **Integrated Enterprise Operations, Asset, Project & Service Management Platform**

## Non-negotiable interpretation

The project must be built as the specification describes, not as a generic ERP and not as a different framework implementation. Any change that alters the approved stack, breaks module boundaries, bypasses tenant isolation, weakens transaction integrity, ignores Appendix G, or turns the system into isolated CRUD modules must be rejected.

## Blueprint principles that control every implementation

1. **Lifecycle continuity:** customer demand flows into contract/project, project demand drives procurement and inventory, inventory becomes installed assets, assets generate maintenance/service work, and operational activity feeds finance, audit, reporting and profitability.
2. **Connected business operations:** modules must produce records consumed by downstream modules; disconnected CRUD screens are not enough.
3. **Multi-tenant SaaS readiness:** tenant-owned records are scoped by `organizationId` and resolved from authenticated membership context.
4. **Transactional integrity:** stock, finance, approval and receiving workflows must be atomic when they can be committed inside one PostgreSQL transaction.
5. **Traceability:** important records require status history, audit events, references and ownership.
6. **Configurable enterprise controls:** approvals, permissions, custom fields, statuses, rules and workflows are data-driven where practical.
7. **No AI dependency:** automation comes from deterministic rules, queues, schedules and calculations.
8. **Modular growth:** one deployable modular monolith with hard domain boundaries; extraction is only allowed later if justified by scaling needs.
9. **Frontend completion:** Appendix G is mandatory; every authenticated screen must use the approved shell, reusable component, form, grid, API/query and workflow standards.

## Locked stack

- Frontend: **Next.js + TypeScript**
- UI: **Tailwind CSS + shadcn/ui primitives + NEXORA reusable wrappers**
- Forms: **React Hook Form + Zod resolver**
- Tables/grids: **TanStack Table**
- Server state: **TanStack Query**
- Backend: **Fastify + TypeScript**
- Validation/contracts: **Zod shared browser-safe contracts**
- Database: **PostgreSQL**
- ORM/migrations: **Prisma ORM**
- Object storage: **MinIO through backend StorageService**
- Cache/locks/queue: **Redis + BullMQ**
- Containers: **Docker + Docker Compose**
- Proxy: **Nginx**
- CI/CD: **GitHub Actions**
- IaC later: **Terraform**

## Explicitly forbidden substitutions

Do not replace the approved architecture with:

- NestJS instead of Fastify modular monolith
- Express-only backend instead of Fastify
- MongoDB instead of PostgreSQL
- TypeORM/Sequelize instead of Prisma
- AWS S3 as the direct application dependency instead of the approved MinIO/S3-compatible storage boundary
- microservices before the modular monolith is completed
- server-only code inside the browser-safe shared package
- direct Prisma calls from routes/controllers
- frontend imports from backend/database packages
- raw business API logic in Next.js route handlers
- one-off frontend table/form systems that bypass shadcn/ui, React Hook Form, TanStack Table or centralized API/query conventions

## Runtime foundation decision

The runtime foundation freezes the blueprint and records compliance. It is not a transient implementation checkpoint and must not be used to claim production readiness. Production readiness remains blocked until the lockfile, dependency-backed checks, Docker runtime, E2E workflow tests, security tests, backup/restore evidence and Appendix G acceptance gates all pass.
