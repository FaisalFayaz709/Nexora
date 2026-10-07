# Reports, Search, Import, SaaS & Integrations Source Boundary

## Source-locked
- Global search and calendar are authenticated, permission-filtered platform endpoints.
- Audit search/detail use `audit.view` and remain tenant-scoped.
- Core report endpoints list/detail reports and request/check report export jobs.
- Data Import supports upload, validate, commit and rollback; commit is transactional by batch or controlled chunk.
- SaaS Billing supports plans, subscription creation, usage metrics and invoice posting for platform-owner scope.
- Data import, report export, SaaS usage and external webhook foundations are platform/integration features and must not replace domain-owned CRUD.

## Implementation-derived
- `/reports/exports` uses existing `ReportExecution` as the export job identity.
- Data import upload records metadata and checksum; physical object upload remains through document/storage foundations.
- Import validation records row snapshots and validation summary; real parser execution is runtime-pending.
- SaaS plan/subscription seed data is expected from deployment/seed pipeline; no public plan write route is invented.
- Integration models support outbound webhook delivery without inventing unlisted public integration endpoints.
