# Source Boundary

Implemented locked public APIs:
- CRM sales lifecycle: Leads, Opportunities, Site Surveys, Quotations and Contracts.
- Customer portal supporting reads: customer timeline and site assets.
- Document management: document list/detail/create/delete, upload intent, complete upload, download URL and versioning.
- Notification center: list, read and read-all.

Portal/PWA support is modelled without inventing public routes. The source catalog already contains asset QR and technician visit routes; This implementation adds PortalAccount, PortalAccessGrant, PortalActivityLog, OfflinePwaSyncPolicy, OfflinePwaSyncBatch and OfflinePwaSyncItem so those surfaces can be governed safely.

Advanced operations baseline adds physical models for fleet, tools, safety, quality and localization but intentionally does not expose unlisted APIs.

Excluded to later passes:
- SaaS billing and tenant usage metrics.
- full reports/search/import/integration execution.
- public custom-field/custom-workflow APIs.
