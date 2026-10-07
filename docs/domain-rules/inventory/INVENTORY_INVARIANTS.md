# Inventory Invariants

- `StockTransaction` UPDATE and DELETE are rejected by a PostgreSQL trigger.
- StockTransaction quantity is signed and never zero.
- StockBalance `onHand >= 0`.
- StockBalance `reserved >= 0`.
- StockBalance `reserved <= onHand`.
- One materialized balance exists per tenant + warehouse + location scope + product.
- Reservation quantity is positive.
- Transfer source and destination warehouses differ.
- Transfer item quantity is positive.
- Received quantity cannot exceed transfer quantity.
- Serial number is unique per organization.
- Batch/lot number is unique per organization + product.
- Batch remaining quantity cannot become negative.
- Adjustment line quantity cannot be zero.
- Tenant and branch scope is verified before inventory mutation.
- Product/warehouse/location references are server verified.
- Critical stock effects are synchronous PostgreSQL transactions, never BullMQ jobs.

- Warehouse-level (`locationId = null`) balance is the authoritative aggregate used by warehouse-level reservation/transfer commands.
- Location-specific receipt/consumption/adjustment updates both location sub-balance and warehouse aggregate atomically.
