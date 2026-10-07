# GRN Atomic Transaction Boundary

`POST /api/v1/goods-receipts` requires `Idempotency-Key`.

The command executes under the NumberSequence PostgreSQL transaction and includes:
1. idempotency claim;
2. NumberSequence row allocation/reservation;
3. purchase-order row lock;
4. each purchase-order item row lock;
5. configured receipt-tolerance check;
6. GoodsReceipt + GoodsReceiptItem creation;
7. PurchaseOrderItem received quantity updates;
8. accepted StockBalance update;
9. immutable PURCHASE_RECEIPT StockTransaction;
10. accepted serial-number creation and traceability;
11. batch/lot capture;
12. inventory cost layer using PO unit cost;
13. PurchaseOrder PARTIALLY_RECEIVED/RECEIVED transition;
14. business audit;
15. `goods_receipt.received` outbox event;
16. idempotency response persistence.

A failure in any critical step rolls back the transaction. Emails/documents remain outside the stock transaction and may be asynchronous in later enterprise-control work.
