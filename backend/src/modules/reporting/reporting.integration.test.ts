import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'Reporting export PostgreSQL/API acceptance',
  requirements: [
    { name: 'creates report export job and status evidence', evidence: 'request export, verify ReportExecution status and authorized status read' },
    { name: 'protects generated report download authorization', evidence: 'attempt download with another tenant/user and expect denial' },
  ],
});
