-- Missing Pass M15: documents, MinIO, notifications, email outbox and communication completion guards.
ALTER TABLE "EmailOutbox" ADD COLUMN IF NOT EXISTS "idempotencyKey" VARCHAR(200);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailOutbox_organizationId_idempotencyKey_key"
  ON "EmailOutbox" ("organizationId", "idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Document_organizationId_retentionUntil_status_idx"
  ON "Document" ("organizationId", "retentionUntil", "status");

CREATE INDEX IF NOT EXISTS "MessageAttachment_organizationId_documentId_idx"
  ON "MessageAttachment" ("organizationId", "documentId");
