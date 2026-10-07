import { z } from 'zod';
import { NonEmptyStringSchema } from '../common';

export const C18_PRODUCTION_DEPLOYMENT_RELEASE_CANDIDATE = 'C18_PRODUCTION_DEPLOYMENT_RELEASE_CANDIDATE' as const;

export const ProductionReleaseGateIds = [
  'C18-SOURCE-ARCHIVE-FROZEN-CHECKSUMED-REPRODUCIBLE',
  'C18-LOCKED-STACK-DEPLOYMENT-TOPOLOGY-UNCHANGED',
  'C18-ENVIRONMENT-SECRETS-AND-CONFIGURATION-MATRIX',
  'C18-DATABASE-MIGRATION-BACKUP-RESTORE-ROLLBACK-GATE',
  'C18-CONTAINER-IMAGE-NGINX-HEALTH-READINESS-GATE',
  'C18-RUNTIME-E2E-SECURITY-SMOKE-EVIDENCE-GATE',
  'C18-OBSERVABILITY-AUDIT-LOG-PII-REDACTION-GATE',
  'C18-RELEASE-NOTES-KNOWN-RISKS-GO-NOGO-DECISION',
] as const;
export type ProductionReleaseGateId = (typeof ProductionReleaseGateIds)[number];

export const ProductionReleaseStatusSchema = z.enum([
  'NOT_STARTED',
  'READY_TO_RUN',
  'RUNNING',
  'PASSED',
  'FAILED',
  'BLOCKED',
  'WAIVED_WITH_APPROVAL',
]);
export type ProductionReleaseStatus = z.infer<typeof ProductionReleaseStatusSchema>;

export const ProductionReleaseAreaSchema = z.enum([
  'SOURCE_CONTROL',
  'LOCKED_STACK',
  'CONFIGURATION',
  'DATABASE',
  'CONTAINERS',
  'RUNTIME_CERTIFICATION',
  'SECURITY',
  'OBSERVABILITY',
  'BACKUP_RESTORE',
  'ROLLBACK',
  'RELEASE_MANAGEMENT',
]);
export type ProductionReleaseArea = z.infer<typeof ProductionReleaseAreaSchema>;

export const ProductionReleaseGateSchema = z.object({
  gateId: z.enum(ProductionReleaseGateIds),
  title: NonEmptyStringSchema,
  areas: z.array(ProductionReleaseAreaSchema).min(1),
  requiredCommands: z.array(NonEmptyStringSchema).min(1),
  requiredEvidence: z.array(NonEmptyStringSchema).min(1),
  blockingConditions: z.array(NonEmptyStringSchema).min(1),
  runtimeRequired: z.boolean(),
  blocksProduction: z.boolean(),
});
export type ProductionReleaseGate = z.infer<typeof ProductionReleaseGateSchema>;

export const ProductionReleaseEvidenceSchema = z.object({
  gateId: z.enum(ProductionReleaseGateIds),
  status: ProductionReleaseStatusSchema,
  evidenceFiles: z.array(NonEmptyStringSchema),
  operator: NonEmptyStringSchema.optional(),
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
  notes: z.array(NonEmptyStringSchema),
});
export type ProductionReleaseEvidence = z.infer<typeof ProductionReleaseEvidenceSchema>;

