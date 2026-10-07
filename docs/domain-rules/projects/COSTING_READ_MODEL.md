# Project Costing Read Model

The source requires Project profitability and budget-vs-actual visibility.

This implementation provides the earliest valid costing baseline using data already owned by
implemented domains:

- Revenue: Project.contractValue
- Budget: latest ProjectBudget.totalBudget
- Committed cost: approved/sent/received/closed Purchase Orders linked through
  PurchaseRequest -> RFQ -> SupplierQuotation -> PurchaseOrder
- Actual material cost: accepted GRN quantity * PO item unit price
- Other actual cost: 0 until Finance/Expense integration exists
- Gross profit: contractValue - actualMaterialCost
- Profit margin: grossProfit / contractValue

The response explicitly reports
`MATERIAL_AND_PROCUREMENT_BASELINE_FINANCE_COSTS_DEFERRED`.

Landed cost, labour, transport, fuel, accommodation, subcontractor, equipment
rental, Expense and Finance postings are not fabricated in This implementation. They are
incorporated when their owning modules exist.
