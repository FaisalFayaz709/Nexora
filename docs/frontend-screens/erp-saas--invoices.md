# Screen Contract — /saas/invoices

Route path: `/saas/invoices`
Route group: `(erp)`
Source page file: `frontend/src/app/(erp)/saas/invoices/page.tsx`

## Route and owner
Owner module: `platform`. This page is rendered inside AppShell through the `(erp)` route group.

## Purpose
Manage SaaS tenant billing invoices, invoice detail state, draft edits and explicit invoice posting for platform owner/admin users.

## Permissions
Requires `saas.manage`. UI gates are advisory only; Fastify `/api/v1` remains authoritative for tenant, role and platform-owner enforcement.

## API mapping
Uses Fastify `/api/v1` endpoints: `/saas/invoices`, `/saas/invoices/:id`, `/saas/invoices/:id/post`. All calls go through the centralized frontend API client and module API helpers.

## Data table spec
List screens use TanStack Table with stable SaaS invoice columns such as invoice number, organization, subscription, amount, due date, posted date and status.

## Form spec
Create and edit screens use React Hook Form with Zod schemas from shared contracts. Posted invoices are not freely patchable and require command/reversal policy instead of silent mutation.

## Workflow commands and row actions
Allowed actions include create draft SaaS invoice, view detail, edit draft and post invoice through explicit command endpoint. Row actions are permission-gated and status-aware.

## State model
Must provide loading, empty, error, forbidden, not-found, validation-error and conflict states. Conflict state covers attempts to edit posted invoices.

## Responsive behavior
Desktop uses grid layout; tablet/mobile use condensed cards and sticky action areas suitable for platform admin workflows.

## Audit/traceability
Create, update and post actions create audit evidence. Tenant organization context remains server-side and all SaaS billing actions are traceable.

## Acceptance checks
- No Next.js duplicate business API.
- React Hook Form and Zod are used for forms.
- TanStack Table is used for list/grid behavior.
- Fastify `/api/v1` is the business API.
- Tenant scope and audit behavior are documented and enforced by backend services.
