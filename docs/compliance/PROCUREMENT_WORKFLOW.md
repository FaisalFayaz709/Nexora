# capability gate — Procurement Deep Workflow

## Purpose

capability gate completes the source-level procurement workflow layer after inventory core. It aligns the implementation with the locked NEXORA blueprint flow:

Material Requirement → Purchase Request → Approval → RFQ → Supplier Quotations → Quotation Comparison → Supplier Selection → Purchase Order → Goods Receipt Note → Quality Inspection → Warehouse Stock → Supplier Invoice Source.

This implementation does not change the approved stack or architecture. It strengthens the procurement workflow using explicit state guards, command manifests, runtime acceptance evidence and frontend workflow entry points.

## Locked stack compliance

No stack replacement is introduced. The project remains:

- TypeScript monorepo
- Next.js frontend
- Fastify + TypeScript backend
- PostgreSQL + Prisma persistence
- MinIO document storage
- Redis + BullMQ for non-critical async jobs
- Docker/Nginx/GitHub Actions runtime path

## Locked architecture compliance

capability gate preserves the domain-first modular monolith rules:

- Procurement routes/controllers do not access Prisma directly.
- Procurement service coordinates business rules and transaction boundaries.
- Procurement persistence stays in ProcurementRepository.
- Cross-module synchronous access continues through public facades only:
  - InventoryFacade
  - ApprovalFacade
  - VendorGovernanceFacade
  - NumberSequenceFacade
  - EmployeeFacade
  - PlatformAccessFacade
- Critical procurement mutations remain inside PostgreSQL transactions, not BullMQ jobs.
- Audit/business events are produced by critical commands.

## Source additions

### Shared contract manifest

`shared/src/contracts/procurement/procurement-deep-workflow-manifest.ts` records:

- procurement lifecycle stages,
- command endpoints,
- required permissions,
- required idempotency on GRN receiving,
- canonical state-transition manifest,
- atomicity requirements,
- no-async critical mutation rule.

This is browser-safe and exported through the procurement contract index.

### Backend policy guards

`backend/src/modules/procurement/procurement-workflow-policy.ts` adds reusable source-level guards for:

- purchase request submission/approval/RFQ eligibility,
- RFQ invitation/publish/close/quotation eligibility,
- vendor invitation deduplication and invitation checks,
- deterministic quotation comparison,
- selected quotation before PO creation,
- PO submit/approve/send/cancel/receive state checks,
- GRN quantity validation,
- over-receipt tolerance validation,
- serialized receipt count validation,
- GRN inspection eligibility.

### Acceptance evidence

`backend/src/modules/procurement/procurement-deep-workflow.integration.test.ts` declares executable runtime scenarios that must be validated locally before final certification:

- approved PR is the only source for RFQ creation,
- approved vendor governance is enforced,
- quotation comparison/selection is deterministic,
- PO maker-checker approval works,
- GRN atomicity includes PO quantity, inventory ledger, serial/batch state, audit and event,
- concurrent GRNs cannot over-receive,
- finance receives a trustworthy PO + GRN source.

### Frontend workflow entry point

`frontend/src/app/procurement/workflow/page.tsx` and `frontend/src/modules/procurement/procurement-workflow-dashboard.tsx` add a workflow overview page. This does not replace later frontend-workflow frontend workflow completion, but it gives the user-facing ERP a clear procurement path and control map now.

## Transaction boundary rule

The following operations must stay transactional:

- PR submit + approval request + audit + event
- PR approval decision + status transition + audit + event
- RFQ creation + PR conversion + audit
- Supplier quotation selection + RFQ award + other quotation rejection + audit
- PO submit + approval request + audit
- PO approval + approval action + status transition + audit/event
- GRN header/items + PO received quantities + stock ledger + serial/batch state + audit/event
- GRN inspection + status + audit

Queues may be used only for non-critical side effects such as vendor notification, report export, email, webhook delivery or analytics refresh.

## Not claimed in this implementation

This implementation is source/static complete. Full runtime certification still requires local execution after dependency install and database/runtime boot:

- Prisma validate/generate/migrate,
- Docker Compose health checks,
- authenticated API scenario tests,
- concurrency tests,
- browser E2E tests.
