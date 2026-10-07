import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'Documents PostgreSQL/API acceptance',
  requirements: [
    { name: 'keeps upload intent and completion auditable', evidence: 'create upload intent, complete with checksum and verify document/version rows' },
    { name: 'protects version history and retention-aware delete', evidence: 'upload new version, delete document and verify history remains visible to authorized user' },
    { name: 'does not expose direct MinIO access', evidence: 'verify download URLs are issued only by backend StorageService path' },
  ],
});
