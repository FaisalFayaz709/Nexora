# HR Source Boundary

## Source-locked
- Employee profiles with employee number, name, branch, department, manager, job title, joining date, employment type, salary/contact/bank/document/certification/skill/status evidence.
- Attendance statuses: Present, Absent, Late, Half Day, Remote, On Site, Leave and Holiday.
- Leave workflow: Employee Leave Request -> Manager Review -> HR Review -> Approved / Rejected.
- Leave balances maintained automatically.
- Payroll statuses: DRAFT, CALCULATED, REVIEWED, APPROVED, PAID.
- Payroll includes salary, allowances, overtime, bonus, tax, loan deduction, absence deduction and net salary evidence.
- Exact Core §9 HR routes only.

## Implementation-derived
- Attendance write/import endpoints are not invented because the locked route catalog exposes only list/get attendance.
- Leave type management endpoints are not invented; leave types are seed/admin data within the current locked scope.
- Payslip PDF generation is deferred because no locked public route exists for payslips.
- Payroll post writes a Finance journal through FinanceFacade and requires Idempotency-Key.
- Leave approvals integrate with ApprovalFacade and HR exposes an approval subject handler.
