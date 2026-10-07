# capability gate — Inventory Core Completion

## Purpose

capability gate hardens the inventory core after Business Master Data. The objective is to keep inventory transaction-based rather than CRUD-based and to preserve the locked NEXORA architecture while preparing runtime certification for stock balances, stock ledger, serial numbers, batch/lots, reservations, transfers and adjustments.

## Locked stack preservation

No stack change is introduced in this implementation.

- Frontend: Next.js + TypeScript.
- Backend: Fastify + TypeScript.
- Database: PostgreSQL + Prisma.
- Storage: MinIO remains behind StorageService.
- Async: Redis + BullMQ remain for non-critical side effects only.
- Runtime: Docker Compose + Nginx.
- CI/CD: GitHub Actions.

## Inventory scope completed in this implementation

Inventory operational scope is now documented and guarded by explicit shared/backend policy surfaces:

- Stock balances.
- Immutable stock ledger.
- Stock reservations.
- Stock transfers.
- Stock adjustments.
- Serial-number tracking.
- Batch/lot tracking.
- Stock freeze awareness for active stock counts.
- Low-stock domain event emission.

## Blueprint rules preserved

Inventory is a critical transactional domain. The following rules are mandatory:

1. Routes/controllers do not call Prisma directly.
2. Inventory services coordinate business operations only through inventory repositories and core boundaries.
3. Every stock mutation runs in a PostgreSQL transaction.
4. Balance updates and ledger entries are committed together.
5. Tenant scope uses authenticated `organizationId`; request bodies cannot override it.
6. Branch-scoped users can mutate only warehouses in the active branch scope.
7. Serial-tracked operations require one unique serial per unit.
8. Batch-tracked operations require batch allocations to equal movement quantity.
9. Active physical stock count freezes block affected stock mutations.
10. Stock, serial, batch and ledger effects are never delegated to BullMQ.

## Files added or updated

- `shared/src/contracts/inventory/inventory-core-manifest.ts`
- `backend/src/modules/inventory/inventory-core-policy.ts`
- `backend/src/modules/inventory/inventory-core-policy.test.ts`
- `backend/src/modules/inventory/inventory-concurrency.integration.test.ts`
- `frontend/src/modules/inventory/inventory-operations-dashboard.tsx`
- `frontend/src/modules/inventory/inventory-operation-lists.tsx`
- `frontend/src/app/inventory/page.tsx`
- `frontend/src/app/inventory/reservations/page.tsx`
- `frontend/src/app/inventory/transfers/page.tsx`
- `frontend/src/app/inventory/adjustments/page.tsx`
- `frontend/src/app/inventory/serials/page.tsx`
- `scripts/check-inventory.mjs`

## Runtime acceptance still required locally

This implementation is source/static complete. Full runtime completion requires local execution after dependency installation and PostgreSQL runtime:

```bash
pnpm inventory:check
pnpm test -- --run backend/src/modules/inventory/inventory-core-policy.test.ts
RUN_INTEGRATION_TESTS=1 pnpm test -- --run backend/src/modules/inventory/inventory-concurrency.integration.test.ts
pnpm db:validate
pnpm db:migrate:deploy
```

## Explicit non-goals

This implementation does not implement procurement GRN posting, project material issue, technician spare-part issue, asset installation consumption, landed-cost valuation, stock count posting or browser workflow forms. Those are completed in later passes where the owning domains exist.
