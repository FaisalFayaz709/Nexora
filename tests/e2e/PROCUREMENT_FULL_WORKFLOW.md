# M9 Procurement Full Workflow Runtime Acceptance Plan

The following scenarios must be implemented as executable API/database tests before M9 can be called runtime certified.

## M9-PROC-01 — Purchase Request to RFQ state chain

Create a purchase request, submit it, approve it through maker-checker, create an RFQ, and verify the purchase request becomes CONVERTED_TO_RFQ. The same create-rfq command must reject DRAFT, UNDER_REVIEW, REJECTED and CANCELLED purchase requests.

## M9-PROC-02 — Vendor governance and quotation coverage

Invite only approved vendors to an RFQ. Reject unapproved or blacklisted vendors. Submit supplier quotations only from invited vendors, and verify the quotation line product/quantity set exactly matches the source purchase request items.

## M9-PROC-03 — Quotation comparison and single supplier selection

Submit at least three supplier quotations. Verify deterministic rank, lowest-cost, fastest-delivery and strongest-warranty flags. Select one quotation and verify other eligible quotations become REJECTED and the RFQ becomes AWARDED. Race two selection commands and verify only one SELECTED row exists.

## M9-PROC-04 — Purchase Order source chain and maker-checker

Create a purchase order only from the selected supplier quotation. Verify the source chain is supplier quotation → RFQ → purchase request and is in the active branch. Submit the PO for approval, reject self-approval, approve with a second actor, and send the PO.

## M9-PROC-05 — Goods Receipt atomicity and finance source

Receive goods using Idempotency-Key. Verify GRN header/items, PO item received quantities, stock ledger, serial/batch state, audit log and business event are all committed together. Replay the same key with the same body and get the same response; replay with a changed body and receive IDEMPOTENCY_KEY_REUSED. Verify the finance procurement source points to the same tenant-scoped PO plus GRN.

