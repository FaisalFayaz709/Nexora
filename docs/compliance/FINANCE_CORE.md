# capability gate — Finance Core

## Scope

capability gate completes the finance control layer for customer invoices, supplier invoices, three-way matching, payments, expenses, accounts, journal entries, AR/AP aging, reversal-only correction and project-costing handoff.

## Locked blueprint compliance

- The locked stack remains unchanged: Next.js, Fastify + TypeScript, PostgreSQL/Prisma, MinIO, Redis/BullMQ, Docker/Nginx/GitHub Actions.
- Finance critical mutations remain inside service-level PostgreSQL transactions. Payment posting, invoice posting, supplier invoice three-way match, journal posting, allocation updates and approval state are not BullMQ side effects.
- Supplier invoice `MATCHED` is stored in `matchStatus`; it is not a canonical invoice `status`.
- Posted journals and ledger-backed finance effects are corrected through reversal/cancel records, never silent destructive edits.
- Routes/controllers do not access Prisma directly.
- Finance uses procurement, projects, vendors, customers, employees, approval, number sequence and platform modules only through public facades.
- Tenant, branch/resource, permission and audit controls remain mandatory.

## Implemented source controls

- `FinanceCoreManifest` records finance stages, command endpoints, atomic transaction rules and acceptance scenarios.
- `FinanceCorePolicy` centralizes canonical invoice statuses, supplier match-status separation, three-way match decisions, customer invoice state machine, payment idempotency/allocation validation, journal balancing and reversal-only corrections.
- `FinanceService` is strengthened to call finance policies for posting, matching, approving, sending, payment allocation and journal posting.
- `SupplierInvoiceStatusSchema` now uses the canonical invoice status model; `MATCHED` remains in `SupplierInvoiceMatchStatusSchema` only.
- Frontend Finance Workbench exposes the operational flow for invoice commands, supplier match, payments, AR/AP aging and accounts.

## Runtime proof still required

This implementation is source/static complete. Final completion still requires local runtime proof with a real lockfile, PostgreSQL, Prisma migrations, Docker Compose, authenticated API calls and executable integration scenarios. Declarative runtime acceptance remains intentionally visible until final certification replaces it with executable scenario IDs.

## Non-negotiable finance rules

1. Payment requires an `Idempotency-Key`.
2. Payment allocations must equal payment amount.
3. Invoice balances update in the same transaction as payment, allocation and journal creation.
4. Supplier invoice approval requires `matchStatus=MATCHED`.
5. Three-way match compares PO, accepted GRN quantity and supplier invoice line data.
6. `MATCHED` is not an invoice status.
7. Journal debits must equal credits.
8. Posted journals are corrected by reversal, not destructive edit/delete.
9. AR/AP reports must be tenant/permission scoped.
10. BullMQ may handle documents, emails, reports and webhooks only; it must not post money, ledger or approval state.
