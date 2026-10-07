-- Pass C12: Documents, Notifications and Communication Log persistence additions.
-- Adds subject-neutral document links and reliable email outbox metadata without changing the locked PostgreSQL/Prisma stack.

CREATE TABLE IF NOT EXISTS "DocumentLink" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "documentId" UUID NOT NULL,
  "subjectType" VARCHAR(120) NOT NULL,
  "subjectId" UUID NOT NULL,
  "category" VARCHAR(80),
  "linkedById" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentLink_organizationId_documentId_subjectType_subjectId_category_key"
  ON "DocumentLink" ("organizationId", "documentId", "subjectType", "subjectId", "category");
CREATE INDEX IF NOT EXISTS "DocumentLink_organizationId_subjectType_subjectId_idx"
  ON "DocumentLink" ("organizationId", "subjectType", "subjectId");
CREATE INDEX IF NOT EXISTS "DocumentLink_organizationId_documentId_idx"
  ON "DocumentLink" ("organizationId", "documentId");

CREATE TABLE IF NOT EXISTS "EmailOutbox" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "communicationId" UUID,
  "template" VARCHAR(120) NOT NULL,
  "recipient" VARCHAR(320) NOT NULL,
  "subject" VARCHAR(240) NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "scheduledAt" TIMESTAMPTZ(6),
  "sentAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "EmailOutbox_organizationId_status_scheduledAt_idx"
  ON "EmailOutbox" ("organizationId", "status", "scheduledAt");
CREATE INDEX IF NOT EXISTS "EmailOutbox_organizationId_recipient_createdAt_idx"
  ON "EmailOutbox" ("organizationId", "recipient", "createdAt");
CREATE INDEX IF NOT EXISTS "EmailOutbox_organizationId_communicationId_idx"
  ON "EmailOutbox" ("organizationId", "communicationId");


ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "type" VARCHAR(80) NOT NULL DEFAULT 'GENERAL';

CREATE INDEX IF NOT EXISTS "Notification_organizationId_type_createdAt_idx"
  ON "Notification" ("organizationId", "type", "createdAt");
