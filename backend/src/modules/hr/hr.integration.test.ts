import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'HR PostgreSQL/API acceptance',
  requirements: [
    { name: 'keeps leave approval and balance consumption atomic', evidence: 'approve leave and verify LeaveBalance changes only after final approval' },
    { name: 'protects leave cancellation state', evidence: 'attempt cancellation after final decision and expect rejection' },
    { name: 'calculates payroll from salary attendance and leave', evidence: 'create payroll run and verify PayrollItem evidence' },
    { name: 'posts payroll idempotently through FinanceFacade', evidence: 'retry payroll post and verify one balanced journal' },
    { name: 'denies cross-tenant HR references', evidence: 'use employee/attendance/payroll ids from another tenant and expect denial' },
  ],
});
