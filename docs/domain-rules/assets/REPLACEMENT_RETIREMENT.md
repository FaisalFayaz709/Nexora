# Replacement and Retirement

Replacement:
- old Asset must be ACTIVE/UNDER_MAINTENANCE/REPAIRED;
- replacement Asset must already be ACTIVE;
- old/new must share customer, site and project;
- Asset.replacedByAssetId explicitly links the pair;
- old Asset becomes canonical REPLACED;
- AssetHistory + audit preserve reason and replacement ID.

Retirement:
- terminal replacement/retirement cannot re-enter retirement;
- if an active matching `AssetRetirement` ApprovalDefinition exists, the locked
  retire command creates a generic ApprovalRequest and does not invent a
  RETIREMENT_PENDING Asset status;
- final approval and Asset -> RETIRED + QR revocation + history + audit occur in
  one PostgreSQL transaction through AssetFacade;
- when no approval definition matches, retirement occurs immediately;
- rejection/return leaves canonical Asset status unchanged and records history.
