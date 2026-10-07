-- NEXORA ERP Pass 11 - Field Service
-- Core Helpdesk/WorkOrder catalog + Appendix F technician visit/GPS entities.
-- GPS coordinates use NUMERIC, never Float.

CREATE TABLE "SlaPolicy" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL, "priority" VARCHAR(40) NOT NULL,
  "responseMinutes" INTEGER NOT NULL, "resolutionMinutes" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SlaPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SlaPolicy_organizationId_priority_key" UNIQUE ("organizationId","priority"),
  CONSTRAINT "SlaPolicy_priority_check" CHECK ("priority" IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  CONSTRAINT "SlaPolicy_minutes_check" CHECK ("responseMinutes" > 0 AND "resolutionMinutes" > 0)
);

CREATE TABLE "Ticket" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "branchId" UUID,
  "ticketNo" VARCHAR(160) NOT NULL, "customerId" UUID NOT NULL, "siteId" UUID NOT NULL, "assetId" UUID NOT NULL,
  "category" VARCHAR(80) NOT NULL, "priority" VARCHAR(40) NOT NULL, "subject" VARCHAR(240) NOT NULL,
  "description" TEXT NOT NULL, "status" VARCHAR(50) NOT NULL DEFAULT 'OPEN', "openedById" UUID NOT NULL,
  "assignedToId" UUID, "slaPolicyId" UUID NOT NULL, "responseDueAt" TIMESTAMPTZ(6) NOT NULL,
  "resolutionDueAt" TIMESTAMPTZ(6) NOT NULL, "firstRespondedAt" TIMESTAMPTZ(6), "resolvedAt" TIMESTAMPTZ(6),
  "closedAt" TIMESTAMPTZ(6), "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Ticket_organizationId_ticketNo_key" UNIQUE ("organizationId","ticketNo"),
  CONSTRAINT "Ticket_category_check" CHECK ("category" IN ('TECHNICAL_ISSUE','INSTALLATION_ISSUE','MAINTENANCE_REQUEST','WARRANTY_CLAIM','BILLING_ISSUE','NETWORK_PROBLEM','EQUIPMENT_FAILURE','GENERAL_REQUEST')),
  CONSTRAINT "Ticket_priority_check" CHECK ("priority" IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  CONSTRAINT "Ticket_status_check" CHECK ("status" IN ('OPEN','ASSIGNED','IN_PROGRESS','WAITING_CUSTOMER','WAITING_VENDOR','RESOLVED','CLOSED','CANCELLED')),
  CONSTRAINT "Ticket_sla_due_check" CHECK ("resolutionDueAt" >= "responseDueAt")
);

CREATE TABLE "TicketComment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "ticketId" UUID NOT NULL,
  "authorId" UUID NOT NULL, "visibility" VARCHAR(40) NOT NULL DEFAULT 'INTERNAL', "body" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketComment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TicketComment_visibility_check" CHECK ("visibility" IN ('INTERNAL','CUSTOMER'))
);

CREATE TABLE "WorkOrder" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "branchId" UUID,
  "workOrderNo" VARCHAR(160) NOT NULL, "ticketId" UUID, "assetId" UUID NOT NULL, "projectId" UUID,
  "status" VARCHAR(50) NOT NULL DEFAULT 'NEW', "scheduledAt" TIMESTAMPTZ(6), "priority" VARCHAR(40) NOT NULL,
  "closedAt" TIMESTAMPTZ(6), "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkOrder_organizationId_workOrderNo_key" UNIQUE ("organizationId","workOrderNo"),
  CONSTRAINT "WorkOrder_priority_check" CHECK ("priority" IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  CONSTRAINT "WorkOrder_status_check" CHECK ("status" IN ('NEW','VALIDATED','ASSIGNED','TECHNICIAN_ACCEPTED','TRAVELLING','ON_SITE','DIAGNOSIS','WORK_IN_PROGRESS','WAITING_FOR_PART','RESOLVED','CUSTOMER_CONFIRMATION','CLOSED','CANCELLED'))
);

