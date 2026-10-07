# Source Boundary

## Source-locked

Asset entity catalog:
- Asset
- AssetInstallation
- AssetHistory
- AssetWarranty
- AssetQrTag
- AssetRMA

Canonical Asset statuses:
PROCURED, IN_WAREHOUSE, ALLOCATED, ISSUED, INSTALLED, ACTIVE,
UNDER_MAINTENANCE, REPAIRED, REPLACED, RETIRED.

Warranty statuses:
ACTIVE, EXPIRING, EXPIRED, VOID.

Locked Asset API:
12 Assets routes plus the existing locked
`GET /api/v1/customer-sites/:id/assets` relationship route.

Source-critical rules:
- register-from-stock requires an eligible serial;
- installation is atomic stock + serial + asset + installation history + audit;
- replacement links old/new assets;
- retirement may require approval;
- QR rotation revokes prior token;
- QR token alone never bypasses authorization;
- expired/rotated QR tokens are denied;
- installed serialized unit cannot remain available stock;
- asset.installed and asset.warranty.expiring are canonical events.

The source install example is preserved:
siteId, areaId, projectId, technicianId, installedAt and locationText,
returning ACTIVE plus a QR token.

## Implementation-derived, explicitly not source-locked

The PDF does not print:
- exact payloads for create/update/register-from-stock/replace/retire/RMA/QR rotate;
- canonical RMA statuses;
- QR expiry duration;
- a warranty CRUD endpoint;
- an explicit pending-retirement Asset status;
- replacement relation columns;
- purchaseCost/supplierVendorId in the formal Asset key-field row even though
  the functional Asset record lists Purchase Cost and Supplier;
- an Asset cost-history entity.

This implementation therefore:
- uses AssetHistory.detailsJson for cost/supplier history rather than inventing
  a new public subsystem;
- adds purchaseCost and supplierVendorId supporting Asset fields;
- adds warranty documentId supporting Appendix-F warranty-document traceability;
- stores a SHA-256 hash in AssetQrTag.token and returns only opaque raw tokens;
- adds expiresAt to AssetQrTag; default generated TTL is 365 days and QR rotate
  may request 1..3650 days;
- uses generic Approval subject type `AssetRetirement`; because no
  RETIREMENT_PENDING canonical status exists, the Asset stays in its current
  state while approval is pending;
- derives RMA states from the functional RMA flow, while only REQUESTED is
  currently reachable through the locked create-RMA public endpoint;
- direct POST /assets is for non-serial stock/manual registration and starts at
  PROCURED; serial-tracked stock must use register-from-stock and starts at
  IN_WAREHOUSE.

These are implementation contracts and are never represented as verbatim
source-defined fields/statuses.
