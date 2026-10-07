-- Missing Pass M21 operational evidence tables.
-- These tables store runtime evidence metadata only. They do not mutate stock, money, approval, journal, invoice, asset or work-order state.

CREATE TABLE IF NOT EXISTS "OperationalDrillRun" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "branchId" UUID NULL,
  "drillType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "finishedAt" TIMESTAMPTZ NULL,
  "evidenceJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "OperationalDrillRun_organizationId_drillType_startedAt_idx"
  ON "OperationalDrillRun" ("organizationId", "drillType", "startedAt");

CREATE TABLE IF NOT EXISTS "OperationalMetricSnapshot" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "branchId" UUID NULL,
  "drillRunId" UUID NULL,
  "metricName" TEXT NOT NULL,
  "metricValue" NUMERIC(18, 6) NOT NULL,
  "unit" TEXT NOT NULL,
  "capturedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "evidenceFile" TEXT NULL,
  CONSTRAINT "OperationalMetricSnapshot_drillRunId_fkey"
    FOREIGN KEY ("drillRunId") REFERENCES "OperationalDrillRun" ("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "OperationalMetricSnapshot_organizationId_metricName_capturedAt_idx"
  ON "OperationalMetricSnapshot" ("organizationId", "metricName", "capturedAt");

CREATE TABLE IF NOT EXISTS "BackupRestoreDrillEvidence" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "drillRunId" UUID NOT NULL,
  "postgresBackupChecksum" TEXT NOT NULL,
  "minioObjectManifestChecksum" TEXT NOT NULL,
  "backupEncrypted" BOOLEAN NOT NULL DEFAULT true,
  "retentionDays" INTEGER NOT NULL,
  "rpoMinutes" NUMERIC(10, 2) NOT NULL,
  "rtoMinutes" NUMERIC(10, 2) NOT NULL,
  "restoreDrillPassed" BOOLEAN NOT NULL DEFAULT false,
  "restoredDatabaseValidated" BOOLEAN NOT NULL DEFAULT false,
  "restoredObjectSampleValidated" BOOLEAN NOT NULL DEFAULT false,
  "crossTenantSampleDenied" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "BackupRestoreDrillEvidence_drillRunId_fkey"
    FOREIGN KEY ("drillRunId") REFERENCES "OperationalDrillRun" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "BackupRestoreDrillEvidence_organizationId_createdAt_idx"
  ON "BackupRestoreDrillEvidence" ("organizationId", "createdAt");

CREATE TABLE IF NOT EXISTS "ObservabilitySignalSample" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "drillRunId" UUID NULL,
  "signalType" TEXT NOT NULL,
  "requestId" TEXT NULL,
  "correlationId" TEXT NULL,
  "redactionVerified" BOOLEAN NOT NULL DEFAULT false,
  "alertRuleKey" TEXT NULL,
  "sampleJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "capturedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ObservabilitySignalSample_drillRunId_fkey"
    FOREIGN KEY ("drillRunId") REFERENCES "OperationalDrillRun" ("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ObservabilitySignalSample_organizationId_signalType_capturedAt_idx"
  ON "ObservabilitySignalSample" ("organizationId", "signalType", "capturedAt");
