# Screen Contract — /procurement/goods-receipts/create

## Route and owner
- Route path: `/procurement/goods-receipts/create`
- Route group: `(erp)`
- Source page file: `frontend/src/app/(erp)/procurement/goods-receipts/create/page.tsx`
- Owning module: `module`
- Shell: `AppShell`

## Purpose
This screen is a NEXORA ERP route-level implementation contract. It must answer a clear business question, expose only the primary allowed action for the role, and preserve the locked lifecycle design.

## Permissions
The screen must use shared permission constants for UI gating, but the Fastify `/api/v1` backend remains authoritative for permission, tenant, branch, linked portal record and assignment scope.

## API mapping
All business data must be retrieved through the centralized frontend API/query layer calling Fastify `/api/v1`. Next.js route handlers must not own ERP domain logic, Prisma access, MinIO credentials, Redis queue work, approval logic, stock logic or finance logic.

## Data table spec
List/read-model surfaces use TanStack Table through the reusable DataTable wrapper, stable column ids, bounded server pagination, allowlisted filters/sorts, permission-aware row actions and loading/empty/error states.

## Form spec
Create, edit and command mutations use React Hook Form with Zod validation. Backend validation errors map to field errors or a validation summary. Status changes use command endpoints and idempotency where required.

## Workflow commands and row actions
Buttons, dialogs, row actions and command panels must be permission-gated, status-aware and backed by explicit Fastify command endpoints. Critical actions must state irreversible effects and audit behavior.

## State model
The implementation must handle loading, empty, forbidden, not-found, validation error, conflict, stale-data and offline state where applicable, without leaking cross-tenant data.

## Responsive behavior
Desktop uses table/workbench layouts; tablet and mobile use condensed cards, action menus, sticky command areas and portal/PWA-appropriate shells.

## Audit/traceability
Sensitive operations must expose activity, status history, audit event entry points and document links where required. Tenant isolation and RBAC cannot be bypassed by frontend state.

## Acceptance checks
- Uses the correct route-group shell.
- Uses centralized API/query functions only.
- Uses TanStack Table for list grids.
- Uses React Hook Form and Zod for forms/commands.
- Preserves tenant, branch, portal-linked-record and audit requirements.
