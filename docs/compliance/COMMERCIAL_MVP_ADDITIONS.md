# capability gate — Commercial MVP Additions

## Purpose

capability gate completes the highest-priority commercial controls from the addendum while preserving the locked NEXORA architecture and stack. It does not replace the existing roadmap. It binds the already-scaffolded commercial modules into a single compliance baseline and adds explicit policy guards, shared manifest coverage, frontend workflow access and a static exit gate.

## Locked stack compliance

This implementation keeps the approved stack unchanged:

- TypeScript monorepo
- Next.js frontend
- Fastify + TypeScript backend
- PostgreSQL + Prisma persistence
- MinIO document storage
- Redis + BullMQ for async/scheduled work
- Docker Compose, Nginx and GitHub Actions

No NestJS, Express, MongoDB, Firebase, Supabase, Sequelize, TypeORM or microservice extraction is introduced.

## Commercial MVP scope

The implementation covers the addendum priority sequence:

| Priority | Control | Owner | Required commercial outcome |
|---|---|---|---|
| P0 | Number Sequence Management | Platform | Transaction-safe PR/PO/GRN/INV/AST/TKT-style business numbers by organization, branch, entity type and fiscal year. |
| P0 | Data Import Wizard baseline | Platform | Excel/CSV onboarding with upload, validation, commit, rollback and import audit traceability. |
| P1 | Stock Count / Cycle Count | Inventory | Physical stock verification, frozen count scope, variance approval and immutable stock adjustment ledger entries. |
| P1 | Tax Engine baseline | Finance | Deterministic tax rules, transaction-time tax snapshots and tax reports. |
| P1 | Bank/Cash Management baseline | Finance | Bank accounts, vouchers, statement import and reconciliation close with payment/journal links. |
| P2 | Vendor Onboarding & Risk | Procurement/Vendors | Vendor approval, risk rating, blacklist control and RFQ/PO/payment blocking. |
| P2 | Landed Cost | Finance/Inventory | Freight/customs/handling allocation into inventory cost layers and project costing. |
| P2 | Purchase Contracts / Blanket POs | Procurement | Long-term supplier agreements, blanket POs and guarded release orders. |

## Transaction boundary

Critical commercial-controls state changes remain synchronous and transactional:

- Number issuance and target entity creation
- Import commit and rollback where policy permits
- Stock count posting and stock adjustment ledger creation
- Tax posting/snapshot creation
- Payment voucher and bank reconciliation close
- Vendor blacklist/risk changes
- Landed cost posting and cost-layer updates
- Purchase release order creation

BullMQ remains allowed only for non-critical side effects such as document generation, notifications, report exports, analytics and external webhooks.

## Files added

- `shared/src/contracts/commercial-mvp/commercial-mvp-manifest.ts`
- `backend/src/modules/commercial-mvp/commercial-mvp-policy.ts`
- `backend/src/modules/commercial-mvp/commercial-mvp-policy.test.ts`
- `backend/src/modules/commercial-mvp/commercial-mvp.integration.test.ts`
- `frontend/src/modules/commercial/commercial-mvp-workbench.tsx`
- `frontend/src/app/commercial-mvp/page.tsx`
- `scripts/check-commercial-procurement.mjs`

## Exit rule

capability gate is source/static complete only when `pnpm verify:static`, `pnpm architecture:check` and `pnpm contracts:check` pass. Runtime completion still requires local dependency install, Prisma validation/migration, Docker runtime and executable workflow integration tests.