export const ProductionReleaseGateCatalog: readonly ProductionReleaseGate[] = [
  {
    gateId: 'C18-SOURCE-ARCHIVE-FROZEN-CHECKSUMED-REPRODUCIBLE',
    title: 'Frozen source archive is checksumed, reproducible and traceable to the release candidate tag',
    areas: ['SOURCE_CONTROL', 'RELEASE_MANAGEMENT'],
    requiredCommands: ['git status --short', 'sha256sum release archive', 'pnpm install --frozen-lockfile'],
    requiredEvidence: ['release archive checksum', 'git commit/tag reference', 'frozen install log', 'manifest file'],
    blockingConditions: ['dirty source tree', 'missing pnpm-lock.yaml', 'checksum mismatch', 'untracked release-critical files'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    gateId: 'C18-LOCKED-STACK-DEPLOYMENT-TOPOLOGY-UNCHANGED',
    title: 'Deployment topology keeps Next.js, Fastify, PostgreSQL/Prisma, MinIO, Redis/BullMQ, Docker, Nginx and GitHub Actions unchanged',
    areas: ['LOCKED_STACK', 'CONTAINERS'],
    requiredCommands: ['pnpm architecture:check', 'docker compose config', 'inspect Dockerfiles and Nginx config'],
    requiredEvidence: ['architecture guard log', 'docker compose config log', 'image build log'],
    blockingConditions: ['stack replacement', 'missing web/api/worker/postgres/redis/minio/nginx service', 'direct database access from frontend/routes'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    gateId: 'C18-ENVIRONMENT-SECRETS-AND-CONFIGURATION-MATRIX',
    title: 'Production environment variables, secrets and safe defaults are declared without committed secrets',
    areas: ['CONFIGURATION', 'SECURITY'],
    requiredCommands: ['review .env.production.example', 'verify required env vars', 'run secret-placeholder scan'],
    requiredEvidence: ['environment matrix', 'secret manager references', 'placeholder scan log'],
    blockingConditions: ['production secret committed', 'local-only placeholder used in production', 'missing auth/database/minio/redis settings'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    gateId: 'C18-DATABASE-MIGRATION-BACKUP-RESTORE-ROLLBACK-GATE',
    title: 'Database migrations, backup restore, reversible release procedure and rollback records are verified',
    areas: ['DATABASE', 'BACKUP_RESTORE', 'ROLLBACK'],
    requiredCommands: ['pnpm db:validate', 'pnpm db:migrate:deploy', 'pnpm db:migrate:status', 'restore test to isolated database'],
    requiredEvidence: ['Prisma validation log', 'migration deploy log', 'migration status log', 'backup restore log', 'rollback decision record'],
    blockingConditions: ['failed migration', 'unclean migration status', 'missing backup before release', 'restore not tested', 'no rollback image tag'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    gateId: 'C18-CONTAINER-IMAGE-NGINX-HEALTH-READINESS-GATE',
    title: 'Container images build and Nginx routes health, web and API traffic to ready services',
    areas: ['CONTAINERS', 'OBSERVABILITY'],
    requiredCommands: ['docker compose build web api worker', 'docker compose up -d', 'docker compose ps', 'curl /healthz', 'curl /api/v1/health/ready'],
    requiredEvidence: ['container build log', 'docker compose ps log', 'Nginx health log', 'API readiness log', 'worker readiness log'],
    blockingConditions: ['image build failure', 'unhealthy service', 'Nginx route failure', 'API readiness failure', 'worker cannot reach Redis'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    gateId: 'C18-RUNTIME-E2E-SECURITY-SMOKE-EVIDENCE-GATE',
    title: 'Runtime E2E, security smoke, tenant isolation and workflow certification evidence are attached',
    areas: ['RUNTIME_CERTIFICATION', 'SECURITY'],
    requiredCommands: ['pnpm docker:runtime:certify', 'pnpm security:smoke:preflight', 'pnpm full-workflow:e2e:certify'],
    requiredEvidence: ['runtime certification log', 'security smoke results', 'full workflow E2E results', 'zero failed/skipped critical scenario report'],
    blockingConditions: ['any failed critical scenario', 'any skipped critical scenario', 'tenant isolation failure', 'security smoke failure'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    gateId: 'C18-OBSERVABILITY-AUDIT-LOG-PII-REDACTION-GATE',
    title: 'Operational logs, audit events, request IDs and PII/secret redaction are verified for production support',
    areas: ['OBSERVABILITY', 'SECURITY'],
    requiredCommands: ['generate request trace', 'verify audit events', 'scan logs for secrets', 'verify health and readiness telemetry'],
    requiredEvidence: ['request ID trace', 'audit log sample', 'redaction scan log', 'health telemetry screenshot/log'],
    blockingConditions: ['missing request IDs', 'critical mutation not audited', 'password/token/secret appears in logs', 'no operational health signal'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    gateId: 'C18-RELEASE-NOTES-KNOWN-RISKS-GO-NOGO-DECISION',
    title: 'Release notes, known risks, owner approvals and Go/No-Go decision are recorded before production deployment',
    areas: ['RELEASE_MANAGEMENT', 'ROLLBACK'],
    requiredCommands: ['complete release checklist', 'record known runtime pending items', 'record owner approvals', 'sign Go/No-Go decision'],
    requiredEvidence: ['release notes', 'production readiness checklist', 'known risks file', 'owner approval record', 'go/no-go decision'],
    blockingConditions: ['unapproved risk', 'missing rollback owner', 'missing runtime evidence', 'unresolved critical defect'],
    runtimeRequired: true,
    blocksProduction: true,
  },
];

export const ProductionReleaseCommandChain = [
  'corepack enable',
  'corepack prepare pnpm@10.15.0 --activate',
  'pnpm install --frozen-lockfile',
  'pnpm verify:static',
  'pnpm lint',
  'pnpm typecheck',
  'pnpm test',
  'pnpm db:validate',
  'pnpm db:generate',
  'docker compose config',
  'docker compose build web api worker',
  'docker compose up -d postgres redis minio migrator api worker web nginx',
  'pnpm docker:runtime:certify',
  'pnpm security:smoke:preflight',
  'RUN_FULL_WORKFLOW_E2E=1 pnpm full-workflow:e2e:certify',
  'RUN_C18_PRODUCTION_RELEASE=1 pnpm production-release:certify',
] as const;

export const ProductionReleaseManifest = {
  marker: C18_PRODUCTION_DEPLOYMENT_RELEASE_CANDIDATE,
  gates: ProductionReleaseGateCatalog,
  commandChain: ProductionReleaseCommandChain,
  releaseDecision: 'HOLD_UNTIL_ALL_RUNTIME_EVIDENCE_IS_ATTACHED',
  lockedStack: ['Next.js', 'Fastify', 'TypeScript', 'PostgreSQL', 'Prisma', 'MinIO', 'Redis', 'BullMQ', 'Docker', 'Nginx', 'GitHub Actions'] as const,
} as const;
