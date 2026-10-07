# Screen Contract — /workflow-rules

## Route and owner

Route path: `/workflow-rules`  
Route group: `(erp)`  
Source page file: `frontend/src/app/(erp)/workflow-rules/page.tsx`  
Owning module: `approvals`  
Shell: `AppShell` through the Next.js route-group layout.

## Purpose

Workflow/fraud rule administration with approval, maker-checker and deterministic rule evaluation controls.

The screen must preserve the locked Fastify `/api/v1` business API boundary and must not move ERP domain logic into Next.js route handlers.

## Permissions

Required view/action permission: `workflow.manage`. UI action buttons are permission-aware, status-aware where a workflow state exists, and backend authorization remains authoritative. Tenant scope is enforced by the API through authenticated organization membership and branch/resource checks.

## API mapping

Backend API mapping: GET /workflow-rules, POST /workflow-rules, PATCH /workflow-rules/:id, POST /workflow-rules/:id/activate, POST /workflow-rules/:id/deactivate, POST /workflow-rules/evaluate. All calls go through the centralized frontend API client/module API helpers, use TanStack Query query keys, and invalidate affected lists/detail/timeline data after mutations. Business API calls target Fastify `/api/v1` only.

## Data table spec

List/read-model areas render through the NEXORA DataTable/TanStack Table layer with stable columns, bounded pagination, loading state, empty state, error state and permission-filtered row actions. Small read-only summaries may use cards, but ERP grids must not use ad-hoc raw table markup.

## Form spec

Create/edit/command forms use React Hook Form with Zod validation and typed submit handlers. Server validation errors map to field errors or a record-level validation summary. Idempotency keys are used where backend command contracts require retry protection.

## Workflow commands and row actions

Allowed workflow commands are explicit actions against Fastify command endpoints, not free status PATCH changes. High-risk commands require confirmation copy, disabled pending state, backend permission checks and audit behavior.

## State model

The screen must handle loading, empty, error, forbidden, not-found, stale data, validation error and conflict states consistently. Backend rejection codes are displayed without exposing secrets or internal persistence details.

## Responsive behavior

Desktop uses table/card split layouts; tablet uses condensed cards; mobile uses stacked forms and action areas. The route remains usable inside the AppShell without duplicating shell/sidebar logic locally.

## Audit/traceability

Sensitive actions must create backend audit records and link to activity/document/event evidence where applicable. The frontend displays or links to audit/traceability panels when the backend exposes them, while tenant isolation and RBAC remain enforced server-side.

## Acceptance checks

- Fastify `/api/v1` remains the only ERP business API.
- React Hook Form is used for create/edit/command form state.
- Zod is used for browser-safe structural validation.
- TanStack Table/DataTable is used for grids and list views.
- Tenant scope, permission checks and audit expectations are documented and enforced by backend tests.
