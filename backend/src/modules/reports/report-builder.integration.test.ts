import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'Report Builder PostgreSQL/API acceptance',
  requirements: [
    { name: 'preserves permission scope on sensitive reports', evidence: 'create Finance/HR report and verify scope cannot be weakened' },
    { name: 'creates scheduled report execution evidence', evidence: 'create schedule and verify pending ReportExecution row' },
    { name: 'exports reports only for authorized users', evidence: 'request export and verify status/download denial across tenants' },
  ],
});
