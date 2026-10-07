import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'Procurement PostgreSQL/API acceptance',
  requirements: [
    {
      name: 'concurrent GRNs cannot over-receive a PO line beyond tolerance',
      evidence: 'race goods receipt submissions for the same PurchaseOrderItem and verify receivedQty never exceeds orderedQty plus tolerance',
    },
    {
      name: 'same GRN idempotency key produces one inventory effect',
      evidence: 'retry receive-goods with the same Idempotency-Key and verify one GoodsReceipt and one set of StockTransaction rows',
    },
    {
      name: 'purchase request and purchase order creators cannot self-approve',
      evidence: 'create PR/PO as one actor and verify approval by the same actor is rejected when maker-checker applies',
    },
    {
      name: 'unapproved or blacklisted vendor cannot enter RFQ or PO workflow',
      evidence: 'mark a vendor unapproved/blacklisted and verify RFQ invitation, quotation selection and PO creation are blocked',
    },
    {
      name: 'GRN failure rolls back quantities stock serial cost audit and number reservation',
      evidence: 'force GRN transaction failure and verify no partial PO quantity, stock, serial, cost-layer, audit or number sequence side effect remains',
    },
  ],
});
