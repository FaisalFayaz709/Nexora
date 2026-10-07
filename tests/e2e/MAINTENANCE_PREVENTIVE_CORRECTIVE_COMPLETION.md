# M14 Maintenance Preventive/Corrective Completion Runtime Scenarios

These scenarios replace narrative-only confidence with executable runtime proof after M1-M13 are certified locally.

1. `M14-PREVENTIVE-PLAN-CREATES-FIRST-SCHEDULE` — create an active asset maintenance plan and verify the first schedule row, audit row and due event are committed together.
2. `M14-DUE-SCAN-DISCOVER-ONLY-NO-CRITICAL-MUTATION` — run `maintenance.scan` and prove it does not update work-order, stock, execution, schedule or asset-history state directly.
3. `M14-SCHEDULE-GENERATES-EXACTLY-ONE-WORK-ORDER-CONCURRENTLY` — submit two identical generation attempts for one schedule and verify one work order, one execution and one idempotency result.
4. `M14-WORK-ORDER-CLOSE-UNLOCKS-MAINTENANCE-EXECUTION-COMPLETE` — verify execution completion is blocked until the generated field-service work order is closed.
5. `M14-PARTS-CONSUMPTION-STOCK-ASSET-HISTORY-ATOMICITY` — complete maintenance with parts and verify MaintenancePart, StockTransaction, AssetHistory, Schedule, Execution and Audit commit or rollback together.
6. `M14-NEXT-SCHEDULE-FREQUENCY-CALCULATION` — verify next due date matches DAYS/WEEKS/MONTHS/YEARS plan policy.
7. `M14-FAILED-OR-REPLACED-RESULT-EMITS-WARRANTY-RMA-REVIEW` — complete with FAILED and REPLACED results and verify warranty/RMA review event evidence.
8. `M14-CORRECTIVE-MAINTENANCE-LINKS-TICKET-WORK-ORDER-ASSET` — corrective maintenance must prove ticket, work order and installed asset linkage.
9. `M14-CROSS-TENANT-BRANCH-ACCESS-DENIED` — schedule, execution and cost read model identifiers from another tenant or branch must be denied.
10. `M14-MAINTENANCE-COST-BY-ASSET-READ-MODEL-RBAC-SCOPED` — cost by asset must be derived from source rows and filtered by tenant/RBAC/branch.
