# Asset Lifecycle and QR Tracking Compliance

## Scope

capability gate strengthens the Assets domain around the blueprint lifecycle chain:

Supplier → warehouse → project → technician → customer site → installed asset → warranty → maintenance/service → replacement/RMA → retirement.

## Locked stack compliance

No stack change is introduced. The implementation remains inside the approved TypeScript monorepo with Next.js frontend, Fastify backend, PostgreSQL/Prisma persistence, MinIO document storage boundary, Redis/BullMQ for asynchronous side effects only, Docker/Nginx/GitHub Actions, and Terraform later.

## Locked architecture compliance

- Asset routes/controllers remain HTTP-only and do not access Prisma.
- Asset service owns asset lifecycle orchestration, status transitions, QR handling, warranty checks and retirement/RMA rules.
- Asset repository owns Prisma persistence for Asset, AssetInstallation, AssetHistory, AssetWarranty, AssetQrTag and AssetRMA.
- Asset-to-inventory, asset-to-project, asset-to-customer, asset-to-vendor and asset-to-approval collaboration continues through public facades only.
- Asset registration, serialized installation, QR rotation, replacement, RMA and retirement remain synchronous PostgreSQL transactions where state must be immediately consistent.
- BullMQ is used only for side effects such as notifications, PDFs, webhook delivery or warranty scans, never for asset stock/status/QR/replacement/retirement state mutation.

## Source changes

- Added `shared/src/contracts/assets/asset-lifecycle-manifest.ts` to freeze assets lifecycle scope, route coverage, invariants, transaction boundaries and runtime acceptance IDs.
- Added `backend/src/modules/assets/asset-lifecycle-policy.ts` for centralized asset lifecycle guards.
- Added unit tests for asset lifecycle policy rules.
- Strengthened `AssetService` to use centralized guards for register-from-stock, installation, placement, replacement, QR resolution, QR rotation, retirement, RMA and warranty windows.
- Strengthened `AssetRepository.createHistory` to normalize append-only lifecycle events before persistence.
- Added runtime acceptance requirements for serial registration, installation, QR, replacement, retirement, warranty, RMA and history continuity.
- Added frontend Asset Lifecycle workbench at `/assets/lifecycle`.

## Blueprint invariants implemented as source controls

- Serial-tracked products cannot be registered as assets without a specific stock serial.
- Installation only starts from allowed lifecycle states: `PROCURED`, `IN_WAREHOUSE`, `ALLOCATED` or `ISSUED`.
- Serialized installation consumes the linked serial through the inventory facade in the same transaction.
- Installation creates AssetInstallation, AssetHistory, AuditLog, BusinessEvent and hashed QR token atomically.
- Raw QR token is returned only to the caller after generation/rotation and the persisted value is a hash.
- QR resolution requires an authenticated tenant context and rejects missing, revoked or expired tokens.
- Replacement requires active/service old asset, active replacement asset and identical customer/site/project placement.
- Retirement blocks terminal assets, supports approval configuration and revokes QR at terminal state.
- RMA requires a non-retired asset and an approved vendor.
- Warranty start/end dates are validated and status is derived deterministically.
- Asset history remains append-only, normalized and tenant scoped.

## Runtime status

assets is source/static complete. Full runtime completion still requires local `pnpm install --frozen-lockfile`, Prisma validation/generation, migrations, Docker runtime, and executable runtime acceptance tests against PostgreSQL, Redis and MinIO.
