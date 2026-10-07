-- NEXORA ERP Pass 16 - Enterprise Controls & Platform
-- Appendix F Phase 10: Communication Log, Custom Report Builder,
-- Scheduled Reports, Saved Views and Feature/Module Configuration hardening.

CREATE TABLE "CommunicationTemplate" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "key" VARCHAR(160) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "channel" VARCHAR(40) NOT NULL,
  "subject" VARCHAR(240),
  "body" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationTemplate_organizationId_key_key" UNIQUE ("organizationId","key"),
  CONSTRAINT "CommunicationTemplate_channel_check" CHECK ("channel" IN ('EMAIL','SMS','PORTAL','IN_APP','MANUAL'))
);

CREATE TABLE "CommunicationLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "templateId" UUID,
  "subjectType" VARCHAR(100) NOT NULL,
  "subjectId" UUID,
  "channel" VARCHAR(40) NOT NULL,
  "direction" VARCHAR(40) NOT NULL DEFAULT 'OUTBOUND',
  "recipientName" VARCHAR(240),
  "recipient" VARCHAR(320) NOT NULL,
  "subject" VARCHAR(240),
  "body" TEXT NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'QUEUED',
  "failureReason" TEXT,
  "scheduledAt" TIMESTAMPTZ(6),
  "sentAt" TIMESTAMPTZ(6),
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationLog_subject_check" CHECK ("subjectType" IN ('Customer','Vendor','Ticket','WorkOrder','Project','CustomerInvoice','SupplierInvoice','PurchaseOrder','Asset','Manual')),
  CONSTRAINT "CommunicationLog_channel_check" CHECK ("channel" IN ('EMAIL','SMS','PORTAL','IN_APP','MANUAL')),
  CONSTRAINT "CommunicationLog_direction_check" CHECK ("direction" IN ('OUTBOUND','INBOUND')),
  CONSTRAINT "CommunicationLog_status_check" CHECK ("status" IN ('DRAFT','QUEUED','SENT','DELIVERED','FAILED','CANCELLED'))
);

CREATE TABLE "EmailDeliveryLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "communicationId" UUID NOT NULL,
  "provider" VARCHAR(120),
  "providerMessageId" VARCHAR(240),
  "status" VARCHAR(40) NOT NULL DEFAULT 'QUEUED',
  "failureReason" TEXT,
  "attemptedAt" TIMESTAMPTZ(6),
  "deliveredAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailDeliveryLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailDeliveryLog_status_check" CHECK ("status" IN ('QUEUED','SENT','DELIVERED','FAILED'))
);

CREATE TABLE "SmsDeliveryLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "communicationId" UUID NOT NULL,
  "provider" VARCHAR(120),
  "providerMessageId" VARCHAR(240),
  "status" VARCHAR(40) NOT NULL DEFAULT 'QUEUED',
  "failureReason" TEXT,
  "attemptedAt" TIMESTAMPTZ(6),
  "deliveredAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SmsDeliveryLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SmsDeliveryLog_status_check" CHECK ("status" IN ('QUEUED','SENT','DELIVERED','FAILED'))
);

CREATE TABLE "MessageAttachment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "communicationId" UUID NOT NULL,
  "documentId" UUID NOT NULL,
  "fileName" VARCHAR(240),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportTemplate" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "dataSource" VARCHAR(80) NOT NULL,
  "selectedFields" JSONB NOT NULL,
  "filterJson" JSONB NOT NULL,
  "chartType" VARCHAR(40) NOT NULL DEFAULT 'TABLE',
  "permissionScope" JSONB NOT NULL,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "featureFlagId" UUID,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReportTemplate_data_source_check" CHECK ("dataSource" IN ('CUSTOMERS','VENDORS','PROJECTS','PROCUREMENT','INVENTORY','ASSETS','FIELD_SERVICE','MAINTENANCE','FINANCE_AR','FINANCE_AP','HR_EMPLOYEES','AUDIT')),
  CONSTRAINT "ReportTemplate_chart_check" CHECK ("chartType" IN ('TABLE','BAR','LINE','PIE','KPI'))
);

CREATE TABLE "SavedReport" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "templateId" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "selectedFields" JSONB NOT NULL,
  "filterJson" JSONB NOT NULL,
  "chartType" VARCHAR(40) NOT NULL DEFAULT 'TABLE',
  "permissionScope" JSONB NOT NULL,
  "ownerUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SavedReport_chart_check" CHECK ("chartType" IN ('TABLE','BAR','LINE','PIE','KPI'))
);

CREATE TABLE "ScheduledReport" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "savedReportId" UUID NOT NULL,
  "frequency" VARCHAR(40) NOT NULL,
  "timezone" VARCHAR(100) NOT NULL,
  "nextRunAt" TIMESTAMPTZ(6) NOT NULL,
  "recipientsJson" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastRunAt" TIMESTAMPTZ(6),
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScheduledReport_frequency_check" CHECK ("frequency" IN ('DAILY','WEEKLY','MONTHLY'))
);

