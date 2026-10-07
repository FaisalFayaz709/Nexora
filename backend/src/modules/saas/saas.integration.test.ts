import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'SaaS billing PostgreSQL/API acceptance',
  requirements: [
    { name: 'restricts plan and subscription changes to platform owner', evidence: 'attempt with tenant admin and platform owner and compare permissions' },
    { name: 'records usage metrics with tenant limits', evidence: 'record usage rows and verify metering plus limit enforcement' },
    { name: 'posts SaaS invoices through FinanceFacade', evidence: 'post SaaS invoice and verify journal/invoice audit evidence' },
  ],
});
