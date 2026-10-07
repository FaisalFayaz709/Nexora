import { runtimeAcceptanceSuite } from '../../test/runtime-acceptance.js';

runtimeAcceptanceSuite({
  title: 'C12 Documents, Notifications and Communication Log runtime acceptance',
  requirements: [
    { name: 'C12-DOCUMENT-LINKS-TO-ANY-BUSINESS-SUBJECT', evidence: 'complete upload creates Document, DocumentVersion, DocumentLink and audit in one tenant-scoped transaction' },
    { name: 'C12-DOCUMENT-VERSIONING-RETENTION-EXPIRY-ACCESS-LOG', evidence: 'new version increments versionNo, preserves prior version and writes access/audit log' },
    { name: 'C12-MINIO-ONLY-THROUGH-STORAGE-SERVICE', evidence: 'document module returns presigned URL through StorageService and never exposes MinIO secrets or SDK calls' },
    { name: 'C12-NOTIFICATION-CENTER-EVENT-FANOUT-READ-STATE', evidence: 'business event creates deduped tenant-scoped notifications and read/read-all changes only current user rows' },
    { name: 'C12-EMAIL-OUTBOX-RELIABLE-DISPATCH-IDEMPOTENT-QUEUE', evidence: 'email outbox row is written transactionally and email.send BullMQ job uses idempotency key after commit' },
    { name: 'C12-COMMUNICATION-LOG-CUSTOMER-VENDOR-DISPUTE-TRACEABILITY', evidence: 'communications preserve channel, recipient, template, delivery status, failure reason and subject timeline link' },
    { name: 'C12-COMMUNICATION-ATTACHMENTS-REFERENCE-DOCUMENTS-NOT-OBJECT-SECRETS', evidence: 'message attachments reference Document ids and never expose object keys, buckets or presigned URLs in the log payload' },
    { name: 'C12-DOCUMENT-EXPIRY-SCAN-EVENT-TO-NOTIFICATION', evidence: 'expiry scan finds due documents and queues notification/email jobs without mutating unrelated business state' },
    { name: 'C12-NO-ASYNC-CRITICAL-STOCK-MONEY-APPROVAL-MUTATION', evidence: 'queues contain only document/email/notification/export/webhook payloads; stock, finance and approval changes remain synchronous' },
  ],
});
