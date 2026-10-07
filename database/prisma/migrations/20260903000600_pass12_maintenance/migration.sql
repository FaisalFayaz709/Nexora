-- NEXORA ERP Pass 12 - Maintenance
-- Source Maintenance entity catalog + one documented support model for checklist items.

CREATE TABLE "MaintenanceChecklist" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "version" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceChecklist_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MaintenanceChecklist_organizationId_name_version_key" UNIQUE ("organizationId","name","version"),
  CONSTRAINT "MaintenanceChecklist_version_check" CHECK ("version" > 0)
);

CREATE TABLE "MaintenanceChecklistItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "checklistId" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "label" VARCHAR(500) NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "MaintenanceChecklistItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MaintenanceChecklistItem_checklistId_sequence_key" UNIQUE ("checklistId","sequence"),
  CONSTRAINT "MaintenanceChecklistItem_sequence_check" CHECK ("sequence" > 0)
);

CREATE TABLE "MaintenancePlan" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "branchId" UUID,
  "assetId" UUID NOT NULL,
  "contractId" UUID,
  "checklistId" UUID,
  "name" VARCHAR(200) NOT NULL,
  "frequencyType" VARCHAR(40) NOT NULL,
  "intervalValue" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenancePlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MaintenancePlan_frequency_check" CHECK ("frequencyType" IN ('DAYS','WEEKS','MONTHS','YEARS')),
  CONSTRAINT "MaintenancePlan_interval_check" CHECK ("intervalValue" > 0)
);

CREATE TABLE "MaintenanceSchedule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "maintenancePlanId" UUID NOT NULL,
  "dueAt" TIMESTAMPTZ(6) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'SCHEDULED',
  "generatedWorkOrderId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceSchedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MaintenanceSchedule_generatedWorkOrderId_key" UNIQUE ("generatedWorkOrderId"),
  CONSTRAINT "MaintenanceSchedule_status_check" CHECK ("status" IN ('SCHEDULED','DUE','GENERATED','COMPLETED','SKIPPED','CANCELLED'))
);

CREATE TABLE "MaintenanceExecution" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "scheduleId" UUID NOT NULL,
  "workOrderId" UUID NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'IN_PROGRESS',
  "completedAt" TIMESTAMPTZ(6),
  "result" VARCHAR(80),
  "nextDueAt" TIMESTAMPTZ(6),
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceExecution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MaintenanceExecution_status_check" CHECK ("status" IN ('PENDING','IN_PROGRESS','COMPLETED','CANCELLED')),
  CONSTRAINT "MaintenanceExecution_result_check" CHECK ("result" IS NULL OR "result" IN ('PASSED','REPAIRED','FAILED','REPLACED')),
  CONSTRAINT "MaintenanceExecution_complete_check" CHECK (("status" <> 'COMPLETED') OR ("completedAt" IS NOT NULL AND "result" IS NOT NULL AND "nextDueAt" IS NOT NULL))
);

CREATE TABLE "MaintenancePart" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "maintenanceExecutionId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "qty" DECIMAL(18,4) NOT NULL,
  "sourceWarehouseId" UUID NOT NULL,
  "sourceLocationId" UUID,
  "batchAllocationsJson" JSONB,
  "stockTransactionId" UUID,
  CONSTRAINT "MaintenancePart_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MaintenancePart_stockTransactionId_key" UNIQUE ("stockTransactionId"),
  CONSTRAINT "MaintenancePart_qty_check" CHECK ("qty" > 0)
);

CREATE INDEX "MaintenanceChecklist_organizationId_active_idx" ON "MaintenanceChecklist"("organizationId","active");
CREATE INDEX "MaintenancePlan_organizationId_branchId_active_idx" ON "MaintenancePlan"("organizationId","branchId","active");
CREATE INDEX "MaintenancePlan_organizationId_assetId_active_idx" ON "MaintenancePlan"("organizationId","assetId","active");
CREATE INDEX "MaintenancePlan_organizationId_contractId_active_idx" ON "MaintenancePlan"("organizationId","contractId","active");
CREATE INDEX "MaintenanceSchedule_maintenancePlanId_dueAt_status_idx" ON "MaintenanceSchedule"("maintenancePlanId","dueAt","status");
CREATE INDEX "MaintenanceSchedule_dueAt_status_idx" ON "MaintenanceSchedule"("dueAt","status");
CREATE INDEX "MaintenanceExecution_scheduleId_status_idx" ON "MaintenanceExecution"("scheduleId","status");
CREATE INDEX "MaintenanceExecution_workOrderId_status_idx" ON "MaintenanceExecution"("workOrderId","status");
CREATE INDEX "MaintenanceExecution_completedAt_idx" ON "MaintenanceExecution"("completedAt");
CREATE INDEX "MaintenancePart_maintenanceExecutionId_idx" ON "MaintenancePart"("maintenanceExecutionId");
CREATE INDEX "MaintenancePart_productId_idx" ON "MaintenancePart"("productId");
CREATE INDEX "MaintenancePart_sourceWarehouseId_productId_idx" ON "MaintenancePart"("sourceWarehouseId","productId");

ALTER TABLE "MaintenanceChecklist" ADD CONSTRAINT "MaintenanceChecklist_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceChecklistItem" ADD CONSTRAINT "MaintenanceChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "MaintenanceChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "MaintenanceChecklist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceSchedule" ADD CONSTRAINT "MaintenanceSchedule_maintenancePlanId_fkey" FOREIGN KEY ("maintenancePlanId") REFERENCES "MaintenancePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceSchedule" ADD CONSTRAINT "MaintenanceSchedule_generatedWorkOrderId_fkey" FOREIGN KEY ("generatedWorkOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceExecution" ADD CONSTRAINT "MaintenanceExecution_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "MaintenanceSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceExecution" ADD CONSTRAINT "MaintenanceExecution_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenancePart" ADD CONSTRAINT "MaintenancePart_maintenanceExecutionId_fkey" FOREIGN KEY ("maintenanceExecutionId") REFERENCES "MaintenanceExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenancePart" ADD CONSTRAINT "MaintenancePart_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenancePart" ADD CONSTRAINT "MaintenancePart_sourceWarehouseId_fkey" FOREIGN KEY ("sourceWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenancePart" ADD CONSTRAINT "MaintenancePart_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "WarehouseLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenancePart" ADD CONSTRAINT "MaintenancePart_stockTransactionId_fkey" FOREIGN KEY ("stockTransactionId") REFERENCES "StockTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- contractId remains a deferred physical FK until Contract owner is implemented.
