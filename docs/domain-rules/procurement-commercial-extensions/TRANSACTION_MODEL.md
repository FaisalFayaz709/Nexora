# Transaction Model

## Vendor risk approval
One transaction:
1. lock VendorOnboardingRequest;
2. enforce SUBMITTED state;
3. enforce maker-checker;
4. write VendorRiskAssessment;
5. update onboarding request with verification/risk evidence;
6. update Vendor to APPROVED or BLACKLISTED;
7. audit the decision.

VendorGovernanceFacade then blocks:
- non-approved vendors;
- blacklisted vendors;
- HIGH-risk vendors.

## Stock count variance posting
Existing stock-count transaction:
1. lock StockCount;
2. enforce SUBMITTED state;
3. enforce maker-checker;
4. create approval;
5. create StockAdjustment and lines;
6. call inventory balance mutation with bypassFreeze only for the owning count;
7. write immutable ADJUSTMENT stock ledger entries;
8. create StockCountPosting;
9. mark count POSTED;
10. audit.

Normal stock mutations are blocked while the affected scope is frozen.

## Purchase release order
One transaction inside NumberSequence allocation:
1. allocate release-order business number;
2. lock PurchaseContract;
3. enforce ACTIVE state and validity dates;
4. verify vendor remains approved and not risky/blacklisted;
5. lock/read contract items;
6. validate requested quantities and line totals;
7. reject if item or header quantity/value would be exceeded;
8. create PurchaseReleaseOrder and items;
9. increment released quantity/value counters;
10. audit;
11. emit purchase_release_order.created.

Concurrent releases serialize on the locked PurchaseContract row.
