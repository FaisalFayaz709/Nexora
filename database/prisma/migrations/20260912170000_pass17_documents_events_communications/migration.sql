-- Pass 17: Documents, MinIO, communications, notifications, events and webhook delivery completion.
-- Additive only. Strengthens retry/idempotency guarantees for delivery queues.

ALTER TABLE "EmailOutbox"
  ADD CONSTRAINT IF NOT EXISTS "EmailOutbox_organizationId_idempotencyKey_key"
  UNIQUE ("organizationId", "idempotencyKey");

ALTER TABLE "IntegrationWebhookDelivery"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" VARCHAR(200);

ALTER TABLE "IntegrationWebhookDelivery"
  ADD CONSTRAINT IF NOT EXISTS "IntegrationWebhookDelivery_org_webhook_idempotency_key"
  UNIQUE ("organizationId", "webhookId", "idempotencyKey");

CREATE INDEX IF NOT EXISTS "IntegrationWebhookDelivery_org_event_status_idx"
  ON "IntegrationWebhookDelivery"("organizationId", "eventId", "status");

CREATE INDEX IF NOT EXISTS "BusinessEvent_org_type_published_idx"
  ON "BusinessEvent"("organizationId", "type", "publishedAt");
