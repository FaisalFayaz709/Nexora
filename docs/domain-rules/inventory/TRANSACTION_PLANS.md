# Transaction Plans

## Reserve stock

One PostgreSQL transaction:
1. create/lock StockBalance scope;
2. verify `onHand - reserved >= requested`;
3. increment reserved;
4. create StockReservation;
5. append audit;
6. append `stock.low` outbox event when applicable.

## Release reservation

One PostgreSQL transaction:
1. lock ACTIVE reservation;
2. verify tenant/branch warehouse scope;
3. lock StockBalance;
4. decrement reserved;
5. transition reservation to RELEASED;
6. append audit.

## Dispatch transfer

One PostgreSQL transaction:
1. lock DRAFT transfer;
2. validate tenant/branch resource scope;
3. lock each source balance;
4. verify unreserved availability;
5. decrement source onHand;
6. append negative STOCK_TRANSFER ledger;
7. recheck serial state and move serials to IN_TRANSIT;
8. attach batch/serial ledger evidence;
9. transition transfer to IN_TRANSIT;
10. append audit/outbox low-stock events.

## Receive transfer

One PostgreSQL transaction:
1. lock IN_TRANSIT transfer;
2. validate tenant/branch resource scope;
3. lock destination balance;
4. increment destination onHand;
5. append positive STOCK_TRANSFER ledger;
6. recheck/move serials to destination/AVAILABLE;
7. attach batch/serial ledger evidence;
8. set item received quantity;
9. transition transfer to RECEIVED;
10. append audit;
11. append `stock.transfer.received` outbox event.

## Post adjustment

One PostgreSQL transaction:
1. lock DRAFT adjustment;
2. refuse linked approval until Approval Engine verifies it;
3. lock affected balances;
4. reject negative stock or onHand below reserved;
5. update balance;
6. append ADJUSTMENT ledger;
7. create/remove serial records as applicable;
8. update batch remaining quantity as applicable;
9. transition adjustment to POSTED;
10. append audit/outbox low-stock events.
