import { z } from 'zod';
import { NonEmptyStringSchema } from '../common';

export const MISSING_PASS_M22_SOURCE_PREFLIGHT_PRODUCTION_GO_NOGO_FINAL =
  'MISSING_PASS_M22_SOURCE_PREFLIGHT_PRODUCTION_GO_NOGO_FINAL' as const;

export const M22ProductionDecisionSchema = z.enum(['GO', 'NO_GO', 'HOLD']);
export type M22ProductionDecision = z.infer<typeof M22ProductionDecisionSchema>;

export const M22EvidenceStatusSchema = z.enum(['NOT_STARTED', 'PASSED', 'FAILED', 'BLOCKED', 'WAIVED_WITH_APPROVAL']);
export type M22EvidenceStatus = z.infer<typeof M22EvidenceStatusSchema>;

export const M22ProductionGateIds = [
  'M22-LOCKED-SPEC-ARCHITECTURE-STACK-BASELINE',
  'M22-M0-M21-SOURCE-EVIDENCE-CASCADE',
  'M22-DEPENDENCY-LOCKFILE-FROZEN-INSTALL',
  'M22-DATABASE-MIGRATION-SEED-ROLLBACK',
  'M22-CONTAINER-RUNTIME-HEALTH-READINESS',
  'M22-FULL-LIFECYCLE-E2E-ZERO-FAIL-SKIP',
  'M22-SECURITY-ABUSE-MAKER-CHECKER-COMPLETE',
  'M22-PERFORMANCE-BACKUP-OBSERVABILITY-DR-COMPLETE',
  'M22-DOCUMENTED-RISKS-OWNER-APPROVALS',
  'M22-POST-DEPLOYMENT-SMOKE-ROLLBACK-WINDOW',
  'M22-FINAL-PRODUCTION-GO-NOGO-DECISION',
] as const;
export type M22ProductionGateId = (typeof M22ProductionGateIds)[number];

export const M22ProductionDomains = [
  'LOCKED_SPEC_STACK_ARCHITECTURE',
  'SOURCE_AND_DEPENDENCY_REPRODUCIBILITY',
  'DATABASE_MIGRATION_SEED_ROLLBACK',
  'CONTAINER_RUNTIME_HEALTH_READINESS',
  'FULL_LIFECYCLE_RUNTIME_E2E',
  'SECURITY_ABUSE_MAKER_CHECKER',
  'PERFORMANCE_BACKUP_OBSERVABILITY_DR',
  'RELEASE_EVIDENCE_BINDER',
  'OWNER_APPROVAL_AND_RISK_ACCEPTANCE',
  'CUTOVER_POST_DEPLOYMENT_VALIDATION',
  'FINAL_GO_NOGO_DECISION',
] as const;
export type M22ProductionDomain = (typeof M22ProductionDomains)[number];

export const M22ProductionGateSchema = z.object({
  gateId: z.enum(M22ProductionGateIds),
  domain: z.enum(M22ProductionDomains),
  title: NonEmptyStringSchema,
  requiredEvidence: z.array(NonEmptyStringSchema).min(1),
  blockingConditions: z.array(NonEmptyStringSchema).min(1),
  requiredCommands: z.array(NonEmptyStringSchema).min(1),
  runtimeRequired: z.literal(true),
  blocksProduction: z.literal(true),
});
export type M22ProductionGate = z.infer<typeof M22ProductionGateSchema>;

export const M22GateEvidenceSchema = z.object({
  gateId: z.enum(M22ProductionGateIds),
  status: M22EvidenceStatusSchema,
  evidenceFiles: z.array(NonEmptyStringSchema),
  evidenceHash: NonEmptyStringSchema.optional(),
  approvedBy: NonEmptyStringSchema.optional(),
  notes: z.array(NonEmptyStringSchema),
});
export type M22GateEvidence = z.infer<typeof M22GateEvidenceSchema>;

export const M22RuntimeEvidenceSummarySchema = z.object({
  pnpmLockfilePresent: z.boolean(),
  frozenInstallPassed: z.boolean(),
  staticGatesPassed: z.boolean(),
  migrationsPassed: z.boolean(),
  seedPassed: z.boolean(),
  dockerRuntimePassed: z.boolean(),
  fullLifecycleE2ePassed: z.boolean(),
  securitySmokePassed: z.boolean(),
  makerCheckerPassed: z.boolean(),
  performanceSloPassed: z.boolean(),
  backupRestorePassed: z.boolean(),
  observabilityPassed: z.boolean(),
  postDeploymentSmokePassed: z.boolean(),
  rollbackWindowPrepared: z.boolean(),
  failedCriticalScenarios: z.number().int().nonnegative(),
  skippedCriticalScenarios: z.number().int().nonnegative(),
  unresolvedCriticalDefects: z.number().int().nonnegative(),
  unresolvedHighRisksWithoutApproval: z.number().int().nonnegative(),
});
export type M22RuntimeEvidenceSummary = z.infer<typeof M22RuntimeEvidenceSummarySchema>;

