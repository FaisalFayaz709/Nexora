# Report Permission Model

Each ReportTemplate, SavedReport, ScheduledReport and ReportExecution preserves
permissionScope JSON.

Data source scope mapping:
- CUSTOMERS -> customer.view
- VENDORS -> vendor.view
- PROJECTS -> project.view
- PROCUREMENT -> procurement.view
- INVENTORY -> inventory.view
- ASSETS -> asset.view
- FIELD_SERVICE -> ticket.view
- MAINTENANCE -> maintenance.view
- FINANCE_AR / FINANCE_AP -> finance.view
- HR_EMPLOYEES -> employee.view
- AUDIT -> audit.view

This prevents sensitive Finance/HR/Audit report definitions from dropping the
scope needed to view their source data. Runtime authorization still remains
subject to the current user's permissions when executions are generated.
