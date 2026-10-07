import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'C10 Finance core workflow acceptance',
  requirements: [
    {
      name: 'C10-CUSTOMER-INVOICE-SUBMIT-APPROVE-POST-SEND-CANCEL-STATE-MACHINE',
      evidence: 'Create a customer invoice from project/contract context, submit it, approve it, post it with a balanced journal entry, send it through the document/email queue boundary, and verify cancel/reverse rules preserve ledger history.',
    },
    {
      name: 'C10-SUPPLIER-INVOICE-THREE-WAY-MATCH-PO-GRN-INVOICE',
      evidence: 'Create a supplier invoice against a PurchaseOrder and GoodsReceipt, compare invoice lines with PO quantity/price and accepted GRN quantity, and set matchStatus to MATCHED, VARIANCE or BLOCKED without writing MATCHED into canonical invoice status.',
    },
    {
      name: 'C10-SUPPLIER-INVOICE-MATCH-STATUS-NOT-CANONICAL-INVOICE-STATUS',
      evidence: 'After supplier invoice matching, verify canonical status remains DRAFT or APPROVAL_PENDING/APPROVED while MATCHED is written only to matchStatus.',
    },
    {
      name: 'C10-PAYMENT-IDEMPOTENCY-ONE-FINANCIAL-EFFECT',
      evidence: 'Post a customer/vendor payment twice with the same Idempotency-Key and verify a single Payment, PaymentAllocation, invoice balance change and JournalEntry effect are committed.',
    },
    {
      name: 'C10-PAYMENT-PARTIAL-FULL-BALANCE-RECONCILIATION',
      evidence: 'Post partial and full payments and verify CustomerInvoice and SupplierInvoice balances reconcile to PARTIALLY_PAID or PAID in the same transaction as allocations and journal postings.',
    },
    {
      name: 'C10-JOURNAL-BALANCED-POSTING-AND-REVERSAL-ONLY-CORRECTION',
      evidence: 'Reject unbalanced journals, post balanced journals, and verify posted finance ledgers are corrected with reversal records instead of silent edit/delete.',
    },
    {
      name: 'C10-AR-AP-AGING-TENANT-BRANCH-PERMISSION-SCOPE',
      evidence: 'Fetch receivables and payables reports as scoped users and verify tenant, branch and permission filters prevent cross-tenant or unauthorized financial disclosure.',
    },
    {
      name: 'C10-EXPENSE-APPROVAL-FINANCE-VERIFICATION-PAYMENT-HANDOFF',
      evidence: 'Submit an employee/project expense, route approval through the approval facade, finance-verify it and verify payment handoff keeps audit and project costing traceability.',
    },
  ],
});
