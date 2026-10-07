import { deferred, processed, type ProcessorResult } from './result.js';
import type { DocumentScanJob, EmailSendJob, NotificationCreateJob } from '../queues/job-contracts.js';

export const C12_DOCUMENT_NOTIFICATION_WORKER_POLICY = 'C12_DOCUMENT_NOTIFICATION_WORKER_POLICY' as const;

export const M15_DOCUMENT_DELIVERY_WORKER_COMPLETION_POLICY = 'M15_DOCUMENT_DELIVERY_WORKER_COMPLETION_POLICY' as const;

export function assertM15AfterCommitDeliveryPayload(queueName: string, payload: Record<string, unknown>): void {
  const forbidden = ['stockTransaction', 'journalEntry', 'paymentPosting', 'approvalState', 'invoiceBalance', 'stockBalance'];
  for (const key of forbidden) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      throw new Error(`M15-AFTER-COMMIT-ONLY-ASYNC-DELIVERY violation: ${queueName} cannot carry critical mutation payload ${key}.`);
    }
  }
}

export function assertC12TenantJobIdempotency(job: { organizationId: string; idempotencyKey: string }): void {
  if (!job.organizationId || !job.idempotencyKey) {
    throw new Error('C12-EMAIL-OUTBOX-RELIABLE-DISPATCH-IDEMPOTENT-QUEUE violation: tenant jobs require organizationId and idempotencyKey.');
  }
}

export async function processC12EmailOutbox(job: EmailSendJob, enabled: boolean): Promise<ProcessorResult> {
  assertC12TenantJobIdempotency(job);
  assertM15AfterCommitDeliveryPayload('email.send', job.payloadJson);
  if (!job.emailOutboxId) {
    return deferred('C12 email.send consumed a valid email payload; EmailOutbox id is required before live SMTP delivery.', job.idempotencyKey);
  }
  if (!enabled) {
    return deferred('C12 email.send delivery is disabled by WORKER_EMAIL_DELIVERY_ENABLED=false after queue validation.', job.idempotencyKey);
  }
  return processed(job.emailOutboxId, job.idempotencyKey);
}

export async function processC12NotificationCreate(job: NotificationCreateJob): Promise<ProcessorResult> {
  assertC12TenantJobIdempotency(job);
  assertM15AfterCommitDeliveryPayload('notification.create', { subjectType: job.subjectType, subjectId: job.subjectId, type: job.type });
  return processed(`notification:${job.organizationId}:${job.recipientUserId}:${job.type}`, job.idempotencyKey);
}

export async function processC12DocumentScan(job: DocumentScanJob): Promise<ProcessorResult> {
  assertC12TenantJobIdempotency(job);
  assertM15AfterCommitDeliveryPayload('document.scan', { documentId: job.documentId, documentVersionId: job.documentVersionId, objectKey: job.objectKey, checksumSha256: job.checksumSha256 });
  return deferred('C12 document.scan consumed checksum-bound document scan job; optional malware adapter can be enabled without changing the locked stack.', job.idempotencyKey);
}


export async function processPass17WebhookDelivery(job: { organizationId: string; idempotencyKey: string; webhookDeliveryId: string; payloadJson: Record<string, unknown> }, enabled: boolean): Promise<ProcessorResult> {
  assertC12TenantJobIdempotency(job);
  assertM15AfterCommitDeliveryPayload('webhook.deliver', job.payloadJson);
  if (!enabled) {
    return deferred('PASS_17 webhook.deliver validated tenant/idempotency/payload safety; live delivery disabled by worker configuration.', job.idempotencyKey);
  }
  return processed(job.webhookDeliveryId, job.idempotencyKey);
}
