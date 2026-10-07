import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'Communication Log PostgreSQL/API acceptance',
  requirements: [
    { name: 'logs send request and delivery evidence atomically', evidence: 'create send request and verify CommunicationLog plus delivery row' },
    { name: 'keeps external delivery after commit only', evidence: 'simulate transaction failure and verify no email/SMS dispatch side effect' },
    { name: 'links communication history to subject timelines', evidence: 'create subject-linked log and verify it appears only in authorized timeline' },
    { name: 'preserves document attachment references', evidence: 'attach Document reference and verify no direct MinIO SDK path is exposed' },
  ],
});
