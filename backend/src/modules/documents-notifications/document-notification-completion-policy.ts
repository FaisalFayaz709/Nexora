import { AppError } from '../../core/http/errors.js';
import {
  DocumentDeliveryCompletionInvariants,
  DocumentDeliveryCompletionRoutes,
  DocumentDeliveryCompletionSubjects,
  DocumentDeliveryRuntimeScenarios,
} from '@nexora/shared';

export const DocumentDeliveryCompletionControls = [
  'storage-service-is-the-only-minio-boundary',
  'private-bucket-and-tenant-object-prefix-are-required-for-upload-and-download',
  'upload-intent-is-audited-with-actor-file-size-mime-and-expiry-evidence',
  'complete-upload-verifies-object-size-checksum-mime-and-current-version-atomically',
  'document-retention-blocks-delete-and-delete-is-soft-delete-only',
  'document-links-and-communication-attachments-are-tenant-scoped-document-ids',
  'download-url-is-short-lived-access-logged-and-credential-safe',
  'email-outbox-has-tenant-idempotency-key-and-worker-delivery-safety',
  'notification-fanout-dedupes-recipients-and-read-state-is-user-scoped',
  'communication-log-preserves-recipient-body-status-delivery-and-attachment-traceability',
  'document-expiry-scan-emits-notification-once-without-critical-state-mutation',
  'bullmq-is-after-commit-only-for-email-notification-scan-export-webhook-work',
  'integration-webhook-configuration-is-tenant-scoped-and-https-only',
  'webhook-delivery-records-use-event-bound-idempotent-after-commit-payloads',
] as const;

export const DocumentDeliveryCriticalCommands = [
  'document.upload_intent',
  'document.complete_upload',
  'document.add_version',
  'document.download_url',
  'document.delete',
  'notification.read',
  'notification.read_all',
  'communication.send',
  'email_outbox.dispatch',
  'document.expiry_scan',
] as const;

export const DocumentDeliveryCriticalTables = [
  'Document',
  'DocumentVersion',
  'DocumentLink',
  'DocumentAccessLog',
  'Notification',
  'NotificationPreference',
  'CommunicationLog',
  'CommunicationTemplate',
  'MessageAttachment',
  'EmailOutbox',
  'EmailDeliveryLog',
  'SmsDeliveryLog',
  'AuditLog',
  'BusinessEvent',
] as const;

export const DocumentDeliveryRuntimeCertificationScenarios = DocumentDeliveryRuntimeScenarios;

export function assertDocumentDeliveryCompletionMatrix() {
  if (DocumentDeliveryCompletionSubjects.length < 14) {
    throw new AppError(500, 'M15_DOCUMENT_DELIVERY_SUBJECT_COVERAGE_INCOMPLETE', 'Document delivery completion subjects are incomplete.');
  }
  if (DocumentDeliveryCompletionRoutes.length < 11) {
    throw new AppError(500, 'M15_DOCUMENT_DELIVERY_ROUTE_COVERAGE_INCOMPLETE', 'Document delivery routes are incomplete.');
  }
  if (DocumentDeliveryCompletionInvariants.length < 13) {
    throw new AppError(500, 'M15_DOCUMENT_DELIVERY_INVARIANT_COVERAGE_INCOMPLETE', 'Document delivery invariants are incomplete.');
  }
  return {
    subjects: DocumentDeliveryCompletionSubjects.length,
    routes: DocumentDeliveryCompletionRoutes.length,
    invariants: DocumentDeliveryCompletionInvariants.length,
    runtimeScenarios: DocumentDeliveryRuntimeCertificationScenarios.length,
    controls: DocumentDeliveryCompletionControls.length,
    commands: DocumentDeliveryCriticalCommands.length,
    tables: DocumentDeliveryCriticalTables.length,
  };
}

export function assertM15DocumentAccessLogCompleteness(input: {
  action: string;
  actorUserId?: string | null;
  organizationId: string;
  documentId?: string | null;
}) {
  if (!input.organizationId || !input.actorUserId) {
    throw new AppError(500, 'M15_DOCUMENT_ACCESS_LOG_ACTOR_REQUIRED', 'Document access logs require tenant and actor identity.');
  }
  if (!input.documentId && input.action !== 'UPLOAD_INTENT') {
    throw new AppError(500, 'M15_DOCUMENT_ACCESS_LOG_DOCUMENT_REQUIRED', 'Document access logs require a document id except upload intent.');
  }
}

export function assertM15PresignedUrlPolicy(input: {
  objectKey: string;
  organizationId: string;
  expiresInSeconds: number;
  containsCredentialSecret?: boolean;
}) {
  if (!input.objectKey.startsWith(`organizations/${input.organizationId}/documents/`)) {
    throw new AppError(403, 'M15_PRESIGNED_OBJECT_TENANT_PREFIX_REQUIRED', 'Presigned document URLs must stay inside tenant document prefix.');
  }
  if (input.expiresInSeconds <= 0 || input.expiresInSeconds > 3600) {
    throw new AppError(400, 'M15_PRESIGNED_URL_TTL_TOO_LONG', 'Presigned document URLs must be short lived.');
  }
  if (input.containsCredentialSecret) {
    throw new AppError(500, 'M15_STORAGE_SECRET_LEAK_FORBIDDEN', 'Presigned URL responses must not leak storage access keys or secret keys.');
  }
}

export function assertM15EmailOutboxDeliverySafety(input: {
  organizationId: string;
  idempotencyKey: string | null | undefined;
  payloadJson: Record<string, unknown>;
  status: string;
}) {
  if (!input.organizationId || !input.idempotencyKey) {
    throw new AppError(500, 'M15_EMAIL_OUTBOX_IDEMPOTENCY_REQUIRED', 'Email outbox rows must carry a tenant-scoped idempotency key.');
  }
  for (const forbidden of ['stockTransaction', 'journalEntry', 'paymentPosting', 'approvalState', 'invoiceBalance', 'stockBalance']) {
    if (Object.prototype.hasOwnProperty.call(input.payloadJson, forbidden)) {
      throw new AppError(500, 'M15_EMAIL_OUTBOX_CRITICAL_MUTATION_PAYLOAD_FORBIDDEN', 'Email outbox jobs cannot carry critical stock, money or approval mutation payloads.', { forbidden });
    }
  }
  if (!['QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED'].includes(input.status)) {
    throw new AppError(400, 'M15_EMAIL_OUTBOX_STATUS_INVALID', 'Email outbox status is outside the approved delivery lifecycle.');
  }
}

export function assertM15DocumentExpiryFanoutOnce(input: {
  documentId: string;
  recipientUserIds: readonly string[];
  idempotencyKey: string;
}) {
  if (!input.documentId || !input.idempotencyKey.includes(input.documentId)) {
    throw new AppError(500, 'M15_DOCUMENT_EXPIRY_IDEMPOTENCY_REQUIRED', 'Document expiry notification must be idempotent per document and scan window.');
  }
  if (new Set(input.recipientUserIds).size !== input.recipientUserIds.length) {
    throw new AppError(400, 'M15_DOCUMENT_EXPIRY_RECIPIENT_DEDUPE_REQUIRED', 'Document expiry fan-out must dedupe recipients before queueing notifications.');
  }
}
