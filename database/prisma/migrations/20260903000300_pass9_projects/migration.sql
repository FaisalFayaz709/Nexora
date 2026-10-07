-- NEXORA ERP Pass 9 - Projects
-- Source catalog models + implementation-support fields, no public API expansion.

CREATE TABLE "Project" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "contractId" UUID NOT NULL,
  "siteId" UUID NOT NULL,
  "projectNo" VARCHAR(160) NOT NULL,
  "name" VARCHAR(240) NOT NULL,
  "managerId" UUID NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  "startDate" DATE NOT NULL,
  "dueDate" DATE NOT NULL,
  "contractValue" DECIMAL(18,2) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Project_organizationId_projectNo_key" UNIQUE ("organizationId","projectNo"),
  CONSTRAINT "Project_status_check"
    CHECK ("status" IN ('DRAFT','PLANNED','ACTIVE','ON_HOLD','COMPLETED','HANDED_OVER','CANCELLED')),
  CONSTRAINT "Project_dates_check" CHECK ("dueDate" >= "startDate"),
  CONSTRAINT "Project_contract_value_check" CHECK ("contractValue" >= 0)
);

CREATE TABLE "ProjectPhase" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "sequence" INTEGER NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectPhase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectPhase_projectId_sequence_key" UNIQUE ("projectId","sequence"),
  CONSTRAINT "ProjectPhase_sequence_check" CHECK ("sequence" > 0),
  CONSTRAINT "ProjectPhase_status_check" CHECK ("status" IN ('NOT_STARTED','IN_PROGRESS','COMPLETED','CANCELLED'))
);

CREATE TABLE "ProjectTask" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "phaseId" UUID,
  "assigneeId" UUID,
  "title" VARCHAR(240) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
  "priority" VARCHAR(50) NOT NULL DEFAULT 'NORMAL',
  "startDate" DATE,
  "dueDate" DATE,
  "completionPct" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectTask_status_check" CHECK ("status" IN ('NOT_STARTED','IN_PROGRESS','BLOCKED','COMPLETED','CANCELLED')),
  CONSTRAINT "ProjectTask_completion_check" CHECK ("completionPct" >= 0 AND "completionPct" <= 100),
  CONSTRAINT "ProjectTask_dates_check" CHECK ("startDate" IS NULL OR "dueDate" IS NULL OR "dueDate" >= "startDate")
);

CREATE TABLE "ProjectTaskDependency" (
  "taskId" UUID NOT NULL,
  "dependsOnTaskId" UUID NOT NULL,
  "type" VARCHAR(50) NOT NULL DEFAULT 'FINISH_TO_START',
  CONSTRAINT "ProjectTaskDependency_pkey" PRIMARY KEY ("taskId","dependsOnTaskId"),
  CONSTRAINT "ProjectTaskDependency_not_self_check" CHECK ("taskId" <> "dependsOnTaskId")
);

CREATE TABLE "ProjectMilestone" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "name" VARCHAR(240) NOT NULL,
  "dueDate" DATE,
  "achievedAt" TIMESTAMPTZ(6),
  "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectMilestone_status_check" CHECK ("status" IN ('PENDING','ACHIEVED','CANCELLED'))
);

CREATE TABLE "ProjectMember" (
  "projectId" UUID NOT NULL,
  "employeeId" UUID NOT NULL,
  "role" VARCHAR(120) NOT NULL,
  "allocationPct" DECIMAL(5,2) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("projectId","employeeId"),
  CONSTRAINT "ProjectMember_allocation_check" CHECK ("allocationPct" >= 0 AND "allocationPct" <= 100)
);

CREATE TABLE "BillOfMaterials" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillOfMaterials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillOfMaterials_projectId_version_key" UNIQUE ("projectId","version"),
  CONSTRAINT "BillOfMaterials_version_check" CHECK ("version" > 0),
  CONSTRAINT "BillOfMaterials_status_check" CHECK ("status" IN ('DRAFT','APPROVED','SUPERSEDED'))
);

CREATE TABLE "BOMItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "billOfMaterialsId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "requiredQty" DECIMAL(18,4) NOT NULL,
  "reservedQty" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "issuedQty" DECIMAL(18,4) NOT NULL DEFAULT 0,
  CONSTRAINT "BOMItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BOMItem_billOfMaterialsId_productId_key" UNIQUE ("billOfMaterialsId","productId"),
  CONSTRAINT "BOMItem_qty_check" CHECK ("requiredQty" > 0 AND "reservedQty" >= 0 AND "issuedQty" >= 0 AND "reservedQty" + "issuedQty" <= "requiredQty")
);

CREATE TABLE "ProjectBudget" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  "totalBudget" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectBudget_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectBudget_projectId_version_key" UNIQUE ("projectId","version"),
  CONSTRAINT "ProjectBudget_total_check" CHECK ("totalBudget" >= 0),
  CONSTRAINT "ProjectBudget_status_check" CHECK ("status" IN ('DRAFT','APPROVED','SUPERSEDED'))
);

