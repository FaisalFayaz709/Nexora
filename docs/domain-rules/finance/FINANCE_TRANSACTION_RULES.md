# Finance Transaction Rules

Customer invoice post:
1. lock CustomerInvoice;
2. require APPROVED;
3. calculate/use immutable stored totals;
4. create balanced JournalEntry and JournalLines using NumberSequence inside the
   same transaction;
5. update invoice to POSTED with journalEntryId;
6. write audit.

Payment post:
1. require Idempotency-Key;
2. lock each allocated invoice;
3. reject over-allocation;
4. update invoice balance and status;
5. create Payment and PaymentAllocation records;
6. create balanced cash/AR or AP/cash JournalEntry;
7. link journalEntryId;
8. store idempotency response;
9. write audit;
10. commit atomically.

Supplier invoice:
- create is DRAFT;
- match command performs the required three-way-match control through
  ProcurementFacade;
- approve requires MATCHED status and optionally enters Approval Engine;
- later payment allocation pays down supplier invoice balance.

Manual journal:
- must be balanced;
- POSTED journals are immutable by database trigger;
- reversals must be represented as new/reversal entries rather than UPDATE/DELETE.
