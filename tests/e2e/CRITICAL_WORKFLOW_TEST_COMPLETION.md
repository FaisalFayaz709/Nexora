# R18 Critical Workflow Test Completion

This file describes the runtime evidence that must be collected by the executable R18 tests.

## Required evidence location

`certification-output/pass-r18-test-runtime/`

## Runtime commands

```bash
pnpm install --frozen-lockfile
pnpm db:validate
pnpm db:migrate:deploy
pnpm db:seed
RUN_INTEGRATION_TESTS=1 RUNTIME_CERTIFICATION=1 pnpm --filter @nexora/backend test
RUN_BROWSER_E2E=1 pnpm test:e2e:browser
pnpm security:smoke:certify
pnpm backup-restore:certify
```

## Scenarios that must have zero failures and zero skipped critical paths

- Purchase Request → Approval → RFQ → PO → GRN → Stock Ledger
- Project → BOM → Material Requirement → Procurement handoff
- Stock Receipt → Serialized Asset Registration → Installation → QR
- Ticket → Work Order → Service Report → Parts Consumption → Close
- Customer Invoice → Approval → Post → Payment Allocation
- Supplier Invoice → Three-way Match → Payable → Payment
- Technician PWA Offline Sync → Replay → Conflict handling
- Cross-tenant IDOR denial → Maker-checker denial → Portal scope denial
- Document Upload Intent → Complete Upload → MinIO object → Report export worker
- Frontend route shell → Data grid → RHF/Zod form → command states

## Production blocker

If any critical scenario is skipped, failed, or lacks machine-readable evidence, R18 remains HOLD and cannot be used as production signoff.
