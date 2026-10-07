import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'Notifications PostgreSQL/API acceptance',
  requirements: [
    { name: 'enforces per-user notification list scope', evidence: 'seed two users in one tenant and prove list results never cross user boundary' },
    { name: 'marks a single notification read only for owner', evidence: 'call mark-read as owner and as another tenant/user and compare persisted status' },
    { name: 'mark-all-read remains user scoped', evidence: 'create unread rows for multiple users and verify only actor rows change' },
  ],
});
