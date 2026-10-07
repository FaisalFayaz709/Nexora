# Appendix G Frontend Completion Lock

## Status

**ACTIVE AFTER R0.** Appendix G from the latest 90-page NEXORA blueprint is mandatory implementation scope.

Earlier static frontend-workflow evidence is not enough to claim frontend completion. The project must satisfy the full Appendix G delivery contract before any final frontend, E2E or production gate can pass.

## Locked frontend implementation decisions

| Concern | Locked decision | Compliance rule |
|---|---|---|
| Primitive UI components | shadcn/ui | Generated primitives live under `frontend/src/components/ui`; customize through Tailwind tokens and NEXORA wrappers, not page-level one-offs. |
| Forms | React Hook Form | All create, edit and workflow command forms use `useForm`, `FormProvider` where needed and typed submit handlers. |
| Validation | Zod shared contracts | Browser-safe shared Zod contracts are used with `@hookform/resolvers/zod`; backend remains authoritative for permissions, tenant, branch, ownership, state and transaction rules. |
| Tables/grids | TanStack Table | ERP list screens use TanStack Table for columns, row model, sorting state, pagination state, selection and row actions. |
| Server state | TanStack Query | Frontend API reads and mutations use centralized query/mutation hooks with invalidation and error mapping. |
| Styling | Tailwind CSS | Modules reuse design tokens and component variants; no independent visual systems per module. |
| Business API | Fastify `/api/v1` | ERP business data is fetched from the Fastify backend; Next.js route handlers cannot own business logic. |

## Required route-group shell model

```txt
frontend/src/app/
├── layout.tsx                 # Providers only
├── (auth)/layout.tsx          # AuthLayout only
├── (erp)/layout.tsx           # AppShell + AuthGuard + TenantGuard + PermissionContext
├── (portal)/layout.tsx        # PortalShell + PortalGuard
└── (technician)/layout.tsx    # TechnicianPwaShell + TechnicianGuard + OfflineProvider
```

Rules:

- Authenticated internal ERP pages must live under `(erp)` and receive `AppShell` automatically.
- Customer/vendor pages must live under `(portal)` and must not show internal ERP navigation.
- Technician PWA pages must live under `(technician)` and expose offline queue/sync status.
- No authenticated `page.tsx` should import `AppShell` directly after route groups are implemented.

## Required component ownership model

```txt
frontend/src/components/
├── ui/          # shadcn/ui primitives
├── app/         # AppShell, guards, breadcrumbs, PageHeader, navigation
├── data/        # DataTable, toolbar, pagination, filters, row actions
├── forms/       # RHF wrappers and domain-neutral field components
├── feedback/    # LoadingState, EmptyState, ErrorState, ForbiddenState, NotFoundState
└── workflow/    # StatusBadge, ApprovalTimeline, AuditTimeline, PermissionGate, command panels
```

## Required module ownership model

```txt
frontend/src/modules/<domain>/
├── api.ts        # endpoint constants, typed request/response functions, query-key factories
├── columns.tsx   # typed TanStack Table column definitions
├── schemas.ts    # UI-local schema composition only where needed
├── components/   # module-specific UI
├── forms/        # create/edit/command forms
└── pages/        # route-level containers when needed
```

## Required screen contract

Every frontend route must have an implementation contract before it is called complete. The contract must include:

- route path, owning module, page file, route group and shell;
- business purpose and primary action;
- required view permission and action-level permissions;
- GET/POST/PATCH/PUT/DELETE/command endpoints, query keys and invalidation rules;
- table columns, filters, sorts, pagination, row actions and bulk actions;
- form fields, defaults, schemas, server error mapping and idempotency needs;
- loading, empty, error, forbidden, not-found, validation, conflict, stale and offline states;
- responsive behavior;
- activity timeline, audit timeline and document links when sensitive.

## Backend route required by Appendix G

The backend must expose:

```http
POST /api/v1/portal/technician/offline-sync
```

Minimum behavior:

- authenticated technician portal scope;
- assigned-technician-only authorization;
- tenant and branch enforcement;
- idempotency through `Idempotency-Key` or `clientBatchId`/`clientCommandId`;
- replay, stale-command and conflict handling;
- one PostgreSQL transaction for critical work-order status, checklist, service-report, parts-consumption, asset/service-history and audit updates;
- document IDs or pending evidence references for photos/signatures, not raw large blobs when avoidable;
- BullMQ only for after-commit PDFs, notifications, analytics and webhooks, not critical state truth.

## Completion rule

A frontend page is not complete because it renders static data. A module is frontend-complete only when list, create, detail, edit and all approved command workflows exist for its aggregate roots, using the locked component, form, table, API/query, state, shell, permission and responsive standards above.

## R2 foundation status

Pass R2 adds the source foundation required before module-level frontend completion can start: shadcn/ui-compatible primitives, React Hook Form wrappers, TanStack Table grid wrapper, shared feedback states, workflow components and centralized QueryClient setup. R2 does not mark Appendix G complete. Route groups, complete CRUD screens, screen contracts, module API files, offline sync backend implementation and E2E evidence remain open for R3-R18.
