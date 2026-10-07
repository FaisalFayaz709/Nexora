# capability gate — Maintenance Preventive/Corrective Flow

## Scope

capability gate completes the maintenance control layer on top of assets assets and field-service field service. It covers preventive maintenance plans, due schedules, maintenance scan policy, generation of exactly one work order per schedule, execution completion, next schedule creation, parts consumption, asset history and warranty/RMA handoff rules.

## Locked blueprint compliance

- The locked stack remains unchanged: Next.js, Fastify + TypeScript, PostgreSQL/Prisma, MinIO, Redis/BullMQ, Docker/Nginx/GitHub Actions.
- Maintenance scan may run through Redis/BullMQ because the blueprint allows scheduled maintenance scans.
- Critical state effects are not moved to async eventual consistency. Work-order generation, maintenance execution completion, parts ledger postings, asset history and next schedule creation stay inside service-level PostgreSQL transactions.
- Routes/controllers do not access Prisma directly.
- The maintenance module uses assets, field service, inventory and platform only through public facades.
- All tenant-owned data remains scoped by organizationId and branch/resource scope.

## Implemented source controls

- `MaintenanceWorkflowManifest` lists locked lifecycle stages, command endpoints, worker hooks and atomic transaction rules.
- `MaintenanceWorkflowPolicy` centralizes recurring plan rules, terminal asset protection, schedule generation gates, execution completion gates, part consumption validation, scan-window bounds and async critical-mutation protection.
- `MaintenanceService` is strengthened to consume these policies while preserving the repository/facade architecture.
- Worker maintenance scan handling is moved from a generic deferred placeholder to a maintenance policy-controlled discover-only processor boundary.
- Frontend Maintenance Workbench exposes the operational flow for due schedule review, work-order generation and execution completion.

## Runtime pending note

This implementation is source/static complete. Full completion still requires local runtime evidence: frozen install, Prisma validate/generate, clean migrations, Docker runtime, API integration tests and browser E2E proof.
