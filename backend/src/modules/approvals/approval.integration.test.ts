import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'Approval Engine PostgreSQL/API acceptance',
  requirements: [
    {
      name: 'enforces maker-checker eligibility and distinct approvers',
      evidence: 'create a subject approval, attempt creator self-approval, then approve with an eligible different approver and verify ApprovalAction audit rows',
    },
    {
      name: 'keeps approval and subject transition atomic under concurrency',
      evidence: 'race two final approval attempts and verify exactly one subject status transition with one completed approval request',
    },
    {
      name: 'requires rejection comments and protects tenant and branch scope',
      evidence: 'reject without comment and with foreign-tenant subject identifiers; both must be denied with stable error codes',
    },
  ],
});
