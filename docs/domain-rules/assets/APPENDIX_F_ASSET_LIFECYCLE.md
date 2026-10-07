# Appendix F Asset Lifecycle Enhancements

The updated roadmap asks the asset lifecycle scope to add:
- asset cost history;
- warranty document expiry;
- QR access audit improvements.

This implementation addresses these without changing architecture:
- Asset.purchaseCost + supplierVendorId are auditable editable commercial fields;
- every cost/supplier change appends ASSET_COST_UPDATED AssetHistory with
  before/after values;
- AssetWarranty carries documentId and expiresAt for later Document ownership;
- QR resolve is authenticated, tenant-scoped, expiry/revocation aware and
  writes an access audit entry;
- raw QR tokens are not stored.

No new public route is introduced for these enhancements.
