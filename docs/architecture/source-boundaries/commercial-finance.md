# Commercial Finance Source Boundary

## Source-locked

Appendix F requires:
- Landed Cost / Inventory Valuation:
  LandedCost, LandedCostLine, LandedCostAllocation and InventoryCostLayer.
- Tax Engine:
  TaxCode, TaxRate, TaxRule, TaxJurisdiction, TaxTransaction and
  WithholdingTaxRule.
- Bank & Cash:
  BankAccount, CashAccount, BankStatement, BankStatementLine,
  BankReconciliation, PaymentVoucher, ReceiptVoucher and ChequeRegister.
- APIs:
  POST /landed-costs, POST /landed-costs/:id/allocate,
  POST /landed-costs/:id/post, GET /tax-codes, POST /tax-rules,
  POST /tax/calculate, GET /tax/reports, GET /bank-accounts,
  POST /bank-statements/import, POST /bank-reconciliations/:id/close,
  POST /vouchers/payment, and Pass 15 completion route POST /vouchers/receipt.
- Permission additions:
  landed_cost.manage, tax.manage, bank.manage.
- Landed cost posting, tax calculation on invoice/payment-like documents and
  bank reconciliation closure must be synchronous because financial/inventory
  effects must be immediately consistent.
- Landed cost allocations must reconcile to total landed cost and update
  inventory/project costing consistently.
- Tax calculation must be deterministic and auditable, and stored at transaction
  time so later rule changes do not rewrite history.
- Closed bank reconciliations cannot be silently edited.

## Implementation-derived, explicitly not source-locked

The PDF does not print exact field payloads for these endpoints, status catalogs
for landed-cost/bank entities, or a full bank-account creation API.

This implementation therefore:
- keeps bank/cash account creation as seed/admin data, because the locked API has
  only GET /bank-accounts;
- keeps PaymentVoucher as the Appendix-F printed voucher command;
- exposes ReceiptVoucher through Pass 15 as a controlled bank/cash receipt command because the database catalog already models ReceiptVoucher and the blueprint requires receipt vouchers in bank/cash management;
- makes landed-cost post idempotent with Idempotency-Key;
- creates a bank reconciliation automatically when a statement is imported, as no
  separate create-reconciliation endpoint is printed;
- uses `FinanceFacade` for journal/account interactions and `InventoryFacade`
  for InventoryCostLayer writes;
- stores TaxTransaction for previews as audit evidence without changing invoices
  until the owning invoice workflow calls the tax engine.

No duplicated Next.js/domain API was added; the receipt-voucher completion route remains inside the locked Fastify /api/v1 business API surface.
