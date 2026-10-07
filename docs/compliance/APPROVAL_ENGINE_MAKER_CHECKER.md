# capability gate — Approval Engine and Maker-Checker Completion

## Purpose

capability gate completes the cross-module approval engine layer required before projects, assets, service, maintenance and finance are deepened. The implementation keeps the locked NEXORA architecture unchanged and strengthens configurable approval definitions, approval requests, approval steps, approval actions, maker-checker separation, subject decision handlers and audit evidence.

## Locked blueprint alignment

- Approval definitions remain tenant owned by `organizationId` and are evaluated in the approval service, not in frontend state.
- Approval requests are created by the owning domain module inside the originating PostgreSQL transaction.
- Approval decisions lock the request and current step before creating an `ApprovalAction`.
- Final approval/rejection/return decisions are applied through the registered subject facade/handler.
- The requester/creator cannot approve, reject or return their own high-risk approval request.
- Rejections require a comment.
- Every decision writes a stable audit action name.
- Approval state is never moved to BullMQ or eventual consistency.

## Files added or changed

- `shared/src/contracts/approvals/approval-engine-manifest.ts`
- `shared/src/contracts/approvals/index.ts`
- `backend/src/modules/approvals/approval-engine-policy.ts`
- `backend/src/modules/approvals/approval-engine-policy.test.ts`
- `backend/src/modules/approvals/approval-engine-maker-checker.integration.test.ts`
- `backend/src/modules/approvals/approval.service.ts`
- `frontend/src/modules/approvals/approval-engine-console.tsx`
- `frontend/src/app/approvals/engine/page.tsx`
- `frontend/src/modules/navigation/app-shell.tsx`
- `scripts/check-approval-engine.mjs`

## Static completion evidence

The implementation adds a dedicated `approval-engine:check` gate. The gate verifies the manifest, policy functions, service wiring, frontend console entry point, package script registration, locked routes, audit markers and architecture-safe implementation.

## Runtime completion evidence still required locally

This archive is source/static complete. Local runtime certification must still execute against a real installed workspace and database:

```bash
pnpm approval-engine:check
pnpm architecture:check
pnpm contracts:check
pnpm db:validate
RUN_INTEGRATION_TESTS=1 RUNTIME_CERTIFICATION=1 pnpm test
```

The local runtime suite must prove creator self-approval is blocked, ineligible approvers are denied, cross-tenant approval IDOR is denied, multi-step activation works, rejection comments are required, and final decisions update the owning subject inside the transaction.
