# Finance Source Boundary

## Source-locked

The locked Finance public API has 26 routes covering customer invoices,
supplier invoices, expenses, payments, accounts, journal entries, receivables
and payables.

The source Finance entity catalog contains:
CustomerInvoice, CustomerInvoiceItem, SupplierInvoice, SupplierInvoiceItem,
Payment, PaymentAllocation, Expense, ExpenseItem, FinancialPeriod, Account,
JournalEntry, JournalLine, CreditNote and DebitNote.

Customer invoice source statuses are:
DRAFT, APPROVED, SENT, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED.

Source critical transaction rules:
- invoice approval/posting must include final invoice totals/status, approval,
  journal posting when enabled and audit;
- payment posting must include payment, allocations, invoice balances/status,
  journal posting and audit;
- never use eventual consistency for invoice balances or accounting postings
  when the workflow can be committed in one PostgreSQL transaction;
- posted accounting ledgers must be reversal-based, not destructively edited.

## Implementation-derived, explicitly not source-locked

The PDF does not print full payloads for every Finance route, exact supplier
invoice statuses, exact account-code defaults, or tax/account mapping rules.

This implementation therefore:
- preserves source customer invoice statuses and adds controlled internal
  APPROVAL_PENDING, POSTED and REVERSED states required by locked submit/post/
  cancel commands;
- derives supplier invoice states for match/approval/post/payment lifecycle;
- keeps Payment.partyType/partyId and PaymentAllocation.invoiceType/invoiceId as
  polymorphic references because the source defines them that way;
- creates default implementation accounts 1000/1100/2000/2100/4000/5000 only as
  a bootstrap accounting map, not as source-mandated chart-of-accounts content;
- treats direct supplier-invoice post as internal after approval; no public route
  is invented beyond the locked match and approve commands;
- creates CreditNote and DebitNote persistence models but no public endpoints,
  because none are listed in the locked catalog.