CREATE TABLE "ReportExecution" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "savedReportId" UUID,
  "scheduledReportId" UUID,
  "requestedById" UUID,
  "status" VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  "permissionScope" JSONB NOT NULL,
  "filterJson" JSONB NOT NULL,
  "exportDocumentId" UUID,
  "startedAt" TIMESTAMPTZ(6),
  "completedAt" TIMESTAMPTZ(6),
  "failureReason" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportExecution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReportExecution_status_check" CHECK ("status" IN ('PENDING','RUNNING','COMPLETED','FAILED','CANCELLED')),
  CONSTRAINT "ReportExecution_source_check" CHECK ("savedReportId" IS NOT NULL OR "scheduledReportId" IS NOT NULL)
);

CREATE TABLE "DashboardWidget" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "userDashboardId" UUID,
  "savedReportId" UUID,
  "featureFlagId" UUID,
  "title" VARCHAR(200) NOT NULL,
  "widgetType" VARCHAR(40) NOT NULL,
  "layoutJson" JSONB NOT NULL,
  "configJson" JSONB NOT NULL,
  "permissionScope" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DashboardWidget_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DashboardWidget_type_check" CHECK ("widgetType" IN ('TABLE','BAR','LINE','PIE','KPI'))
);

CREATE TABLE "UserDashboard" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "layoutJson" JSONB NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserDashboard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedView" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "entityType" VARCHAR(100) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "columnsJson" JSONB NOT NULL,
  "filterJson" JSONB NOT NULL,
  "sortJson" JSONB,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "permissionScope" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunicationTemplate_organizationId_channel_active_idx" ON "CommunicationTemplate"("organizationId","channel","active");
CREATE INDEX "CommunicationLog_organizationId_subjectType_subjectId_createdAt_idx" ON "CommunicationLog"("organizationId","subjectType","subjectId","createdAt");
CREATE INDEX "CommunicationLog_organizationId_channel_status_createdAt_idx" ON "CommunicationLog"("organizationId","channel","status","createdAt");
CREATE INDEX "CommunicationLog_organizationId_recipient_createdAt_idx" ON "CommunicationLog"("organizationId","recipient","createdAt");
CREATE INDEX "EmailDeliveryLog_organizationId_communicationId_idx" ON "EmailDeliveryLog"("organizationId","communicationId");
CREATE INDEX "SmsDeliveryLog_organizationId_communicationId_idx" ON "SmsDeliveryLog"("organizationId","communicationId");
CREATE INDEX "MessageAttachment_organizationId_communicationId_idx" ON "MessageAttachment"("organizationId","communicationId");
CREATE INDEX "MessageAttachment_organizationId_documentId_idx" ON "MessageAttachment"("organizationId","documentId");
CREATE INDEX "ReportTemplate_organizationId_dataSource_idx" ON "ReportTemplate"("organizationId","dataSource");
CREATE INDEX "SavedReport_organizationId_ownerUserId_idx" ON "SavedReport"("organizationId","ownerUserId");
CREATE INDEX "ScheduledReport_organizationId_active_nextRunAt_idx" ON "ScheduledReport"("organizationId","active","nextRunAt");
CREATE INDEX "ReportExecution_organizationId_status_createdAt_idx" ON "ReportExecution"("organizationId","status","createdAt");
CREATE INDEX "DashboardWidget_organizationId_userDashboardId_idx" ON "DashboardWidget"("organizationId","userDashboardId");
CREATE INDEX "UserDashboard_organizationId_userId_idx" ON "UserDashboard"("organizationId","userId");
CREATE INDEX "SavedView_organizationId_userId_entityType_idx" ON "SavedView"("organizationId","userId","entityType");

ALTER TABLE "CommunicationTemplate" ADD CONSTRAINT "CommunicationTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CommunicationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "CommunicationLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SmsDeliveryLog" ADD CONSTRAINT "SmsDeliveryLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SmsDeliveryLog" ADD CONSTRAINT "SmsDeliveryLog_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "CommunicationLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "CommunicationLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "FeatureFlag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SavedReport" ADD CONSTRAINT "SavedReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SavedReport" ADD CONSTRAINT "SavedReport_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReportTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SavedReport" ADD CONSTRAINT "SavedReport_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_savedReportId_fkey" FOREIGN KEY ("savedReportId") REFERENCES "SavedReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportExecution" ADD CONSTRAINT "ReportExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportExecution" ADD CONSTRAINT "ReportExecution_savedReportId_fkey" FOREIGN KEY ("savedReportId") REFERENCES "SavedReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReportExecution" ADD CONSTRAINT "ReportExecution_scheduledReportId_fkey" FOREIGN KEY ("scheduledReportId") REFERENCES "ScheduledReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReportExecution" ADD CONSTRAINT "ReportExecution_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DashboardWidget" ADD CONSTRAINT "DashboardWidget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DashboardWidget" ADD CONSTRAINT "DashboardWidget_userDashboardId_fkey" FOREIGN KEY ("userDashboardId") REFERENCES "UserDashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DashboardWidget" ADD CONSTRAINT "DashboardWidget_savedReportId_fkey" FOREIGN KEY ("savedReportId") REFERENCES "SavedReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DashboardWidget" ADD CONSTRAINT "DashboardWidget_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "FeatureFlag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserDashboard" ADD CONSTRAINT "UserDashboard_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
