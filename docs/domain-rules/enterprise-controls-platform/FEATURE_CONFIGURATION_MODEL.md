# Feature / Module Configuration Model

Earlier platform work already implemented the locked feature routes:
- GET /api/v1/features
- POST /api/v1/organization-features
- PATCH /api/v1/module-configurations/:id

This implementation keeps those routes as the Feature Flags & Module Configuration portion
of Enterprise Controls and verifies:
- OrganizationFeature controls per-tenant feature overrides;
- ModuleConfiguration controls module enablement/config JSON;
- SystemConfigurationHistory records before/after changes;
- SaaSPlanGuard remains in the access path;
- feature.manage protects write operations.

GET /features remains authenticated tenant scope because the endpoint is a read
of the current tenant's effective feature/module state; write routes require
feature.manage.