CREATE TABLE "WorkOrderAssignment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "workOrderId" UUID NOT NULL,
  "technicianId" UUID NOT NULL, "assignedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMPTZ(6), "unassignedAt" TIMESTAMPTZ(6),
  CONSTRAINT "WorkOrderAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TechnicianProfile" (
  "employeeId" UUID NOT NULL, "organizationId" UUID NOT NULL,
  "availabilityStatus" VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE', "homeBranchId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TechnicianProfile_pkey" PRIMARY KEY ("employeeId"),
  CONSTRAINT "TechnicianProfile_availability_check" CHECK ("availabilityStatus" IN ('AVAILABLE','ASSIGNED','ON_SITE','ON_LEAVE','OFF_DUTY'))
);

CREATE TABLE "ServiceReport" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "workOrderId" UUID NOT NULL,
  "technicianId" UUID NOT NULL, "arrivalAt" TIMESTAMPTZ(6) NOT NULL, "departureAt" TIMESTAMPTZ(6) NOT NULL,
  "workPerformed" TEXT NOT NULL, "rootCause" TEXT NOT NULL, "resolution" TEXT NOT NULL,
  "beforePhotoDocumentId" UUID, "afterPhotoDocumentId" UUID, "customerSignDocumentId" UUID, "technicianSignDocumentId" UUID,
  "status" VARCHAR(40) NOT NULL DEFAULT 'DRAFT', "finalizedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceReport_dates_check" CHECK ("departureAt" >= "arrivalAt"),
  CONSTRAINT "ServiceReport_status_check" CHECK ("status" IN ('DRAFT','FINAL'))
);

CREATE TABLE "ServiceReportPart" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "serviceReportId" UUID NOT NULL,
  "productId" UUID NOT NULL, "qty" DECIMAL(18,4) NOT NULL, "sourceWarehouseId" UUID NOT NULL,
  "sourceLocationId" UUID, "batchAllocationsJson" JSONB, "stockTransactionId" UUID,
  CONSTRAINT "ServiceReportPart_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceReportPart_stockTransactionId_key" UNIQUE ("stockTransactionId"),
  CONSTRAINT "ServiceReportPart_qty_check" CHECK ("qty" > 0)
);

CREATE TABLE "ServiceVisit" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "branchId" UUID,
  "workOrderId" UUID NOT NULL, "technicianId" UUID NOT NULL, "checkedInAt" TIMESTAMPTZ(6) NOT NULL,
  "checkedOutAt" TIMESTAMPTZ(6), "completionVerifiedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceVisit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceVisit_time_check" CHECK ("checkedOutAt" IS NULL OR "checkedOutAt" >= "checkedInAt")
);

CREATE TABLE "ServiceVisitLocation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "serviceVisitId" UUID NOT NULL,
  "kind" VARCHAR(40) NOT NULL, "latitude" DECIMAL(9,6), "longitude" DECIMAL(9,6), "accuracyMeters" DECIMAL(10,2),
  "photoDocumentId" UUID, "capturedAt" TIMESTAMPTZ(6) NOT NULL, "retainUntil" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ServiceVisitLocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceVisitLocation_kind_check" CHECK ("kind" IN ('CHECK_IN','CHECK_OUT')),
  CONSTRAINT "ServiceVisitLocation_pair_check" CHECK (("latitude" IS NULL AND "longitude" IS NULL) OR ("latitude" IS NOT NULL AND "longitude" IS NOT NULL)),
  CONSTRAINT "ServiceVisitLocation_lat_check" CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90)),
  CONSTRAINT "ServiceVisitLocation_lon_check" CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180)),
  CONSTRAINT "ServiceVisitLocation_accuracy_check" CHECK ("accuracyMeters" IS NULL OR "accuracyMeters" >= 0)
);

CREATE TABLE "TechnicianLocationPing" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "branchId" UUID,
  "technicianId" UUID NOT NULL, "workOrderId" UUID NOT NULL, "serviceVisitId" UUID NOT NULL,
  "latitude" DECIMAL(9,6) NOT NULL, "longitude" DECIMAL(9,6) NOT NULL, "accuracyMeters" DECIMAL(10,2),
  "capturedAt" TIMESTAMPTZ(6) NOT NULL, "retainUntil" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "TechnicianLocationPing_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TechnicianLocationPing_lat_check" CHECK ("latitude" >= -90 AND "latitude" <= 90),
  CONSTRAINT "TechnicianLocationPing_lon_check" CHECK ("longitude" >= -180 AND "longitude" <= 180),
  CONSTRAINT "TechnicianLocationPing_accuracy_check" CHECK ("accuracyMeters" IS NULL OR "accuracyMeters" >= 0)
);

