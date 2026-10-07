import { z } from 'zod';
import { UuidSchema } from '../common';

export const PASS_17_DOCUMENTS_EVENTS_COMMUNICATIONS_COMPLETION =
  'PASS_17_SOURCE_LEVEL_DOCUMENTS_MINIO_EVENTS_COMMUNICATIONS_COMPLETION' as const;

export const IntegrationWebhookRouteContracts = [
  'GET /api/v1/integration-webhooks',
  'GET /api/v1/integration-webhooks/:id',
  'POST /api/v1/integration-webhooks',
  'PATCH /api/v1/integration-webhooks/:id',
  'POST /api/v1/integration-webhooks/:id/activate',
  'POST /api/v1/integration-webhooks/:id/deactivate',
  'GET /api/v1/integration-webhook-deliveries',
  'POST /api/v1/integration-webhooks/:id/test-delivery',
] as const;

export const Pass17DocumentEventCommunicationSubjects = [
  'Document upload intent',
  'Document completed upload',
  'Document version append',
  'Document soft deletion and retention',
  'Document access log',
  'Document expiry scan',
  'Notification fan-out',
  'Notification read/read-all',
  'Email outbox delivery',
  'Communication log',
  'Communication attachments',
  'Business event outbox',
  'Webhook endpoint configuration',
  'Webhook delivery attempt',
  'Worker after-commit delivery',
] as const;

export const Pass17DocumentEventCommunicationInvariants = [
  'MinIO SDK access is centralized behind backend StorageService only',
  'Private document object keys are tenant-prefixed under organizations/{organizationId}/documents',
  'Upload intent and completed upload are audited and never expose raw storage credentials',
  'Document version creation verifies object ownership, checksum, MIME type and size before metadata commit',
  'Document links and message attachments use tenant-scoped document ids, not presigned URLs or raw object keys',
  'Notification read state is scoped to organizationId and authenticated userId',
  'Email outbox rows use tenant idempotency keys and retry-safe worker payloads',
  'Communication logs retain channel, recipient, subject, body, delivery state, failures and attachment traceability',
  'Webhook delivery records are tenant-scoped, event-bound and enqueue only after transactional state exists',
  'Queues are limited to documents, emails, notifications, exports, analytics and webhooks after commit',
  'Queues never mutate stock balances, money, approval state, invoice balances or posted ledgers',
  'BusinessEvent rows are the integration source of truth for downstream asynchronous delivery',
] as const;

export const IntegrationWebhookListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  eventType: z.string().min(1).max(160).optional(),
  active: z.coerce.boolean().optional(),
});

export const IntegrationWebhookDeliveryListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  webhookId: UuidSchema.optional(),
  eventId: UuidSchema.optional(),
  status: z.enum(['PENDING', 'DELIVERED', 'FAILED', 'RETRYING']).optional(),
});

export const CreateIntegrationWebhookSchema = z.object({
  connectionId: UuidSchema,
  eventType: z.string().min(3).max(160),
  targetUrl: z.string().url().max(2000),
});

export const UpdateIntegrationWebhookSchema = z.object({
  eventType: z.string().min(3).max(160).optional(),
  targetUrl: z.string().url().max(2000).optional(),
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one webhook field is required.');

export const TestIntegrationWebhookDeliverySchema = z.object({
  eventId: UuidSchema.optional(),
  payloadJson: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().min(1).max(200),
});

export type IntegrationWebhookListQuery = z.infer<typeof IntegrationWebhookListQuerySchema>;
export type IntegrationWebhookDeliveryListQuery = z.infer<typeof IntegrationWebhookDeliveryListQuerySchema>;
export type CreateIntegrationWebhookInput = z.infer<typeof CreateIntegrationWebhookSchema>;
export type UpdateIntegrationWebhookInput = z.infer<typeof UpdateIntegrationWebhookSchema>;
export type TestIntegrationWebhookDeliveryInput = z.infer<typeof TestIntegrationWebhookDeliverySchema>;

export const Pass17DocumentEventsCommunicationsManifest = Object.freeze({
  status: PASS_17_DOCUMENTS_EVENTS_COMMUNICATIONS_COMPLETION,
  routeContracts: IntegrationWebhookRouteContracts,
  subjects: Pass17DocumentEventCommunicationSubjects,
  invariants: Pass17DocumentEventCommunicationInvariants,
});
