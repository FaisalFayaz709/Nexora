# HR Transaction Model

## Leave submission/approval
- Submit locks the leave request, creates an approval request if configured, and audits the state transition.
- If no approval definition matches, the request is approved immediately and leave balance is consumed in the same transaction.
- Approval finalization locks the leave request and leave balance together before consuming balance.

## Payroll calculation
- Calculation locks PayrollRun, replaces PayrollItem rows and updates gross/deduction/net totals in one transaction.

## Payroll posting
- Posting locks PayrollRun, requires Idempotency-Key, creates a balanced Finance journal through FinanceFacade, marks the payroll PAID and audits/posts the event in the same transaction.

Critical HR/finance state is not delegated to BullMQ.
