import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const file = (p) => path.join(root, p);
const exists = (p) => fs.existsSync(file(p));
const text = (p) => fs.readFileSync(file(p), 'utf8');
const requireFile = (p) => { if (!exists(p)) errors.push(`Missing required production-release file: ${p}`); };
const requireText = (p, marker) => {
  if (!exists(p)) errors.push(`Missing file for marker ${marker}: ${p}`);
  else if (!text(p).includes(marker)) errors.push(`Missing marker ${marker} in ${p}`);
};

for (const p of [
  'shared/src/contracts/release-candidate/index.ts',
  'shared/src/contracts/release-candidate/production-release-manifest.ts',
  'backend/src/modules/release-candidate/production-release-policy.ts',
  'backend/src/modules/release-candidate/production-release-policy.test.ts',
  'backend/src/modules/release-candidate/production-release.integration.test.ts',
  'frontend/src/modules/release-candidate/production-release-center.tsx',
  'frontend/src/app/(erp)/release-candidate/page.tsx',
  'scripts/production-release-certify.mjs',
  'scripts/production-release-certify.sh',
  'scripts/production-release-certify.ps1',
  'docs/compliance/PRODUCTION_DEPLOYMENT_RELEASE.md',
  'docs/production/RELEASE_CANDIDATE_RUNBOOK.md',
  'docs/production/ENVIRONMENT_MATRIX.md',
  'docs/production/ROLLBACK_PLAN.md',
  'docs/production/GO_NOGO_DECISION_TEMPLATE.md',
]) requireFile(p);

requireText('package.json', 'production-release:check');
requireText('package.json', 'production-release:certify');
requireText('package.json', 'production-release:certify:ps');
requireText('shared/src/contracts/index.ts', "export * from './release-candidate';");
requireText('frontend/src/modules/navigation/app-shell.tsx', "['Release Candidate', '/release-candidate', 'security']");
requireText('.github/workflows/ci.yml', 'pnpm verify:static');
requireText('scripts/production-release-certify.mjs', 'RUN_PRODUCTION_RELEASE');
requireText('scripts/production-release-certify.mjs', 'certification-output/production-release');
requireText('scripts/production-release-certify.mjs', 'release-candidate-manifest.json');
requireText('scripts/production-release-certify.mjs', 'NEXORA_API_BASE_URL');

for (const marker of [
  'C18_PRODUCTION_DEPLOYMENT_RELEASE_CANDIDATE',
  'C18-SOURCE-ARCHIVE-FROZEN-CHECKSUMED-REPRODUCIBLE',
  'C18-LOCKED-STACK-DEPLOYMENT-TOPOLOGY-UNCHANGED',
  'C18-ENVIRONMENT-SECRETS-AND-CONFIGURATION-MATRIX',
  'C18-DATABASE-MIGRATION-BACKUP-RESTORE-ROLLBACK-GATE',
  'C18-CONTAINER-IMAGE-NGINX-HEALTH-READINESS-GATE',
  'C18-RUNTIME-E2E-SECURITY-SMOKE-EVIDENCE-GATE',
  'C18-OBSERVABILITY-AUDIT-LOG-PII-REDACTION-GATE',
  'C18-RELEASE-NOTES-KNOWN-RISKS-GO-NOGO-DECISION',
  'HOLD_UNTIL_ALL_RUNTIME_EVIDENCE_IS_ATTACHED',
]) requireText('shared/src/contracts/release-candidate/production-release-manifest.ts', marker);

for (const marker of [
  'assertFrozenSourceArchive',
  'assertLockedDeploymentTopology',
  'assertEnvironmentSecretMatrix',
  'assertDatabaseMigrationBackupRollback',
  'assertContainerImageNginxHealthReadiness',
  'assertRuntimeE2eSecuritySmokeEvidence',
  'assertObservabilityAuditLogPiiRedaction',
  'assertReleaseNotesKnownRisksGoNoGo',
  'assertProductionReleaseEvidenceCatalog',
  'assertProductionReleaseGateCatalog',
]) requireText('backend/src/modules/release-candidate/production-release-policy.ts', marker);

for (const marker of [
  'pnpm install --frozen-lockfile',
  'pnpm verify:static',
  'zero failed and zero skipped critical scenarios',
  'rollback',
]) requireText('docs/production/PRODUCTION_READINESS_CHECKLIST.md', marker);

for (const marker of [
  'DATABASE_URL',
  'REDIS_URL',
  'MINIO_ENDPOINT',
  'AUTH_ACCESS_TOKEN_SECRET',
  'OPENAPI_DOCS_ENABLED=false',
  'No real production secret is stored in this file',
]) requireText('docs/production/ENVIRONMENT_MATRIX.md', marker);

const frontendRoot = file('frontend/src');
const prohibited = [
  '@nexora/database',
  'backend/src',
  'database/prisma',
  'from \'minio\'',
  'from "minio"',
  'from \'bullmq\'',
  'from "bullmq"',
  'from \'ioredis\'',
  'from "ioredis"',
];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      const rel = path.relative(root, full);
      const body = fs.readFileSync(full, 'utf8');
      for (const marker of prohibited) {
        if (body.includes(marker)) errors.push(`Frontend server-only import marker ${marker} found in ${rel}`);
      }
    }
  }
}
if (exists('frontend/src')) walk(frontendRoot);

if (errors.length) {
  console.error('Production release gate FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Production release gate PASSED');
console.log('Production deployment/release-candidate controls, evidence gates, rollback plan and runtime certification commands are present.');
