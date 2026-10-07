# Screen Contract — /saved-views/[id]

## Route and owner
Route path: `/saved-views/[id]`  
Route group: `(erp)`  
Source page file: `frontend/src/app/(erp)/saved-views/[id]/page.tsx`  
Owning module: `reports`

## Purpose
Provide a Pass 19 management-visibility surface for reports, dashboards, saved views, global search, calendar or related read-model operations while preserving NEXORA lifecycle traceability.

## Permissions
Required permissions: report.view for read pages and report_builder.manage for create/edit command surfaces. Backend remains authoritative for tenant scope, branch scope, source-module permission checks and audit rules.

## API mapping
Fastify `/api/v1` endpoints used by this screen include the resource list/detail/command route matching the page path. No Next.js business API or raw Prisma access is allowed.

## Data table spec
List screens use TanStack Table through the shared DataTable/EntityList layer with bounded page/pageSize pagination, allowlisted filters, stable column ids, row actions and permission-aware create buttons.

## Form spec
Create/edit screens use React Hook Form with shared Zod validation through ResourceFormPage/ResourceFormDialog. Saved reports, saved views and dashboard widgets must preserve permissionScope and cannot weaken source data permissions.

## Workflow commands and row actions
Allowed actions include create, detail, edit, request export, schedule report and refresh read-model views where applicable. Status changes and exports use explicit Fastify `/api/v1` command endpoints and idempotency keys where needed.

## State model
The page must render loading, empty, error, forbidden, not-found, validation, conflict and stale-data states consistently. Search and calendar defaults prevent invalid empty requests while still allowing user filtering.

## Responsive behavior
Desktop uses full data grids; tablet/mobile use the same shared grid shell with condensed actions and readable cards/dialogs. Forms keep sticky action areas and accessible labels.

## Audit/traceability
Report-template, saved-report, scheduled-report, saved-view, dashboard-widget and export commands create audit evidence. Search and calendar are derived read models only and never mutate stock, money, approval or journal state.

## Acceptance checks
- Uses Fastify `/api/v1` only for business data.
- Uses React Hook Form for forms.
- Uses Zod contracts for validation.
- Uses TanStack Table for grid/list behavior.
- Mentions tenant isolation, permission checks and audit trail.
- Does not bypass RBAC, branch scope, source permissions or backend validation.
