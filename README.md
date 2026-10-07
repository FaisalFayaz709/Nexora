# NEXORA ERP

NEXORA is an enterprise ERP codebase built against the locked architecture, stack, API catalog, permissions model, status models, transaction boundaries, and domain rules captured under `docs/`.

## Repository structure

- `frontend/` — Next.js web application.
- `backend/` — Fastify API and domain services.
- `worker/` — background/side-effect workers.
- `database/` — Prisma schema, migrations, seeds, and database tests.
- `shared/` — shared contracts and browser-safe types.
- `docs/architecture/` — locked stack, boundaries, security baseline, storage/eventing, and transaction architecture.
- `docs/contracts/` — frozen API/permission/status/event contracts and capability locks.
- `docs/domain-rules/` — durable domain transaction rules and invariants.
- `docs/compliance/` — product-level compliance and completeness requirements.
- `docs/production/` — deployment, backup/restore, security, observability, release, rollback, and readiness runbooks.

## Verification

Use `pnpm verify:static` for the complete static capability gate chain. Use `pnpm verify` for static gates plus formatting, linting, type checking, tests, Prisma validation, and build. Production certification remains evidence-driven and is performed with the runtime/release commands defined in `package.json` and the runbooks under `docs/production/`.

Historical pass/audit status files, patch files, checksum manifests, completion roadmaps, and committed runtime evidence are intentionally not part of the production source tree. Durable requirements were promoted into stable architecture, contract, domain-rule, compliance, and production documentation.
