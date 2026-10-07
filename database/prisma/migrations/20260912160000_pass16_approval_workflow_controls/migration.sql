-- PASS 16: Approval workflow controls, deterministic fraud rules and workflow rule registry.
-- Additive migration only. Critical state remains in approval/domain transactions.
CREATE TABLE IF NOT EXISTS "BusinessRule" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT,
  "branchId" uuid NULL REFERENCES "Branch"("id") ON DELETE RESTRICT,
  "triggerType" varchar(120) NOT NULL,
  "subjectType" varchar(120) NOT NULL,
  "name" varchar(200) NOT NULL,
  "description" text NULL,
  "severity" varchar(40) NOT NULL DEFAULT 'WARNING',
  "conditionJson" jsonb NOT NULL,
  "actionsJson" jsonb NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "createdById" uuid NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "createdAt" timestamptz(6) NOT NULL DEFAULT now(),
  "updatedAt" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "BusinessRule_severity_check" CHECK ("severity" IN ('INFO','WARNING','HIGH','CRITICAL')),
  CONSTRAINT "BusinessRule_condition_object_check" CHECK (jsonb_typeof("conditionJson") = 'object'),
  CONSTRAINT "BusinessRule_actions_array_check" CHECK (jsonb_typeof("actionsJson") = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessRule_organizationId_triggerType_name_key"
  ON "BusinessRule" ("organizationId", "triggerType", "name");
CREATE INDEX IF NOT EXISTS "BusinessRule_organizationId_subjectType_active_idx"
  ON "BusinessRule" ("organizationId", "subjectType", "active");
CREATE INDEX IF NOT EXISTS "BusinessRule_organizationId_branchId_triggerType_active_idx"
  ON "BusinessRule" ("organizationId", "branchId", "triggerType", "active");
CREATE INDEX IF NOT EXISTS "BusinessRule_organizationId_severity_active_idx"
  ON "BusinessRule" ("organizationId", "severity", "active");
