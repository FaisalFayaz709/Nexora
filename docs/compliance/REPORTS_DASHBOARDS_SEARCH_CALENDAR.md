# capability gate — Reports, Dashboards, Global Search, Calendar and Timeline

capability gate completes the reporting and operational read-model layer required by the NEXORA blueprint.

## Locked blueprint alignment

reports/search/calendar preserves the locked stack and architecture: Next.js, Fastify + TypeScript, PostgreSQL/Prisma, MinIO, Redis/BullMQ, Docker/Nginx/GitHub Actions, and the domain-first modular monolith.

## Scope

reports/search/calendar/timeline covers:

- CEO, Finance, Project, Procurement, Warehouse and Maintenance dashboard controls.
- Permission-filtered dashboard widgets.
- Saved reports, scheduled reports and user saved views.
- CSV, XLSX and PDF report export through BullMQ `report.export`.
- Global search read model across employees, customers, vendors, projects, assets, invoices, purchase orders, tickets, work orders and documents.
- Unified calendar read model for project deadlines, maintenance due dates, employee leave, site visits, work orders, contract expiries, meetings and payment deadlines.
- Customer and project activity timelines that aggregate audit, communication, project-delivery and procurement lifecycle events.

## Controls

- `reports/search/calendar-ROLE-DASHBOARDS-PERMISSION-FILTERED`
- `reports/search/calendar-REPORT-EXPORT-PDF-XLSX-CSV-VIA-BULLMQ`
- `reports/search/calendar-GLOBAL-SEARCH-PERMISSION-TENANT-SCOPED`
- `reports/search/calendar-CALENDAR-BRANCH-PERMISSION-FILTERED`
- `reports/search/calendar-ACTIVITY-TIMELINE-TENANT-PERMISSION-SCOPE`
- `reports/search/calendar-SAVED-REPORTS-STORE-PERMISSION-SCOPE`
- `reports/search/calendar-SCHEDULED-REPORTS-AUDITABLE-AND-IDEMPOTENT`
- `reports/search/calendar-DASHBOARD-WIDGETS-CANNOT-BYPASS-RBAC`
- `reports/search/calendar-SENSITIVE-FIELDS-REQUIRE-SOURCE-PERMISSIONS`
- `reports/search/calendar-SEARCH-CALENDAR-INDEXES-ARE-DERIVED-READ-MODELS`
- `reports/search/calendar-NO-ASYNC-CRITICAL-STOCK-MONEY-APPROVAL-MUTATION`

## Transaction and async rule

Report exports and scheduled report delivery may use BullMQ after a report execution record is committed. Search and calendar indexes are derived read models; customer/project timelines are permission-guarded read views over already committed business events, audit rows and domain records. None of these jobs may mutate stock balances, payment allocations, journal entries, approval state or accounting postings.

## Runtime proof still required

This implementation is source/static complete. Local runtime certification must still prove tenant and permission filtering, branch-scoped calendar visibility, report export job creation, document output authorization and scheduled report idempotency.
