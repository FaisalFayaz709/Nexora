# Enterprise Controls & Platform Source Boundary

## Source-locked

Appendix F Enterprise Controls adds:
- Communication log;
- custom report builder;
- scheduled reports;
- saved views;
- feature/module configuration.

Locked API surface implemented/covered by this capability:
- GET /api/v1/communications
- POST /api/v1/communications/send
- GET /api/v1/communications/:id/delivery
- POST /api/v1/report-templates
- POST /api/v1/saved-reports
- POST /api/v1/scheduled-reports
- GET /api/v1/report-executions/:id
- GET /api/v1/features
- POST /api/v1/organization-features
- PATCH /api/v1/module-configurations/:id

Locked permissions:
- communication.view
- communication.send
- report_builder.manage
- feature.manage

FeatureFlag, OrganizationFeature, ModuleConfiguration and
SystemConfigurationHistory already existed from earlier Platform work. This implementation
keeps those models and includes them in the Enterprise Controls gate.

## Implementation-derived, not source-locked

The PDF does not print exact payload fields or status catalogs for the new
communication/reporting endpoints.

This implementation therefore:
- uses implementation-derived communication channels/statuses;
- treats external email/SMS delivery as after-commit event work and logs the
  send request synchronously;
- stores attachments as Document references without adding direct MinIO use;
- creates ReportExecution rows as pending export evidence for scheduled reports;
- stores selectedFields, filterJson and permissionScope as JSONB exactly to
  support customizable reporting without adding a dynamic SQL endpoint;
- requires saved reports/templates to retain the permission scope required by
  their data source;
- does not introduce unlisted report list/update/delete/run endpoints;
- does not introduce public CommunicationTemplate CRUD because Appendix F.4 only
  prints the communication send/history/delivery routes.

SaaS Billing endpoints are outside this capability boundary; they belong to the Advanced Operations/SaaS capability.
