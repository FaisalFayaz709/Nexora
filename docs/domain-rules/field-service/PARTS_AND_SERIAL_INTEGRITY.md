# Technician Parts and Serial Integrity

Used ordinary parts create negative immutable TECHNICIAN_ISSUE stock ledger
entries through InventoryFacade. Batch-tracked products require allocations
whose total equals used quantity and BatchLot rows are locked/decremented in the
same transaction. ServiceReportPart links back to its StockTransaction.

Because no core technician-stock table/public API is source-defined, This implementation
uses explicit warehouse/location custody instead of inventing one. SERIAL
products cannot be anonymously consumed as parts; serialized equipment must use
the Asset registration/install/replace workflow so serial integrity cannot be
lost.