CREATE TABLE "TechnicianRoute" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "branchId" UUID,
  "workOrderId" UUID NOT NULL, "technicianId" UUID NOT NULL, "startedAt" TIMESTAMPTZ(6) NOT NULL,
  "endedAt" TIMESTAMPTZ(6), "status" VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TechnicianRoute_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TechnicianRoute_status_check" CHECK ("status" IN ('ACTIVE','COMPLETED')),
  CONSTRAINT "TechnicianRoute_time_check" CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt")
);

CREATE TABLE "WorkOrderCheckIn" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "branchId" UUID,
  "workOrderId" UUID NOT NULL, "serviceVisitId" UUID NOT NULL, "technicianId" UUID NOT NULL,
  "locationProofId" UUID, "photoDocumentId" UUID, "checkedInAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "WorkOrderCheckIn_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkOrderCheckIn_serviceVisitId_key" UNIQUE ("serviceVisitId"),
  CONSTRAINT "WorkOrderCheckIn_locationProofId_key" UNIQUE ("locationProofId")
);

CREATE TABLE "WorkOrderCheckOut" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "branchId" UUID,
  "workOrderId" UUID NOT NULL, "serviceVisitId" UUID NOT NULL, "technicianId" UUID NOT NULL,
  "locationProofId" UUID, "photoDocumentId" UUID, "customerSignDocumentId" UUID, "checkedOutAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "WorkOrderCheckOut_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkOrderCheckOut_serviceVisitId_key" UNIQUE ("serviceVisitId"),
  CONSTRAINT "WorkOrderCheckOut_locationProofId_key" UNIQUE ("locationProofId")
);

CREATE INDEX "Ticket_organizationId_branchId_status_priority_idx" ON "Ticket"("organizationId","branchId","status","priority");
CREATE INDEX "Ticket_organizationId_customerId_status_idx" ON "Ticket"("organizationId","customerId","status");
CREATE INDEX "Ticket_organizationId_siteId_status_idx" ON "Ticket"("organizationId","siteId","status");
CREATE INDEX "Ticket_organizationId_assetId_status_idx" ON "Ticket"("organizationId","assetId","status");
CREATE INDEX "Ticket_organizationId_assignedToId_status_idx" ON "Ticket"("organizationId","assignedToId","status");
CREATE INDEX "Ticket_organizationId_responseDueAt_status_idx" ON "Ticket"("organizationId","responseDueAt","status");
CREATE INDEX "Ticket_organizationId_resolutionDueAt_status_idx" ON "Ticket"("organizationId","resolutionDueAt","status");
CREATE INDEX "WorkOrder_organizationId_branchId_status_priority_idx" ON "WorkOrder"("organizationId","branchId","status","priority");
CREATE INDEX "WorkOrder_organizationId_ticketId_status_idx" ON "WorkOrder"("organizationId","ticketId","status");
CREATE INDEX "WorkOrder_organizationId_assetId_status_idx" ON "WorkOrder"("organizationId","assetId","status");
CREATE INDEX "WorkOrderAssignment_organizationId_technicianId_unassignedAt_assignedAt_idx" ON "WorkOrderAssignment"("organizationId","technicianId","unassignedAt","assignedAt");
CREATE INDEX "TechnicianProfile_organizationId_homeBranchId_availabilityStatus_idx" ON "TechnicianProfile"("organizationId","homeBranchId","availabilityStatus");
CREATE INDEX "ServiceReport_organizationId_workOrderId_status_createdAt_idx" ON "ServiceReport"("organizationId","workOrderId","status","createdAt");
CREATE INDEX "ServiceReportPart_organizationId_serviceReportId_idx" ON "ServiceReportPart"("organizationId","serviceReportId");
CREATE INDEX "ServiceVisit_organizationId_branchId_workOrderId_checkedOutAt_idx" ON "ServiceVisit"("organizationId","branchId","workOrderId","checkedOutAt");
CREATE INDEX "ServiceVisitLocation_organizationId_retainUntil_idx" ON "ServiceVisitLocation"("organizationId","retainUntil");
CREATE INDEX "TechnicianLocationPing_organizationId_retainUntil_idx" ON "TechnicianLocationPing"("organizationId","retainUntil");
CREATE INDEX "TechnicianRoute_organizationId_technicianId_status_startedAt_idx" ON "TechnicianRoute"("organizationId","technicianId","status","startedAt");

