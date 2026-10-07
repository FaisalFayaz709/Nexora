-- Missing Pass M17: portal/PWA offline sync idempotency evidence.
-- Existing critical command services remain synchronous and transactional.
ALTER TABLE "OfflinePwaSyncItem" ADD COLUMN IF NOT EXISTS "clientCommandId" VARCHAR(120);
ALTER TABLE "OfflinePwaSyncItem" ADD COLUMN IF NOT EXISTS "payloadHash" VARCHAR(128);
ALTER TABLE "OfflinePwaSyncItem" ADD COLUMN IF NOT EXISTS "occurredAt" TIMESTAMPTZ(6);
ALTER TABLE "OfflinePwaSyncItem" ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX IF NOT EXISTS "OfflinePwaSyncItem_organizationId_clientCommandId_key"
  ON "OfflinePwaSyncItem" ("organizationId", "clientCommandId")
  WHERE "clientCommandId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "OfflinePwaSyncItem_organizationId_occurredAt_idx"
  ON "OfflinePwaSyncItem" ("organizationId", "occurredAt");
