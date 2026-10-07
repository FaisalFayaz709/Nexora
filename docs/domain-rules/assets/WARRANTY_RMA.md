# Warranty and RMA

Warranty:
- supports ACTIVE, EXPIRING, EXPIRED, VOID;
- validates start/expiry dates;
- keeps coverage records append-only by creating a new AssetWarranty rather than
  overwriting prior coverage;
- accepts optional warranty document reference for later Documents integration;
- derives effective ACTIVE/EXPIRING/EXPIRED status at read time so calendar
  passage does not silently show a stale status;
- emits canonical `asset.warranty.expiring` immediately when newly registered
  coverage is already within the 30-day alert window.

A periodic warranty-expiry scan remains an owning worker/scheduler integration
task; no background queue mutates Asset lifecycle state.

RMA:
- uses NumberSequence entity type RMA;
- creates AssetRMA in implementation-derived REQUESTED state;
- records RMA_REQUESTED in AssetHistory;
- validates vendor governance;
- no unlisted public RMA transition endpoint is invented.
