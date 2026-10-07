# Source Boundary and Physical Implementation Choices

The source entity catalog gives key fields, purpose and relationships, and explicitly allows physical models to be introduced incrementally by capability. It does not define every physical nullability/default/index.

## Added operational fields

`createdAt` / `updatedAt` support production persistence and do not rename or replace source key fields.

## Nullable choices not explicitly fixed by source

The database foundation permits null for first-login/revocation/device/IP/address/manager/region/audit-before-after/published/response states where absence is meaningful.

## Added production constraints

Documented implementation choices include unique User email, unique Permission key, unique Organization code, tenant-local Branch code, Role name, OrganizationSetting key, one membership per User+Organization, and idempotency uniqueness by organization+route+key.

## Deferred relationship

`Department.managerEmployeeId` is present, but the physical foreign key is deferred until Employee is introduced. Team M:N Employee is also deferred. This avoids inventing a dangling relation while preserving the source field/relationship intent.

## RLS

The source mandates server-side tenant context and cross-tenant security tests; it does not mandate PostgreSQL RLS. The database foundation therefore does not silently add RLS as an architectural requirement.

## Commercial-completeness modules

Number Sequence, feature/module configuration and SaaS entities remain locked in the cumulative requirements. Their physical implementation is not removed; it remains scheduled for the the owning domain implementations.
