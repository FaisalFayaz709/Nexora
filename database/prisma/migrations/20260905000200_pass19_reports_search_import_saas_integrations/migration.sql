-- NEXORA ERP Pass 19 - Reports, Search, Import, SaaS & Integrations
-- Adds runtime/export, search/calendar indexes, import wizard, SaaS billing, usage metrics and integration outbox foundations.

CREATE TABLE "ImportMapping" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "templateId" UUID,
  "subjectType" VARCHAR(80) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "mappingJson" JSONB NOT NULL,
  "duplicatePolicy" VARCHAR(40) NOT NULL DEFAULT 'FAIL',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportMapping_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ImportMapping_org_subject_name_key" UNIQUE ("organizationId","subjectType","name"),
  CONSTRAINT "ImportMapping_duplicate_policy_check" CHECK ("duplicatePolicy" IN ('FAIL','SKIP','UPDATE'))
);
CREATE TABLE "ImportBatch" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "branchId" UUID,
  "subjectType" VARCHAR(80) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'UPLOADED',
  "fileName" VARCHAR(240) NOT NULL,
  "fileSizeBytes" BIGINT NOT NULL,
  "mimeType" VARCHAR(120) NOT NULL,
  "checksumSha256" VARCHAR(64) NOT NULL,
  "documentId" UUID,
  "mappingJson" JSONB,
  "duplicatePolicy" VARCHAR(40) NOT NULL DEFAULT 'FAIL',
  "validationSummaryJson" JSONB,
  "committedAt" TIMESTAMPTZ(6),
  "committedById" UUID,
  "rolledBackAt" TIMESTAMPTZ(6),
  "rollbackReason" TEXT,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ImportBatch_subject_check" CHECK ("subjectType" IN ('EMPLOYEE','CUSTOMER','VENDOR','PRODUCT','WAREHOUSE','INVENTORY')),
  CONSTRAINT "ImportBatch_status_check" CHECK ("status" IN ('UPLOADED','VALIDATED','COMMITTED','ROLLED_BACK','FAILED')),
  CONSTRAINT "ImportBatch_checksum_check" CHECK (char_length("checksumSha256") = 64)
);
CREATE TABLE "ImportRow" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "batchId" UUID NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "rawJson" JSONB NOT NULL,
  "normalizedJson" JSONB,
  "status" VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  "targetType" VARCHAR(120),
  "targetId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ImportRow_batch_row_key" UNIQUE ("batchId","rowNumber"),
  CONSTRAINT "ImportRow_status_check" CHECK ("status" IN ('PENDING','VALID','INVALID','COMMITTED','SKIPPED','ROLLED_BACK'))
);
CREATE TABLE "ImportRowError" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "rowId" UUID NOT NULL,
  "fieldName" VARCHAR(160),
  "code" VARCHAR(120) NOT NULL,
  "message" TEXT NOT NULL,
  "severity" VARCHAR(40) NOT NULL DEFAULT 'ERROR',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportRowError_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ImportRowError_severity_check" CHECK ("severity" IN ('INFO','WARNING','ERROR'))
);
CREATE TABLE "DuplicateCheckRule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "subjectType" VARCHAR(80) NOT NULL,
  "keyFieldsJson" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DuplicateCheckRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SaaSSubscriptionFeature" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "subscriptionId" UUID NOT NULL,
  "featureKey" VARCHAR(160) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "limitJson" JSONB,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaaSSubscriptionFeature_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SaaSSubscriptionFeature_org_subscription_feature_key" UNIQUE ("organizationId","subscriptionId","featureKey")
);
CREATE TABLE "SaaSInvoice" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "subscriptionId" UUID NOT NULL,
  "invoiceNo" VARCHAR(160) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  "amount" DECIMAL(18,2) NOT NULL,
  "dueDate" DATE NOT NULL,
  "postedAt" TIMESTAMPTZ(6),
  "memo" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaaSInvoice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SaaSInvoice_org_invoice_no_key" UNIQUE ("organizationId","invoiceNo"),
  CONSTRAINT "SaaSInvoice_status_check" CHECK ("status" IN ('DRAFT','POSTED','PAID','VOID')),
  CONSTRAINT "SaaSInvoice_amount_check" CHECK ("amount" > 0)
);
CREATE TABLE "TenantUsageMetric" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "metricKey" VARCHAR(120) NOT NULL,
  "metricValue" DECIMAL(18,4) NOT NULL,
  "measuredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceJson" JSONB,
  CONSTRAINT "TenantUsageMetric_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantUsageMetric_value_check" CHECK ("metricValue" >= 0)
);
CREATE TABLE "TenantStorageUsage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "bytesUsed" BIGINT NOT NULL,
  "objectCount" INTEGER NOT NULL,
  "measuredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceJson" JSONB,
  CONSTRAINT "TenantStorageUsage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantStorageUsage_value_check" CHECK ("bytesUsed" >= 0 AND "objectCount" >= 0)
);

