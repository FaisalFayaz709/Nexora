# Projects, BOM, Budget and Costing Compliance

## Scope

capability gate strengthens the Projects domain around the blueprint delivery chain:

Project → phases/tasks/milestones/team → Bill of Materials → inventory availability → shortage/material requirement → budget → committed/actual cost → profitability → handover → timeline.

## Locked stack compliance

No stack change is introduced. The implementation remains inside the approved TypeScript monorepo with Next.js frontend, Fastify backend, PostgreSQL/Prisma persistence, MinIO storage boundary, Redis/BullMQ for asynchronous side effects only, Docker/Nginx/GitHub Actions, and Terraform later.

## Locked architecture compliance

- Project routes/controllers remain HTTP-only and do not access Prisma.
- Project service owns project business rules and orchestration.
- Project repository owns Prisma persistence.
- Project-to-inventory and project-to-procurement collaboration continues through public facades only.
- Project status, BOM status, material requirement creation, handover and costing state are not delegated to BullMQ.
- Critical project mutations write audit events inside the same PostgreSQL transaction.

## Source changes

- Added `shared/src/contracts/projects/project-delivery-manifest.ts` to freeze projects scope, route coverage, invariants, cost categories, transaction boundaries and runtime acceptance IDs.
- Added `backend/src/modules/projects/project-delivery-policy.ts` for centralized guards and deterministic calculations.
- Strengthened `ProjectService` to use centralized guards for dates, status transitions, task progress/dependencies, BOM line validation, BOM shortage calculation, budget summary and costing snapshot.
- Extended project timeline continuity to include milestones and budget versions.
- Added a frontend Projects Delivery workbench at `/projects/delivery`.

## Blueprint invariants implemented as source controls

- Project date validation is centralized through `assertProjectSchedule`.
- Status transitions use the explicit project state table through `assertProjectStatusTransition`.
- Task dependencies are non-self, non-duplicate and project-scoped.
- Completed tasks resolve to 100 percent progress.
- BOM items are unique by product and have positive decimal quantities.
- BOM shortage uses required minus reserved minus issued minus free stock.
- Material requirements are created only from approved BOM shortages through the procurement facade.
- Costing uses Decimal money and derives contract value, budget, committed procurement, actual received material, total actual cost, gross profit, margin and budget usage.
- Timeline exposes project, task, milestone, BOM, budget, procurement and handover continuity.

## Runtime status

projects is source/static complete. Full runtime completion still requires local `pnpm install --frozen-lockfile`, Prisma validation/generation, migrations, Docker runtime, and runtime acceptance tests against PostgreSQL.
