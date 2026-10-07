# Production Readiness Checklist

## Dependency and build

- [ ] Generate a real `pnpm-lock.yaml` with `pnpm install --lockfile-only`.
- [ ] Commit `pnpm-lock.yaml`.
- [ ] Run `pnpm install --frozen-lockfile` from a clean checkout.
- [ ] Run `pnpm verify:static`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm db:validate`.
- [ ] Run `pnpm db:generate`.
- [ ] Run `pnpm build`.

## Database

- [ ] Apply migrations to clean database.
- [ ] Apply migrations to representative prior snapshot.
- [ ] Confirm `pnpm db:migrate:status` is clean.
- [ ] Verify indexes and constraints for high-volume ledgers.
- [ ] Verify posted journals and stock ledgers cannot be silently edited.

## Runtime services

- [ ] PostgreSQL ready.
- [ ] Redis ready.
- [ ] MinIO ready.
- [ ] API health endpoint returns success.
- [ ] Worker starts and connects to Redis.
- [ ] Web app starts and calls API through configured base URL.
- [ ] Nginx routes web/API traffic correctly.

## Security

- [ ] Session cookies are HttpOnly, Secure and SameSite-configured.
- [ ] Tenant isolation tested for every sensitive module.
- [ ] Permission denial tested for maker-checker flows.
- [ ] Upload intent/download URL IDOR tested.
- [ ] Rate limits verified on auth and upload endpoints.
- [ ] Audit events verified for critical mutations.

## Business workflow smoke

- [ ] PR -> RFQ -> supplier quotation -> PO -> GRN -> stock.
- [ ] Project -> BOM -> reservation -> issue -> costing.
- [ ] Asset receive -> serialize -> install -> QR -> RMA/warranty.
- [ ] Ticket -> work order -> technician -> parts -> report -> close.
- [ ] Maintenance schedule -> work order -> execution -> completion.
- [ ] Invoice -> approval -> posting -> payment -> aging update.
- [ ] Landed cost -> allocation -> inventory cost layer -> journal.
- [ ] Leave -> approval -> payroll -> payroll posting journal.
- [ ] Data import -> validate -> commit -> rollback policy.
- [ ] Report export -> scheduled execution -> download.

## Release decision

- [ ] Full workflow E2E evidence has zero failed and zero skipped critical scenarios.
- [ ] Backup/restore evidence is attached.
- [ ] A tested rollback plan and rollback window are approved.
- [ ] Security smoke and tenant-isolation evidence are attached.
- [ ] Final Go/No-Go decision is recorded by the release owners.
