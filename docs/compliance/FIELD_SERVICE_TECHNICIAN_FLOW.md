# capability gate — Field Service and Technician Flow

## Purpose

capability gate completes the field-service control layer that connects tickets, SLA, work orders, technician assignment, onsite visit evidence, service reports, spare-part consumption, customer confirmation and asset service history.

The implementation is deliberately implemented inside the locked architecture:

- TypeScript monorepo remains the workspace boundary.
- Fastify remains the backend API runtime.
- PostgreSQL plus Prisma remain the transactional persistence layer.
- Redis/BullMQ remain for post-commit jobs only.
- MinIO remains the private document/signature/photo store through the central StorageService.
- No microservice split, no Express/Nest replacement, no MongoDB, no direct frontend-to-database access.

## Blueprint requirements covered

The blueprint field-service flow requires a full work-order lifecycle from creation through assignment, dispatch, onsite work, resolution, customer confirmation and closure. This implementation preserves that lifecycle as explicit command endpoints instead of uncontrolled status patching:

```text
Ticket -> WorkOrder -> Assignment -> Technician Accepted -> Travelling -> On Site
-> Diagnosis -> Work In Progress -> Waiting For Part -> Resolved
-> Customer Confirmation -> Closed
```

## Files added or strengthened

- `shared/src/contracts/service/field-service-workflow-manifest.ts`
- `backend/src/modules/service/field-service-workflow-policy.ts`
- `backend/src/modules/service/field-service-workflow-policy.test.ts`
- `backend/src/modules/service/field-service-technician-flow.integration.test.ts`
- `frontend/src/modules/service/field-service-technician-dashboard.tsx`
- `frontend/src/app/service/field-operations/page.tsx`
- `scripts/check-field-service.mjs`

## Command endpoint coverage

capability gate explicitly tracks these route contracts:

- `POST /api/v1/tickets`
- `POST /api/v1/tickets/:id/assign`
- `POST /api/v1/tickets/:id/resolve`
- `POST /api/v1/tickets/:id/close`
- `POST /api/v1/work-orders`
- `POST /api/v1/work-orders/:id/assign`
- `POST /api/v1/work-orders/:id/accept`
- `POST /api/v1/work-orders/:id/start-travel`
- `POST /api/v1/work-orders/:id/arrive`
- `POST /api/v1/work-orders/:id/start`
- `POST /api/v1/work-orders/:id/check-in`
- `POST /api/v1/work-orders/:id/location`
- `POST /api/v1/work-orders/:id/check-out`
- `POST /api/v1/work-orders/:id/service-report`
- `POST /api/v1/work-orders/:id/complete`

## Locked transaction rules

The following state-changing operations must remain inside PostgreSQL transactions:

1. Ticket creation with SLA deadlines, audit and `ticket.created` event record.
2. Work-order assignment with technician profile availability, ticket first response, audit and `work_order.assigned` event record.
3. Visit check-in/check-out with location proof, route evidence and audit.
4. Work-order completion with service report finalization, spare-part stock consumption, stock ledger link, ticket resolution, work-order close, technician availability update, asset history and audit.

BullMQ is allowed only after commit for notification, service-report PDF, email and webhook delivery. It must not move stock, close tickets, mutate work-order status or write asset service history asynchronously.

## Tenant, branch and technician scope

- Tenant context comes from authenticated membership, not request body.
- Branch-scoped users can only act on records in their branch.
- Technician-only commands are restricted by assigned `WorkOrderAssignment` and employee-to-user mapping.
- Portal/technician access remains narrower than internal manager access.

## Visit proof and privacy

Technician GPS, photo proof and customer signature requirements are controlled by tenant policy. Location records carry retention metadata so sensitive technician location data can be purged without losing the immutable business audit trail.

## Runtime exit evidence still required

This implementation is source/static complete. Full completion still needs local runtime evidence:

```bash
pnpm install --frozen-lockfile
pnpm db:validate
pnpm db:migrate:deploy
pnpm field-service:check
RUN_INTEGRATION_TESTS=1 RUNTIME_CERTIFICATION=1 pnpm --filter @nexora/backend test -- field-service
pnpm docker:runtime:certify
```

## Non-negotiable compliance note

Do not mark field-service fully production-complete until the runtime tests prove:

- ticket-to-work-order lifecycle succeeds end-to-end;
- wrong technician is denied;
- GPS/photo/signature tenant policy is enforced;
- parts consumption and asset history roll back on failure;
- no BullMQ job performs critical stock/status/asset-history mutation.
