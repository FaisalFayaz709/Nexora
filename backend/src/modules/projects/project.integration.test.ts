import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'Projects PostgreSQL/API acceptance',
  requirements: [
    {
      name: 'keeps project number generation unique under concurrency',
      evidence: 'race project creation and verify unique projectNo values and consumed NumberSequenceReservation rows',
    },
    {
      name: 'protects customer site manager tenant scope and task dependencies',
      evidence: 'create project commands with foreign customer, site, manager and dependency IDs and verify each is denied',
    },
    {
      name: 'keeps BOM approval material requirement and handover atomic',
      evidence: 'approve a BOM, create material requirement and complete handover while verifying transaction rollback on injected failure',
    },
  ],
});
