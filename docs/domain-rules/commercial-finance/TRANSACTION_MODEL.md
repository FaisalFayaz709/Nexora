# Commercial Finance Transaction Model

## Landed cost posting
One PostgreSQL transaction:
1. lock LandedCost;
2. require ALLOCATED;
3. verify allocation total equals header total;
4. for every allocation, call InventoryFacade to create InventoryCostLayer;
5. call FinanceFacade to create a balanced journal;
6. mark LandedCost POSTED with postedAt and idempotencyKey;
7. audit;
8. emit landed_cost.posted after state is consistent.

## Tax calculation
One PostgreSQL transaction:
1. resolve active TaxRule/TaxRate by taxCode/date/jurisdiction;
2. compute taxable amount and tax amount deterministically;
3. write TaxTransaction with rule/rate/formula evidence;
4. audit;
5. return preview.

## Bank reconciliation close
One PostgreSQL transaction:
1. lock reconciliation;
2. reject if already CLOSED;
3. persist matched journal/payment/voucher references;
4. set CLOSED with actor/timestamp;
5. audit.

No BullMQ is used for these critical financial or inventory effects.