export const M22ApprovalChainSchema = z.object({
  productOwnerApproval: z.boolean(),
  engineeringOwnerApproval: z.boolean(),
  securityOwnerApproval: z.boolean(),
  operationsOwnerApproval: z.boolean(),
  rollbackOwnerNamed: z.boolean(),
  dataBackupOwnerNamed: z.boolean(),
  goNoGoMeetingRecorded: z.boolean(),
});
export type M22ApprovalChain = z.infer<typeof M22ApprovalChainSchema>;

export const M22ProductionDecisionRecordSchema = z.object({
  releaseCandidateId: NonEmptyStringSchema,
  sourceArchiveChecksum: NonEmptyStringSchema,
  manifestChecksum: NonEmptyStringSchema,
  evidenceBinderPath: NonEmptyStringSchema,
  runtimeEvidence: M22RuntimeEvidenceSummarySchema,
  approvals: M22ApprovalChainSchema,
  decision: M22ProductionDecisionSchema,
  decisionReason: NonEmptyStringSchema,
  decidedAt: z.string().datetime(),
});
export type M22ProductionDecisionRecord = z.infer<typeof M22ProductionDecisionRecordSchema>;

export const M22ProductionGateCatalog = [
  {
    gateId: 'M22-LOCKED-SPEC-ARCHITECTURE-STACK-BASELINE',
    domain: 'LOCKED_SPEC_STACK_ARCHITECTURE',
    title: 'Locked specification, architecture and stack remain unchanged from approved baseline',
    requiredEvidence: ['architecture gate output', 'locked stack checklist', 'spec deviation report'],
    blockingConditions: ['stack replacement', 'new unsupported service', 'frontend/server boundary violation', 'direct Prisma use outside repository'],
    requiredCommands: ['pnpm architecture:check', 'pnpm contracts:check'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    gateId: 'M22-M0-M21-SOURCE-EVIDENCE-CASCADE',
    domain: 'SOURCE_AND_DEPENDENCY_REPRODUCIBILITY',
    title: 'M0 through M21 source, policy, documentation and evidence gates are present and cascaded',
    requiredEvidence: ['M0-M21 pass status files', 'preflight cascade log', 'patch manifest'],
    blockingConditions: ['any prior pass missing', 'prior pass preflight failure', 'untracked pass debt'],
    requiredCommands: ['pnpm missing:m21:preflight'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    gateId: 'M22-DEPENDENCY-LOCKFILE-FROZEN-INSTALL',
    domain: 'SOURCE_AND_DEPENDENCY_REPRODUCIBILITY',
    title: 'Dependency lockfile and frozen install are proven before production sign-off',
    requiredEvidence: ['pnpm-lock.yaml', 'frozen install log', 'dependency audit log'],
    blockingConditions: ['missing lockfile', 'frozen install failure', 'high severity unresolved dependency advisory'],
    requiredCommands: ['pnpm install --frozen-lockfile', 'pnpm audit --audit-level high'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    gateId: 'M22-DATABASE-MIGRATION-SEED-ROLLBACK',
    domain: 'DATABASE_MIGRATION_SEED_ROLLBACK',
    title: 'Database validate, generate, deploy, seed and rollback evidence are complete',
    requiredEvidence: ['Prisma validation log', 'migration deploy log', 'seed log', 'backup restore log', 'rollback procedure'],
    blockingConditions: ['failed migration', 'failed seed', 'missing backup', 'untested rollback', 'schema drift'],
    requiredCommands: ['pnpm db:validate', 'pnpm db:generate', 'pnpm db:migrate:deploy', 'pnpm db:seed'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    gateId: 'M22-CONTAINER-RUNTIME-HEALTH-READINESS',
    domain: 'CONTAINER_RUNTIME_HEALTH_READINESS',
    title: 'Docker runtime proves web, API, worker, PostgreSQL, Redis, MinIO and Nginx healthy',
    requiredEvidence: ['docker compose config', 'image build log', 'compose ps', 'health/readiness logs'],
    blockingConditions: ['unhealthy service', 'Nginx route failure', 'worker queue failure', 'API readiness failure'],
    requiredCommands: ['docker compose config', 'docker compose build web api worker', 'docker compose up -d', 'pnpm docker:runtime:certify'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    gateId: 'M22-FULL-LIFECYCLE-E2E-ZERO-FAIL-SKIP',
    domain: 'FULL_LIFECYCLE_RUNTIME_E2E',
    title: 'Full lifecycle E2E runtime has zero failed and zero skipped critical scenarios',
    requiredEvidence: ['full workflow E2E results', 'M20 lifecycle manifest', 'rollback/no-partial-state proof'],
    blockingConditions: ['failed critical scenario', 'skipped critical scenario', 'partial critical state after rollback failure'],
    requiredCommands: ['RUN_FULL_WORKFLOW_E2E=1 pnpm full-workflow:e2e:certify'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    gateId: 'M22-SECURITY-ABUSE-MAKER-CHECKER-COMPLETE',
    domain: 'SECURITY_ABUSE_MAKER_CHECKER',
    title: 'Security abuse cases, tenant isolation and maker-checker controls pass',
    requiredEvidence: ['security smoke output', 'abuse matrix', 'maker-checker evidence', 'audit redaction proof'],
    blockingConditions: ['IDOR/cross-tenant failure', 'maker-checker bypass', 'secret in audit/log output', 'unsafe upload accepted'],
    requiredCommands: ['pnpm security:smoke:preflight', 'pnpm missing:m19:certify'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    gateId: 'M22-PERFORMANCE-BACKUP-OBSERVABILITY-DR-COMPLETE',
    domain: 'PERFORMANCE_BACKUP_OBSERVABILITY_DR',
    title: 'Performance, backup/restore, observability and DR evidence meet production thresholds',
    requiredEvidence: ['M21 performance evidence', 'backup checksum', 'restore drill', 'observability sample', 'DR rollback rehearsal'],
    blockingConditions: ['SLO violation', 'backup missing', 'restore outside RPO/RTO', 'missing alert/runbook', 'DR rehearsal not complete'],
    requiredCommands: ['pnpm missing:m21:certify'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    gateId: 'M22-DOCUMENTED-RISKS-OWNER-APPROVALS',
    domain: 'OWNER_APPROVAL_AND_RISK_ACCEPTANCE',
    title: 'Known risks, owner approvals and release responsibilities are documented',
    requiredEvidence: ['known risk register', 'approval record', 'rollback owner', 'backup owner', 'release notes'],
    blockingConditions: ['unapproved high/critical risk', 'missing owner approval', 'missing rollback or backup owner'],
    requiredCommands: ['complete release evidence binder', 'record Go/No-Go meeting'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    gateId: 'M22-POST-DEPLOYMENT-SMOKE-ROLLBACK-WINDOW',
    domain: 'CUTOVER_POST_DEPLOYMENT_VALIDATION',
    title: 'Post-deployment smoke, monitoring window and rollback window are prepared',
    requiredEvidence: ['post-deploy smoke plan', 'monitoring window owner', 'rollback window decision', 'communications checklist'],
    blockingConditions: ['no smoke plan', 'no monitoring owner', 'no rollback window', 'no communication plan'],
    requiredCommands: ['run post-deployment validation checklist'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    gateId: 'M22-FINAL-PRODUCTION-GO-NOGO-DECISION',
    domain: 'FINAL_GO_NOGO_DECISION',
    title: 'Final production GO requires all gates passed, zero critical defects and complete approvals',
    requiredEvidence: ['final decision record', 'evidence hash', 'operator sign-off', 'release candidate ID'],
    blockingConditions: ['any gate not passed', 'decision HOLD/NO_GO', 'missing evidence hash', 'missing release candidate ID'],
    requiredCommands: ['RUN_M22_PRODUCTION_GO_NOGO=1 pnpm production:go-nogo:final'],
    runtimeRequired: true,
    blocksProduction: true,
  },
] as const satisfies readonly M22ProductionGate[];

export const M22ProductionGoNoGoManifest = {
  marker: MISSING_PASS_M22_SOURCE_PREFLIGHT_PRODUCTION_GO_NOGO_FINAL,
  decisionDefault: 'HOLD_UNTIL_M1_M21_RUNTIME_EVIDENCE_AND_OWNER_APPROVALS',
  gates: M22ProductionGateCatalog,
  lockedStack: ['Next.js', 'Fastify', 'TypeScript', 'PostgreSQL', 'Prisma', 'MinIO', 'Redis', 'BullMQ', 'Docker', 'Nginx', 'GitHub Actions'] as const,
  mandatoryCommandChain: [
    'corepack enable',
    'corepack prepare pnpm@10.15.0 --activate',
    'pnpm install --frozen-lockfile',
    'pnpm verify:static',
    'pnpm missing:m21:certify',
    'RUN_FULL_WORKFLOW_E2E=1 pnpm full-workflow:e2e:certify',
    'RUN_C18_PRODUCTION_RELEASE=1 pnpm production-release:certify',
    'RUN_M22_PRODUCTION_GO_NOGO=1 pnpm production:go-nogo:final',
  ] as const,
} as const;