CREATE TABLE "SearchIndexEntry" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "entityType" VARCHAR(120) NOT NULL,
  "entityId" UUID NOT NULL,
  "title" VARCHAR(300) NOT NULL,
  "subtitle" VARCHAR(500),
  "searchText" TEXT NOT NULL,
  "permissionKey" VARCHAR(160) NOT NULL,
  "routePath" VARCHAR(300),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SearchIndexEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SearchIndexEntry_org_entity_key" UNIQUE ("organizationId","entityType","entityId")
);
CREATE TABLE "CalendarFeedItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "branchId" UUID,
  "entityType" VARCHAR(120) NOT NULL,
  "entityId" UUID NOT NULL,
  "title" VARCHAR(300) NOT NULL,
  "startsAt" TIMESTAMPTZ(6) NOT NULL,
  "endsAt" TIMESTAMPTZ(6),
  "permissionKey" VARCHAR(160) NOT NULL,
  "routePath" VARCHAR(300),
  "payloadJson" JSONB,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarFeedItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CalendarFeedItem_org_entity_key" UNIQUE ("organizationId","entityType","entityId"),
  CONSTRAINT "CalendarFeedItem_range_check" CHECK ("endsAt" IS NULL OR "endsAt" >= "startsAt")
);

CREATE TABLE "IntegrationConnection" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "provider" VARCHAR(120) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'DISCONNECTED',
  "configJson" JSONB NOT NULL,
  "secretRef" VARCHAR(300),
  "createdById" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IntegrationConnection_org_provider_key" UNIQUE ("organizationId","provider"),
  CONSTRAINT "IntegrationConnection_status_check" CHECK ("status" IN ('DISCONNECTED','CONNECTED','ERROR','DISABLED'))
);
CREATE TABLE "IntegrationWebhook" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "connectionId" UUID NOT NULL,
  "eventType" VARCHAR(160) NOT NULL,
  "targetUrlHash" VARCHAR(128) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationWebhook_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IntegrationWebhook_org_connection_event_url_key" UNIQUE ("organizationId","connectionId","eventType","targetUrlHash")
);
CREATE TABLE "IntegrationWebhookDelivery" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "webhookId" UUID NOT NULL,
  "eventId" UUID,
  "status" VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMPTZ(6),
  "responseCode" INTEGER,
  "errorMessage" TEXT,
  "payloadJson" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationWebhookDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IntegrationWebhookDelivery_status_check" CHECK ("status" IN ('PENDING','DELIVERED','FAILED','RETRYING'))
);
CREATE TABLE "IntegrationSyncLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "connectionId" UUID NOT NULL,
  "direction" VARCHAR(20) NOT NULL,
  "subjectType" VARCHAR(120) NOT NULL,
  "subjectId" UUID,
  "status" VARCHAR(40) NOT NULL,
  "message" TEXT,
  "payloadJson" JSONB,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationSyncLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IntegrationSyncLog_direction_check" CHECK ("direction" IN ('INBOUND','OUTBOUND'))
);

CREATE INDEX "ImportBatch_org_subject_status_idx" ON "ImportBatch"("organizationId","subjectType","status","createdAt");
CREATE INDEX "ImportRow_org_batch_status_idx" ON "ImportRow"("organizationId","batchId","status");
CREATE INDEX "SaaSInvoice_org_subscription_status_idx" ON "SaaSInvoice"("organizationId","subscriptionId","status");
CREATE INDEX "TenantUsageMetric_org_metric_time_idx" ON "TenantUsageMetric"("organizationId","metricKey","measuredAt");
CREATE INDEX "SearchIndexEntry_org_permission_idx" ON "SearchIndexEntry"("organizationId","permissionKey");
CREATE INDEX "CalendarFeedItem_org_starts_idx" ON "CalendarFeedItem"("organizationId","startsAt");
CREATE INDEX "IntegrationWebhookDelivery_org_status_created_idx" ON "IntegrationWebhookDelivery"("organizationId","status","createdAt");

ALTER TABLE "ImportMapping" ADD CONSTRAINT "ImportMapping_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportRowError" ADD CONSTRAINT "ImportRowError_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "ImportRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DuplicateCheckRule" ADD CONSTRAINT "DuplicateCheckRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SaaSSubscriptionFeature" ADD CONSTRAINT "SaaSSubscriptionFeature_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "SaaSSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaaSInvoice" ADD CONSTRAINT "SaaSInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "SaaSSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenantUsageMetric" ADD CONSTRAINT "TenantUsageMetric_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenantStorageUsage" ADD CONSTRAINT "TenantStorageUsage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SearchIndexEntry" ADD CONSTRAINT "SearchIndexEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CalendarFeedItem" ADD CONSTRAINT "CalendarFeedItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationWebhook" ADD CONSTRAINT "IntegrationWebhook_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationWebhookDelivery" ADD CONSTRAINT "IntegrationWebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "IntegrationWebhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationSyncLog" ADD CONSTRAINT "IntegrationSyncLog_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
