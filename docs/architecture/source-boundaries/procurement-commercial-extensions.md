# Procurement & Inventory Commercial Extensions Source Boundary

## Source-locked

Appendix F requires these commercial completion areas:

1. Vendor Onboarding & Vendor Risk
   - vendor registration requests;
   - document verification;
   - bank-detail verification;
   - category approvals;
   - risk rating;
   - blacklist control;
   - blocking unapproved/risky vendors from RFQ/PO/payment workflows.

2. Physical Stock Count / Cycle Count
   - plan warehouse counts;
   - generate count sheets;
   - freeze affected stock;
   - record counted quantity;
   - compare system vs physical stock;
   - require approval for variances;
   - post stock adjustment entries;
   - preserve count audit history.

3. Purchase Contracts / Blanket Purchase Orders
   - long-term supplier agreements;
   - validity period;
   - approved items;
   - agreed rates;
   - maximum quantity/value;
   - release orders;
   - release order validates remaining contract quantity/value.

Locked API additions:
- POST /api/v1/vendor-onboarding/requests
- POST /api/v1/vendor-onboarding/:id/submit
- POST /api/v1/vendor-onboarding/:id/approve
- POST /api/v1/stock-counts
- POST /api/v1/stock-counts/:id/start
- POST /api/v1/stock-counts/:id/submit
- POST /api/v1/stock-counts/:id/post
- POST /api/v1/purchase-contracts
- POST /api/v1/purchase-contracts/:id/approve
- POST /api/v1/purchase-contracts/:id/create-release-order

Permission additions:
- vendor.onboard
- vendor.risk.manage
- stock_count.manage
- stock_count.post
- purchase_contract.manage

## Implementation-derived, explicitly not source-locked

The PDF does not print full payload schemas, status catalogs for contracts or
release orders, or separate public APIs for risk assessment/blacklisting.

This implementation therefore:
- upgrades the existing VendorOnboarding approve command to carry the risk,
  document, bank and category evidence required by Appendix F;
- allows the approve command to record either APPROVE or BLACKLIST because no
  separate blacklist public route is printed;
- adds VendorRiskAssessment as an internal support model so risk decisions are
  auditable without inventing a public route;
- blocks HIGH-risk or BLACKLISTED vendors in VendorGovernanceFacade so
  procurement, finance, assets and commercial contracts inherit the control;
- treats StockCount IN_PROGRESS/SUBMITTED as the stock-freeze window and blocks
  normal stock mutations through InventoryRepository.assertStockNotFrozen;
- uses PurchaseContract/PurchaseContractItem/PurchaseReleaseOrder/
  PurchaseReleaseOrderItem for blanket PO/release-order control;
- does not invent list/update/cancel purchase-contract endpoints because
  Appendix F.4 lists only create, approve and create-release-order commands.