CREATE TABLE "ProjectBudgetLine" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectBudgetId" UUID NOT NULL,
  "category" VARCHAR(120) NOT NULL,
  "budgetAmount" DECIMAL(18,2) NOT NULL,
  "committedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "actualAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  CONSTRAINT "ProjectBudgetLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectBudgetLine_projectBudgetId_category_key" UNIQUE ("projectBudgetId","category"),
  CONSTRAINT "ProjectBudgetLine_amount_check" CHECK ("budgetAmount" >= 0 AND "committedAmount" >= 0 AND "actualAmount" >= 0)
);

CREATE TABLE "ProjectExpense" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "expenseId" UUID NOT NULL,
  "costCategory" VARCHAR(120) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectExpense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectExpense_projectId_expenseId_key" UNIQUE ("projectId","expenseId")
);

CREATE TABLE "ProjectRisk" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "probability" DECIMAL(5,2) NOT NULL,
  "impact" VARCHAR(80) NOT NULL,
  "ownerId" UUID,
  "status" VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectRisk_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectRisk_probability_check" CHECK ("probability" >= 0 AND "probability" <= 100),
  CONSTRAINT "ProjectRisk_status_check" CHECK ("status" IN ('OPEN','MITIGATED','CLOSED'))
);

CREATE TABLE "ProjectIssue" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "severity" VARCHAR(80) NOT NULL,
  "ownerId" UUID,
  "status" VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectIssue_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectIssue_status_check" CHECK ("status" IN ('OPEN','IN_PROGRESS','RESOLVED','CLOSED'))
);

CREATE TABLE "ProjectHandover" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "acceptedByCustomerId" UUID NOT NULL,
  "acceptedAt" TIMESTAMPTZ(6) NOT NULL,
  "documentId" UUID,
  "status" VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectHandover_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectHandover_status_check" CHECK ("status" = 'COMPLETED')
);

CREATE INDEX "Project_organizationId_customerId_status_idx" ON "Project"("organizationId","customerId","status");
CREATE INDEX "Project_organizationId_managerId_status_idx" ON "Project"("organizationId","managerId","status");
CREATE INDEX "Project_organizationId_siteId_idx" ON "Project"("organizationId","siteId");
CREATE INDEX "Project_organizationId_contractId_idx" ON "Project"("organizationId","contractId");
CREATE INDEX "ProjectTask_projectId_status_dueDate_idx" ON "ProjectTask"("projectId","status","dueDate");
CREATE INDEX "ProjectTask_assigneeId_status_idx" ON "ProjectTask"("assigneeId","status");
CREATE INDEX "ProjectTaskDependency_dependsOnTaskId_idx" ON "ProjectTaskDependency"("dependsOnTaskId");
CREATE INDEX "ProjectMilestone_projectId_status_dueDate_idx" ON "ProjectMilestone"("projectId","status","dueDate");
CREATE INDEX "ProjectMember_employeeId_idx" ON "ProjectMember"("employeeId");
CREATE INDEX "BillOfMaterials_projectId_status_idx" ON "BillOfMaterials"("projectId","status");
CREATE INDEX "BOMItem_productId_idx" ON "BOMItem"("productId");
CREATE INDEX "ProjectBudget_projectId_status_idx" ON "ProjectBudget"("projectId","status");
CREATE INDEX "ProjectExpense_expenseId_idx" ON "ProjectExpense"("expenseId");
CREATE INDEX "ProjectRisk_projectId_status_idx" ON "ProjectRisk"("projectId","status");
CREATE INDEX "ProjectRisk_ownerId_status_idx" ON "ProjectRisk"("ownerId","status");
CREATE INDEX "ProjectIssue_projectId_status_idx" ON "ProjectIssue"("projectId","status");
CREATE INDEX "ProjectIssue_ownerId_status_idx" ON "ProjectIssue"("ownerId","status");
CREATE INDEX "ProjectHandover_projectId_acceptedAt_idx" ON "ProjectHandover"("projectId","acceptedAt");

ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CustomerSite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectPhase" ADD CONSTRAINT "ProjectPhase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "ProjectPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectTaskDependency" ADD CONSTRAINT "ProjectTaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTaskDependency" ADD CONSTRAINT "ProjectTaskDependency_dependsOnTaskId_fkey" FOREIGN KEY ("dependsOnTaskId") REFERENCES "ProjectTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillOfMaterials" ADD CONSTRAINT "BillOfMaterials_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BOMItem" ADD CONSTRAINT "BOMItem_billOfMaterialsId_fkey" FOREIGN KEY ("billOfMaterialsId") REFERENCES "BillOfMaterials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BOMItem" ADD CONSTRAINT "BOMItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectBudget" ADD CONSTRAINT "ProjectBudget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectBudgetLine" ADD CONSTRAINT "ProjectBudgetLine_projectBudgetId_fkey" FOREIGN KEY ("projectBudgetId") REFERENCES "ProjectBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectExpense" ADD CONSTRAINT "ProjectExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectIssue" ADD CONSTRAINT "ProjectIssue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectIssue" ADD CONSTRAINT "ProjectIssue_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_acceptedByCustomerId_fkey" FOREIGN KEY ("acceptedByCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Resolve deferred project foreign keys from earlier passes now that Project exists.
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contract, Expense and Document foreign keys remain intentionally deferred to their owning passes.
