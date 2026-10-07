# Screen Contract — /operations/readiness

## Route and owner
- Route path: `/operations/readiness`
- Route group: `(erp)`
- Source page file: `frontend/src/app/(erp)/operations/readiness/page.tsx`
- Owning module: `platform`
- Shell: `AppShell`

## Purpose
This screen is the PASS 24 operations readiness workbench. It exposes performance SLO, backup/restore, observability, alerting, queue backpressure, incident response, disaster recovery, rollback and tenant export evidence requirements without executing runtime operations from the browser.

## Permissions
The screen must use shared permission constants for UI gating, but the Fastify `/api/v1` backend remains authoritative for permission, tenant, branch, linked portal record and assignment scope. The minimum navigation permission is `audit.view`.

## API mapping
All business data must be retrieved through the centralized frontend API/query layer calling Fastify `/api/v1`. This read-only surface may reference `/api/v1/health/live`, `/api/v1/health/ready` and `/api/v1/audit-logs` as evidence entry points. Next.js route handlers must not own ERP domain logic, Prisma access, MinIO credentials, Redis queue work, approval logic, stock logic or finance logic.

## Data table spec
List/read-model surfaces use TanStack Table through the reusable DataTable wrapper, stable column ids, bounded server pagination, allowlisted filters/sorts, permission-aware row actions and loading/empty/error states. PASS 24 rows come from `Pass24OperationsReadinessManifest`.

## Form spec
Create, edit and command mutations use React Hook Form with Zod validation. PASS 24 is read-only, so no browser form may execute backup, restore, rollback, queue or incident commands. Backend validation errors must still map to field errors or a validation summary wherever future command forms are introduced.

## Workflow commands and row actions
Buttons, dialogs, row actions and command panels must be permission-gated, status-aware and backed by explicit Fastify command endpoints. This route exposes no mutation commands. Critical operations must be executed through backend/runtime certification scripts with idempotency and audit behavior.

## State model
The implementation must handle loading, empty, forbidden, not-found, validation error, conflict, stale-data and offline state where applicable, without leaking cross-tenant data.

## Responsive behavior
Desktop uses table/workbench layouts; tablet and mobile use condensed cards, action menus, sticky command areas and portal/PWA-appropriate shells.

## Audit/traceability
Sensitive operations must expose activity, status history, audit event entry points and document links where required. Tenant isolation and RBAC cannot be bypassed by frontend state. PASS 24 final GO requires runtime evidence under `certification-output/pass-24-operations-observability-backup-dr/`.

## Acceptance checks
- Uses the correct route-group shell.
- Uses centralized API/query functions only.
- Uses TanStack Table for list grids.
- Uses React Hook Form and Zod for forms/commands.
- Preserves tenant, branch, portal-linked-record and audit requirements.
- Does not run backup, restore, rollback, stock, money or approval mutations from the frontend.
