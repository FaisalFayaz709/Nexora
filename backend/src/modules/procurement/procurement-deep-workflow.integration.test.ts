import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'Procurement deep workflow runtime acceptance',
  requirements: [
    {
      name: 'approved purchase request is the only source allowed for RFQ creation',
      evidence: 'create DRAFT and APPROVED PRs through API, verify create-rfq rejects the DRAFT PR and converts only the APPROVED PR to CONVERTED_TO_RFQ',
      scenarioId: 'C4-PROC-PR-RFQ-STATE',
    },
    {
      name: 'RFQ vendor invitation and supplier quotation entry require approved vendor governance',
      evidence: 'invite an approved vendor, reject unapproved or blacklisted vendors, and verify only invited vendors can submit quotations',
      scenarioId: 'C4-PROC-RFQ-VENDOR-GOVERNANCE',
    },
    {
      name: 'quotation comparison is deterministic and human supplier selection creates a single selected quotation',
      evidence: 'submit competing supplier quotations, read comparison metrics, select one quotation, verify other eligible quotations are rejected and RFQ is AWARDED',
      scenarioId: 'C4-PROC-QUOTE-SELECTION',
    },
    {
      name: 'purchase order can only be created from selected supplier quotation and approved through maker-checker',
      evidence: 'create PO from selected quote, submit for approval, verify creator self-approval is rejected and authorized second approver moves PO to APPROVED',
      scenarioId: 'C4-PROC-PO-MAKER-CHECKER',
    },
    {
      name: 'goods receipt commits header items PO received quantities stock ledger serial and audit in one transaction',
      evidence: 'receive goods with Idempotency-Key, verify GRN items, PurchaseOrderItem.receivedQty, StockTransaction, SerialNumber and AuditLog are all present or all rolled back',
      scenarioId: 'C4-PROC-GRN-ATOMICITY',
    },
    {
      name: 'concurrent GRNs cannot over-receive a purchase order line beyond configured tolerance',
      evidence: 'race two receive-goods commands for the same PO item and verify row lock/tolerance enforcement keeps total received quantity within limit',
      scenarioId: 'C4-PROC-GRN-CONCURRENCY',
    },
    {
      name: 'supplier invoice matching has a trustworthy procurement source of PO plus GRN',
      evidence: 'after goods receipt, call the procurement facade used by finance and verify organizationId, purchaseOrderId and goodsReceiptId are tenant scoped and matchable',
      scenarioId: 'C4-PROC-FINANCE-SOURCE',
    },
  ],
});
