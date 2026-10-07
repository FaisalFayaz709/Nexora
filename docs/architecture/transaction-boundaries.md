# NEXORA ERP — Locked Transaction Boundaries

## Primary rule

**Never use eventual consistency for stock balances, invoice balances, approval state, accounting postings, stock variance, landed-cost posting, tax posting, payment posting, or bank-reconciliation closure when the required effect can be committed inside one PostgreSQL transaction.**

Queues are for documents, emails, notifications, exports, analytics and external webhooks after commit.

| Workflow | Atomic transaction must include | Async after commit |
|---|---|---|
| Goods receipt | GRN + GRN items + serial/batch capture + stock transactions + PO received quantities + audit | Email, notification, export, webhook |
| Stock transfer | Transfer state + source decrement/ledger + destination increment/ledger + serial movement + audit | Notification |
| Purchase approval | Approval action + status transition + next approval state + audit | Approver notifications |
| Asset installation | Stock consumption/issue + serial state + asset record + installation history + audit | QR/PDF generation, customer notification |
| Invoice approval | Invoice final totals/status + approval + journal posting if enabled + audit | PDF generation, email, webhook |
| Payment posting | Payment + allocations + invoice balances/status + journal posting + audit | Receipt PDF/email |
| Work-order completion | Work order + service report + parts consumption + asset/service history + audit | Customer signature PDF, notification |
| Generate business number | NumberSequence row lock/reservation + assigned business number + target entity creation | Audit/reporting event only |
| Vendor onboarding approval | Vendor request + approval action + vendor status/category approval + audit | Requester/procurement notification |
| Physical stock count posting | Approved count + variance lines + stock adjustment + immutable stock ledger + audit | Stock count report/export |
| Landed cost posting | Landed-cost header/lines + allocation + inventory cost layer/value update + audit | Recalculated project profitability snapshot |
| Tax calculation on invoice | Invoice line totals + TaxTransaction records + invoice totals + audit | Tax report cache/update job |
| Bank reconciliation close | Matched statement lines + reconciliation status + journal/payment links + audit | Reconciliation report |
| Purchase release order | Contract balance check + release order + PO/PO lines + audit | Vendor notification |
| Import batch commit | Validated rows + target record changes + import result + audit | Import completion notification |
| Technician visit completion | Work-order status + visit timestamps/location proof + service report + parts consumption + audit | Customer report PDF + notification |
| Scheduled report execution | ReportExecution final status + generated Document metadata | Email delivery + dashboard refresh |