ALTER TABLE "SlaPolicy" ADD CONSTRAINT "SlaPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CustomerSite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_slaPolicyId_fkey" FOREIGN KEY ("slaPolicyId") REFERENCES "SlaPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrderAssignment" ADD CONSTRAINT "WorkOrderAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrderAssignment" ADD CONSTRAINT "WorkOrderAssignment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkOrderAssignment" ADD CONSTRAINT "WorkOrderAssignment_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TechnicianProfile" ADD CONSTRAINT "TechnicianProfile_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TechnicianProfile" ADD CONSTRAINT "TechnicianProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TechnicianProfile" ADD CONSTRAINT "TechnicianProfile_homeBranchId_fkey" FOREIGN KEY ("homeBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceReport" ADD CONSTRAINT "ServiceReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceReport" ADD CONSTRAINT "ServiceReport_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceReport" ADD CONSTRAINT "ServiceReport_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceReportPart" ADD CONSTRAINT "ServiceReportPart_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceReportPart" ADD CONSTRAINT "ServiceReportPart_serviceReportId_fkey" FOREIGN KEY ("serviceReportId") REFERENCES "ServiceReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceReportPart" ADD CONSTRAINT "ServiceReportPart_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceReportPart" ADD CONSTRAINT "ServiceReportPart_sourceWarehouseId_fkey" FOREIGN KEY ("sourceWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceReportPart" ADD CONSTRAINT "ServiceReportPart_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "WarehouseLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceReportPart" ADD CONSTRAINT "ServiceReportPart_stockTransactionId_fkey" FOREIGN KEY ("stockTransactionId") REFERENCES "StockTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceVisitLocation" ADD CONSTRAINT "ServiceVisitLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceVisitLocation" ADD CONSTRAINT "ServiceVisitLocation_serviceVisitId_fkey" FOREIGN KEY ("serviceVisitId") REFERENCES "ServiceVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TechnicianLocationPing" ADD CONSTRAINT "TechnicianLocationPing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TechnicianLocationPing" ADD CONSTRAINT "TechnicianLocationPing_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TechnicianLocationPing" ADD CONSTRAINT "TechnicianLocationPing_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TechnicianLocationPing" ADD CONSTRAINT "TechnicianLocationPing_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TechnicianLocationPing" ADD CONSTRAINT "TechnicianLocationPing_serviceVisitId_fkey" FOREIGN KEY ("serviceVisitId") REFERENCES "ServiceVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TechnicianRoute" ADD CONSTRAINT "TechnicianRoute_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TechnicianRoute" ADD CONSTRAINT "TechnicianRoute_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TechnicianRoute" ADD CONSTRAINT "TechnicianRoute_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TechnicianRoute" ADD CONSTRAINT "TechnicianRoute_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrderCheckIn" ADD CONSTRAINT "WorkOrderCheckIn_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrderCheckIn" ADD CONSTRAINT "WorkOrderCheckIn_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrderCheckIn" ADD CONSTRAINT "WorkOrderCheckIn_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkOrderCheckIn" ADD CONSTRAINT "WorkOrderCheckIn_serviceVisitId_fkey" FOREIGN KEY ("serviceVisitId") REFERENCES "ServiceVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkOrderCheckIn" ADD CONSTRAINT "WorkOrderCheckIn_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrderCheckIn" ADD CONSTRAINT "WorkOrderCheckIn_locationProofId_fkey" FOREIGN KEY ("locationProofId") REFERENCES "ServiceVisitLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkOrderCheckOut" ADD CONSTRAINT "WorkOrderCheckOut_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrderCheckOut" ADD CONSTRAINT "WorkOrderCheckOut_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrderCheckOut" ADD CONSTRAINT "WorkOrderCheckOut_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkOrderCheckOut" ADD CONSTRAINT "WorkOrderCheckOut_serviceVisitId_fkey" FOREIGN KEY ("serviceVisitId") REFERENCES "ServiceVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkOrderCheckOut" ADD CONSTRAINT "WorkOrderCheckOut_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrderCheckOut" ADD CONSTRAINT "WorkOrderCheckOut_locationProofId_fkey" FOREIGN KEY ("locationProofId") REFERENCES "ServiceVisitLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
