# Source Boundary / Derived Choices

## Source-derived

- Inventory is transaction-based rather than product CRUD.
- Stock movement types are:
  PURCHASE_RECEIPT, STOCK_TRANSFER, PROJECT_ISSUE, PROJECT_RETURN,
  TECHNICIAN_ISSUE, TECHNICIAN_RETURN, SALES_ISSUE, DAMAGED,
  ADJUSTMENT, CUSTOMER_INSTALLATION.
- Every stock movement creates an immutable ledger entry.
- StockBalance contains organization, warehouse, location, product, onHand and reserved.
- StockReservation contains organization, product, warehouse, project, quantity and status.
- StockTransfer contains source/destination warehouse, transfer number and status.
- StockTransferItem contains product, quantity and received quantity.
- SerialNumber contains product, serial, status, current warehouse and optional asset.
- BatchLot contains product, lot, manufacture/expiry dates and remaining quantity.
- StockAdjustment is controlled and may link an ApprovalRequest.
- Stock transfer dispatch is an atomic source stock movement.
- Stock transfer receive is an atomic destination movement.
- Inventory races require transactions/constraints/locking.
- Stock balances cannot use eventual consistency.
- `stock.transfer.received` and `stock.low` are canonical domain events.

## Implementation-derived and explicitly documented

The source does not print canonical status models for StockTransfer, StockReservation, StockAdjustment or SerialNumber. This implementation therefore uses internal states without claiming they are Appendix-A canonical:

- StockTransfer: DRAFT -> IN_TRANSIT -> RECEIVED
- StockReservation: ACTIVE -> RELEASED / future CONSUMED
- StockAdjustment: DRAFT -> POSTED
- SerialNumber inventory states: AVAILABLE -> IN_TRANSIT -> AVAILABLE; REMOVED for negative adjustment

`locationScopeKey` is a supporting field used to guarantee a unique warehouse-level balance when `locationId` is null.

The source catalog says StockAdjustment has 1:N adjustment lines but does not name the line entity. `StockAdjustmentLine` is therefore a supporting physical entity.

Serial/batch bridge tables are supporting physical entities required to preserve relational traceability for transfers and ledger entries.

The locked create-transfer example does not print serial/batch allocations. This implementation extends each transfer item only with optional `serialNumbers` and `batches`; the printed example remains valid.

Stock transfers use the generic NumberSequence service with entity type `STOCK_TRANSFER`. The source requires NumberSequence for a minimum set of entities but does not prohibit other human-numbered entities from using the same controlled service.

## Warehouse aggregate and physical-location balances

This implementation keeps a `locationId = null` warehouse aggregate balance because the locked reserve and transfer APIs operate at warehouse level and do not require a location in their command payloads. When a later caller supplies a physical location, `InventoryFacade` and adjustment posting update both the warehouse aggregate and the location sub-balance inside the same transaction. This prevents warehouse-level reservations/transfers from losing visibility of stock held in a bin/location.
