import { describe, expect, it } from 'vitest';
import {
  assertDocumentDeliveryCompletionMatrix,
  assertM15DocumentAccessLogCompleteness,
  assertM15DocumentExpiryFanoutOnce,
  assertM15EmailOutboxDeliverySafety,
  assertM15PresignedUrlPolicy,
} from './document-notification-completion-policy.js';
import {
  assertCommunicationAttachmentTenantScope,
  assertDocumentRetentionAllowsDelete,
  assertDocumentUploadIntentTrace,
  assertEmailOutboxIdempotency,
} from './document-notification-policy.js';

describe('M15 documents, MinIO, notifications and communication completion policy', () => {
  it('M15-DOCUMENT-DELIVERY-MATRIX-REQUIRES-BLUEPRINT-CONTROLS', () => {
    expect(assertDocumentDeliveryCompletionMatrix()).toMatchObject({ subjects: 14, runtimeScenarios: 10 });
  });

  it('M15-UPLOAD-INTENT-USES-PRIVATE-TENANT-PREFIX-AND-ACTOR-TRACE', () => {
    expect(() => assertDocumentUploadIntentTrace({
      organizationId: '00000000-0000-4000-8000-000000000001',
      actorUserId: '00000000-0000-4000-8000-000000000002',
      objectKey: 'organizations/00000000-0000-4000-8000-000000000001/documents/Asset/a/warranty/file.pdf',
      bucketName: 'nexora-private',
      privateBucket: 'nexora-private',
      expiresInSeconds: 900,
    })).not.toThrow();
  });

  it('M15-PRESIGNED-URL-IS-SHORT-LIVED-AND-TENANT-SCOPED', () => {
    expect(() => assertM15PresignedUrlPolicy({
      objectKey: 'organizations/org-1/documents/Project/project-1/handover/file.pdf',
      organizationId: 'org-1',
      expiresInSeconds: 900,
    })).not.toThrow();
    expect(() => assertM15PresignedUrlPolicy({ objectKey: 'organizations/other/documents/file.pdf', organizationId: 'org-1', expiresInSeconds: 900 })).toThrow('M15_PRESIGNED_OBJECT_TENANT_PREFIX_REQUIRED');
  });

  it('M15-RETENTION-SOFT-DELETE-GUARD-BLOCKS-EARLY-DELETE', () => {
    expect(() => assertDocumentRetentionAllowsDelete({ retentionUntil: '2026-12-31T00:00:00.000Z', now: new Date('2026-09-06T00:00:00.000Z') })).toThrow('M15-RETENTION-SOFT-DELETE-GUARD');
  });

  it('M15-COMMUNICATION-ATTACHMENTS-ARE-TENANT-DOCUMENT-IDS', () => {
    expect(() => assertCommunicationAttachmentTenantScope({ attachmentDocumentIds: ['doc-1'], existingTenantDocumentIds: ['doc-1'] })).not.toThrow();
    expect(() => assertCommunicationAttachmentTenantScope({ attachmentDocumentIds: ['doc-1'], existingTenantDocumentIds: [] })).toThrow('M15-COMMUNICATION-ATTACHMENT-TENANT-SCOPE');
  });

  it('M15-EMAIL-OUTBOX-IDEMPOTENCY-AND-PAYLOAD-SAFETY', () => {
    expect(() => assertEmailOutboxIdempotency({ organizationId: 'org-1', communicationId: 'comm-1', idempotencyKey: 'email:org-1:comm-1', payloadKeys: ['communicationId', 'recipient'] })).not.toThrow();
    expect(() => assertM15EmailOutboxDeliverySafety({ organizationId: 'org-1', idempotencyKey: 'email:org-1:comm-1', payloadJson: { communicationId: 'comm-1' }, status: 'QUEUED' })).not.toThrow();
    expect(() => assertM15EmailOutboxDeliverySafety({ organizationId: 'org-1', idempotencyKey: 'email:org-1:comm-1', payloadJson: { approvalState: 'APPROVED' }, status: 'QUEUED' })).toThrow('M15_EMAIL_OUTBOX_CRITICAL_MUTATION_PAYLOAD_FORBIDDEN');
  });

  it('M15-DOCUMENT-ACCESS-LOG-AND-EXPIRY-FANOUT-ARE-COMPLETE', () => {
    expect(() => assertM15DocumentAccessLogCompleteness({ action: 'DOWNLOAD_URL', organizationId: 'org-1', actorUserId: 'user-1', documentId: 'doc-1' })).not.toThrow();
    expect(() => assertM15DocumentExpiryFanoutOnce({ documentId: 'doc-1', recipientUserIds: ['u1', 'u2'], idempotencyKey: 'document-expiry:doc-1:2026-09-06' })).not.toThrow();
  });
});
