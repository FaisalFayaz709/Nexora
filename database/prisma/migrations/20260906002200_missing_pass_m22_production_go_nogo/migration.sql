-- Missing Pass M22 production Go/No-Go evidence tables.
-- These tables are tenant-scoped and append evidence for final release decisions.
CREATE TABLE IF NOT EXISTS "ProductionGoNoGoDecision" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "releaseCandidateId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "decisionReason" TEXT NOT NULL,
  "sourceArchiveChecksum" TEXT NOT NULL,
  "manifestChecksum" TEXT NOT NULL,
  "evidenceHash" TEXT NOT NULL,
  "approvedByUserId" UUID,
  "decidedAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ProductionGoNoGoGateEvidence" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "decisionId" UUID NOT NULL REFERENCES "ProductionGoNoGoDecision"("id") ON DELETE CASCADE,
  "gateId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "evidencePath" TEXT NOT NULL,
  "evidenceHash" TEXT NOT NULL,
  "notes" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ProductionGoNoGoGateEvidence_decision_gate_unique" UNIQUE ("decisionId", "gateId")
);

CREATE INDEX IF NOT EXISTS "ProductionGoNoGoDecision_org_release_idx" ON "ProductionGoNoGoDecision"("organizationId", "releaseCandidateId");
CREATE INDEX IF NOT EXISTS "ProductionGoNoGoGateEvidence_org_gate_idx" ON "ProductionGoNoGoGateEvidence"("organizationId", "gateId");
