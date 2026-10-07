# M16 Runtime E2E Scenarios — Reports, Dashboards, Search and Calendar

These scenarios must be implemented as executable API/database/UI tests before M16 can be runtime-certified.

1. `M16-RUNTIME-DASHBOARD-WIDGETS-PERMISSION-FILTERED`
   - Create widgets for finance and project dashboards.
   - Login as project-only user.
   - Verify finance widgets are hidden and API rejects direct access.

2. `M16-RUNTIME-SAVED-REPORT-CANNOT-WEAKEN-SOURCE-SCOPE`
   - Create FINANCE_AR template.
   - Attempt saved report with only report.view.
   - Expect rejection; finance.view must remain in permissionScope.

3. `M16-RUNTIME-REPORT-EXPORT-CREATES-AUDITED-EXECUTION`
   - Request CSV/XLSX/PDF export from an authorized saved report.
   - Verify ReportExecution, audit row and report.export event/queue evidence.

4. `M16-RUNTIME-SCHEDULED-REPORT-IDEMPOTENT-AND-RECIPIENT-SCOPED`
   - Create scheduled report with recipients.
   - Retry with same idempotency evidence.
   - Verify no duplicate delivery/execution is created.

5. `M16-RUNTIME-GLOBAL-SEARCH-DENIES-CROSS-TENANT-BRANCH-ENTRY`
   - Seed search entries in two tenants and branches.
   - Verify a branch-scoped user cannot read another tenant or branch entry.

6. `M16-RUNTIME-CALENDAR-DENIES-CROSS-BRANCH-ENTRY`
   - Seed project deadline/maintenance due/site visit calendar items.
   - Verify tenant, branch, date-range and permission filters are enforced.

7. `M16-RUNTIME-REPORT-BUILDER-FIELD-ALLOWLIST-ENFORCED`
   - Attempt selectedFields containing passwordHash/secret/internal margin fields.
   - Expect stable validation denial.

8. `M16-RUNTIME-SAVED-VIEW-CANNOT-BYPASS-RBAC`
   - Create saved view requiring finance.view.
   - Verify non-finance user cannot load it through UI or API.

9. `M16-RUNTIME-REPORT-DOWNLOAD-DOCUMENT-TENANT-SCOPED`
   - Complete report export and attach a Document.
   - Verify another tenant cannot fetch the download URL.

10. `M16-RUNTIME-REPORT-JOBS-READMODEL-ONLY-NO-CRITICAL-MUTATION`
    - Submit report.export payload containing stockTransaction, paymentPosting, journalEntry, approvalState or invoiceBalance.
    - Worker must reject it and no critical table should change.

11. `M16-RUNTIME-ACTIVITY-TIMELINE-DENIES-CROSS-TENANT-BRANCH-ENTRY`
    - Seed customer/project timeline records through audit, communication, project and procurement lifecycle actions.
    - Verify a user without the owning tenant, branch or source permission cannot view those timeline entries.
