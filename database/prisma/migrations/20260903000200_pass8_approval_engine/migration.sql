-- NEXORA ERP Pass 8 — Approval Engine
-- Configurable, tenant-scoped approval definitions and runtime approval state.

CREATE TABLE "ApprovalDefinition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "subjectType" VARCHAR(120) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "conditionJson" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalDefinition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalDefinition_organizationId_subjectType_name_key"
    UNIQUE ("organizationId","subjectType","name")
);

CREATE TABLE "ApprovalStepDefinition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "approvalDefinitionId" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "approverType" VARCHAR(40) NOT NULL,
  "approverRef" UUID NOT NULL,
  "minApprovals" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "ApprovalStepDefinition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalStepDefinition_approvalDefinitionId_sequence_key"
    UNIQUE ("approvalDefinitionId","sequence"),
  CONSTRAINT "ApprovalStepDefinition_approver_type_check"
    CHECK ("approverType" IN ('USER','ROLE')),
  CONSTRAINT "ApprovalStepDefinition_min_approvals_check"
    CHECK ("minApprovals" > 0)
);

CREATE TABLE "ApprovalRequest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "branchId" UUID,
  "subjectType" VARCHAR(120) NOT NULL,
  "subjectId" UUID NOT NULL,
  "definitionId" UUID NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  "requestedById" UUID NOT NULL,
  "contextJson" JSONB,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(6),
  CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalRequest_status_check"
    CHECK ("status" IN ('PENDING','IN_PROGRESS','APPROVED','REJECTED','RETURNED','CANCELLED'))
);

CREATE TABLE "ApprovalStep" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "approvalRequestId" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "approverType" VARCHAR(40) NOT NULL,
  "approverRef" UUID NOT NULL,
  "minApprovals" INTEGER NOT NULL DEFAULT 1,
  "status" VARCHAR(40) NOT NULL DEFAULT 'WAITING',
  "activatedAt" TIMESTAMPTZ(6),
  "completedAt" TIMESTAMPTZ(6),
  CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalStep_approvalRequestId_sequence_key"
    UNIQUE ("approvalRequestId","sequence"),
  CONSTRAINT "ApprovalStep_approver_type_check"
    CHECK ("approverType" IN ('USER','ROLE')),
  CONSTRAINT "ApprovalStep_min_approvals_check"
    CHECK ("minApprovals" > 0),
  CONSTRAINT "ApprovalStep_status_check"
    CHECK ("status" IN ('WAITING','PENDING','APPROVED','REJECTED','RETURNED','CANCELLED'))
);

CREATE TABLE "ApprovalAction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "approvalStepId" UUID NOT NULL,
  "actorId" UUID NOT NULL,
  "action" VARCHAR(40) NOT NULL,
  "comment" TEXT,
  "actedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalAction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalAction_approvalStepId_actorId_key"
    UNIQUE ("approvalStepId","actorId"),
  CONSTRAINT "ApprovalAction_action_check"
    CHECK ("action" IN ('APPROVE','REJECT','RETURN'))
);

CREATE INDEX "ApprovalDefinition_organizationId_subjectType_active_idx"
  ON "ApprovalDefinition"("organizationId","subjectType","active");
CREATE INDEX "ApprovalStepDefinition_approvalDefinitionId_approverType_approverRef_idx"
  ON "ApprovalStepDefinition"("approvalDefinitionId","approverType","approverRef");
CREATE INDEX "ApprovalRequest_organizationId_status_createdAt_idx"
  ON "ApprovalRequest"("organizationId","status","createdAt");
CREATE INDEX "ApprovalRequest_organizationId_branchId_status_idx"
  ON "ApprovalRequest"("organizationId","branchId","status");
CREATE INDEX "ApprovalRequest_organizationId_subjectType_subjectId_status_idx"
  ON "ApprovalRequest"("organizationId","subjectType","subjectId","status");
CREATE INDEX "ApprovalRequest_requestedById_status_idx"
  ON "ApprovalRequest"("requestedById","status");
CREATE INDEX "ApprovalStep_approvalRequestId_status_sequence_idx"
  ON "ApprovalStep"("approvalRequestId","status","sequence");
CREATE INDEX "ApprovalStep_approverType_approverRef_status_idx"
  ON "ApprovalStep"("approverType","approverRef","status");
CREATE INDEX "ApprovalAction_actorId_actedAt_idx"
  ON "ApprovalAction"("actorId","actedAt");

ALTER TABLE "ApprovalDefinition" ADD CONSTRAINT "ApprovalDefinition_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalStepDefinition" ADD CONSTRAINT "ApprovalStepDefinition_approvalDefinitionId_fkey"
  FOREIGN KEY ("approvalDefinitionId") REFERENCES "ApprovalDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_definitionId_fkey"
  FOREIGN KEY ("definitionId") REFERENCES "ApprovalDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approvalRequestId_fkey"
  FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalAction" ADD CONSTRAINT "ApprovalAction_approvalStepId_fkey"
  FOREIGN KEY ("approvalStepId") REFERENCES "ApprovalStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalAction" ADD CONSTRAINT "ApprovalAction_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_approvalRequestId_fkey"
  FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_approvalRequestId_fkey"
  FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorOnboardingRequest" ADD CONSTRAINT "VendorOnboardingRequest_approvalRequestId_fkey"
  FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "PurchaseRequest_approvalRequestId_key"
  ON "PurchaseRequest"("approvalRequestId") WHERE "approvalRequestId" IS NOT NULL;
CREATE UNIQUE INDEX "StockAdjustment_approvalRequestId_key"
  ON "StockAdjustment"("approvalRequestId") WHERE "approvalRequestId" IS NOT NULL;
CREATE UNIQUE INDEX "VendorOnboardingRequest_approvalRequestId_key"
  ON "VendorOnboardingRequest"("approvalRequestId") WHERE "approvalRequestId" IS NOT NULL;

CREATE OR REPLACE FUNCTION nexora_reject_approval_action_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'ApprovalAction is immutable; approval history is append-only';
END;
$$;

CREATE TRIGGER "ApprovalAction_immutable"
BEFORE UPDATE OR DELETE ON "ApprovalAction"
FOR EACH ROW
EXECUTE FUNCTION nexora_reject_approval_action_mutation();
