import { z } from 'zod';
import { UuidSchema } from '../common';

export const MissingPassM15DocumentDeliveryCompletionMarker =
  'MISSING_PASS_M15_SOURCE_PREFLIGHT_DOCUMENTS_MINIO_NOTIFICATIONS_COMMUNICATION_COMPLETION' as const;

export const Pass17DocumentEventsCommunicationsCompletionMarker =
  'PASS_17_SOURCE_LEVEL_DOCUMENTS_MINIO_EVENTS_COMMUNICATIONS_COMPLETION' as const;

export const DocumentDeliveryCompletionSubjects = [
  'STORAGE_SERVICE_ONLY_BOUNDARY',
  'PRIVATE_BUCKET_TENANT_PREFIX',
  'PRESIGNED_UPLOAD_INTENT_TRACE',
  'COMPLETE_UPLOAD_SIZE_CHECKSUM_MIME_VERIFY',
  'DOCUMENT_VERSIONING_CURRENT_VERSION_ACCESS_LOG',
  'RETENTION_AND_SOFT_DELETE_GUARD',
  'TENANT_SCOPED_DOCUMENT_LINKS',
  'SHORT_LIVED_DOWNLOAD_URL_ACCESS_LOG',
  'DOCUMENT_EXPIRY_SCAN_TO_NOTIFICATION',
  'EMAIL_OUTBOX_IDEMPOTENT_DELIVERY',
  'NOTIFICATION_FANOUT_DEDUPED_READ_STATE',
  'COMMUNICATION_LOG_ATTACHMENT_DOCUMENT_IDS_ONLY',
  'AFTER_COMMIT_ONLY_ASYNC_DELIVERY',
  'CROSS_TENANT_DOCUMENT_OBJECT_DENIAL',
] as const;

export const DocumentDeliveryCompletionRoutes = [
  'POST /api/v1/documents/upload-intent',
  'POST /api/v1/documents/complete-upload',
  'POST /api/v1/documents/:id/versions',
  'GET /api/v1/documents/:id/download-url',
  'DELETE /api/v1/documents/:id',
  'GET /api/v1/notifications',
  'POST /api/v1/notifications/:id/read',
  'POST /api/v1/notifications/read-all',
  'GET /api/v1/communications',
  'POST /api/v1/communications/send',
  'GET /api/v1/communications/:id/delivery',
  'GET /api/v1/integration-webhooks',
  'POST /api/v1/integration-webhooks',
  'GET /api/v1/integration-webhook-deliveries',
  'POST /api/v1/integration-webhooks/:id/test-delivery',
] as const;

export const DocumentDeliveryCompletionInvariants = [
  'business-modules-never-import-minio-sdk-or-object-storage-client-directly',
  'all-private-document-object-keys-start-with-organizations-organizationId-documents',
  'upload-intent-validates-file-size-mime-extension-and-records-access-intent',
  'complete-upload-verifies-size-checksum-tenant-prefix-and-creates-document-version-audit-event-atomically',
  'document-current-version-update-is-tenant-scoped-and-deleted-documents-cannot-receive-new-versions',
  'document-delete-obeys-retention-window-and-is-soft-delete-only',
  'document-links-and-message-attachments-reference-document-ids-not-object-keys-or-presigned-urls',
  'download-url-creation-records-access-log-and-never-leaks-raw-storage-credentials',
  'email-outbox-rows-carry-tenant-idempotency-key-and-worker-delivery-is-idempotent',
  'notification-fanout-dedupes-recipient-users-and-read-state-is-user-scoped',
  'communication-log-retains-recipient-subject-body-status-delivery-and-attachment-traceability',
  'bullmq-handles-email-notification-scan-export-webhook-only-after-transactional-business-state-commits',
  'cross-tenant-document-metadata-object-key-download-link-and-attachment-access-is-denied',
  'integration-webhook-endpoints-are-tenant-scoped-hashed-and-https-only',
  'webhook-deliveries-reference-business-events-and-use-idempotency-keys',
] as const;

export const DocumentDeliveryRuntimeScenarios = [
  'M15-RUNTIME-UPLOAD-INTENT-USES-PRIVATE-TENANT-PREFIX-AND-AUDIT',
  'M15-RUNTIME-COMPLETE-UPLOAD-VERIFIES-MINIO-OBJECT-SIZE-CHECKSUM',
  'M15-RUNTIME-ADD-VERSION-INCREMENTS-VERSION-AND-UPDATES-CURRENT-ATOMically',
  'M15-RUNTIME-DELETE-BLOCKED-BEFORE-RETENTION-EXPIRY',
  'M15-RUNTIME-DOWNLOAD-URL-ACCESS-LOG-AND-CROSS-TENANT-DENIAL',
  'M15-RUNTIME-COMMUNICATION-ATTACHMENT-CROSS-TENANT-DOCUMENT-BLOCKED',
  'M15-RUNTIME-EMAIL-OUTBOX-IDEMPOTENCY-KEY-UNIQUE-PER-TENANT',
  'M15-RUNTIME-NOTIFICATION-FANOUT-DEDUPES-AND-READ-STATE-USER-SCOPED',
  'M15-RUNTIME-DOCUMENT-EXPIRY-SCAN-EMITS-NOTIFICATION-ONCE',
  'M15-RUNTIME-WORKER-DELIVERY-DOES-NOT-MUTATE-STOCK-MONEY-APPROVAL',
] as const;

export const DocumentUploadIntentTraceSchema = z.object({
  organizationId: UuidSchema,
  actorUserId: UuidSchema,
  objectKey: z.string().min(1).max(1024),
  bucketName: z.string().min(1).max(120),
  expiresInSeconds: z.number().int().positive().max(3600),
  fileName: z.string().min(1).max(260),
  mimeType: z.string().min(1).max(160),
  sizeBytes: z.number().int().positive(),
});

export const EmailOutboxDeliveryEvidenceSchema = z.object({
  organizationId: UuidSchema,
  emailOutboxId: UuidSchema,
  communicationId: UuidSchema.nullable().optional(),
  idempotencyKey: z.string().min(1).max(200),
  recipient: z.string().email(),
  status: z.enum(['QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED']),
  attempts: z.number().int().min(0),
});

export const CommunicationAttachmentScopeSchema = z.object({
  organizationId: UuidSchema,
  communicationId: UuidSchema.optional(),
  attachmentDocumentIds: z.array(UuidSchema),
  existingTenantDocumentIds: z.array(UuidSchema),
});

export const DocumentDeliveryCompletionRows = DocumentDeliveryCompletionSubjects.map((subject) => ({
  subject,
  routeCoverage: DocumentDeliveryCompletionRoutes,
  invariantCoverage: DocumentDeliveryCompletionInvariants,
  runtimeScenarios: DocumentDeliveryRuntimeScenarios,
}));
