import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const errors = [];
const file = (p) => path.join(root, p);
const exists = (p) => fs.existsSync(file(p));
const read = (p) => fs.readFileSync(file(p), 'utf8');
const requireFile = (p) => { if (!exists(p)) errors.push(`Missing required M19 production go/no-go file: ${p}`); };
const requireText = (p, marker) => {
  if (!exists(p)) errors.push(`Missing file for marker ${marker}: ${p}`);
  else if (!read(p).includes(marker)) errors.push(`Missing marker ${marker} in ${p}`);
};

const staticGovernanceFiles = [
  'docs/production/PRODUCTION_READINESS_CHECKLIST.md',
  'docs/production/RELEASE_EVIDENCE_BINDER.md',
  'docs/production/RELEASE_CANDIDATE_RUNBOOK.md',
  'docs/production/ENVIRONMENT_MATRIX.md',
  'docs/production/BACKUP_RESTORE_DRILL_RUNBOOK.md',
  'docs/production/ROLLBACK_PLAN.md',
  'docs/production/GO_NOGO_DECISION_TEMPLATE.md',
  'docs/production/FINAL_GO_NOGO_PACKET.md',
  'scripts/production-release-certify.mjs',
  'scripts/production-release-certify.sh',
  'scripts/production-release-certify.ps1',
  'scripts/final-certify.sh',
  'scripts/final-certify.ps1',
  'scripts/check-pass-m19-production-go-nogo-certification.mjs',
  'scripts/pass-m19-production-go-nogo-certify.sh',
  'scripts/pass-m19-production-go-nogo-certify.ps1',
];
for (const p of staticGovernanceFiles) requireFile(p);

const pkg = JSON.parse(read('package.json'));
for (const script of [
  'production-release:check',
  'production-release:certify',
  'production-release:certify:ps',
  'production-go-nogo:check',
  'pass:m19:certify',
  'pass:m19:certify:ps',
  'final:certify',
  'final:certify:ps',
]) {
  if (!pkg.scripts?.[script]) errors.push(`Missing package script: ${script}`);
}

for (const marker of [
  'pnpm production-go-nogo:check',
  'pnpm production-release:check',
  'pnpm docker-runtime:check',
  'pnpm full-lifecycle:e2e:check',
]) requireText('package.json', marker);

for (const marker of [
  'RUN_PRODUCTION_RELEASE=1',
  'pnpm production-release:certify',
  'pnpm full-workflow:e2e:certify',
  'pnpm test',
  'pnpm install --frozen-lockfile',
]) requireText('scripts/final-certify.sh', marker);

for (const marker of [
  '$env:RUN_PRODUCTION_RELEASE = "1"',
  'Invoke-CertStep pnpm production-release:certify',
  'Invoke-CertStep pnpm full-workflow:e2e:certify',
  'Invoke-CertStep pnpm test',
  'pnpm-lock.yaml is required',
]) requireText('scripts/final-certify.ps1', marker);

for (const marker of [
  'RUN_PRODUCTION_RELEASE',
  'NEXORA_API_BASE_URL',
  'pnpm-lock.yaml',
  'certification-output/final-certification.log',
  'certification-output/full-workflow-e2e/results.json',
  'certification-output/security-smoke-results.json',
  'certification-output/backup-restore.log',
  'release-candidate-manifest.json',
  'READY_FOR_GO_NOGO_APPROVAL',
  'HOLD',
]) requireText('scripts/production-release-certify.mjs', marker);

for (const marker of [
  'M19_PRODUCTION_GO_NOGO_GATE',
  'HOLD_UNTIL_PNPM_LOCKFILE_EXISTS',
  'HOLD_UNTIL_FROZEN_INSTALL_PASSES',
  'HOLD_UNTIL_DOCKER_RUNTIME_PASSES',
  'HOLD_UNTIL_FULL_LIFECYCLE_E2E_ZERO_FAILED_ZERO_SKIPPED',
  'HOLD_UNTIL_SECURITY_SMOKE_AND_BACKUP_RESTORE_EVIDENCE_ATTACHED',
  'NO STACK DEVIATION',
  'GO / NO-GO / HOLD',
]) requireText('docs/production/FINAL_GO_NOGO_PACKET.md', marker);

for (const marker of [
  'pnpm-lock.yaml',
  'pnpm install --frozen-lockfile',
  'pnpm verify:static',
  'pnpm lint',
  'pnpm typecheck',
  'pnpm test',
  'pnpm db:validate',
  'pnpm build',
  'zero failed and zero skipped critical scenarios',
  'Final Go/No-Go decision',
]) requireText('docs/production/PRODUCTION_READINESS_CHECKLIST.md', marker);

for (const marker of [
  'Release Evidence Binder',
  'Dependency integrity',
  'Full lifecycle E2E',
  'Security',
  'Operations',
  'Release decision',
]) requireText('docs/production/RELEASE_EVIDENCE_BINDER.md', marker);

const requiredRuntimeEvidence = [
  'pnpm-lock.yaml',
  'certification-output/final-certification.log',
  'certification-output/full-workflow-e2e/results.json',
  'certification-output/full-workflow-e2e/manifest.json',
  'certification-output/security-smoke-results.json',
  'certification-output/backup-restore.log',
  'certification-output/production-release/release-candidate-manifest.json',
];
const missingRuntimeEvidence = requiredRuntimeEvidence.filter((p) => !exists(p));
const lockfileExists = exists('pnpm-lock.yaml');
const currentDecision = missingRuntimeEvidence.length === 0 ? 'READY_FOR_MANUAL_GO_NOGO_REVIEW' : 'HOLD';

if (!lockfileExists && currentDecision !== 'HOLD') {
  errors.push('M19 must remain HOLD when pnpm-lock.yaml is missing.');
}

const evidenceHash = crypto
  .createHash('sha256')
  .update(JSON.stringify({ staticGovernanceFiles, requiredRuntimeEvidence, missingRuntimeEvidence, lockfileExists, currentDecision }))
  .digest('hex');

const payload = {
  gate: 'pass-m19-production-go-nogo-certification',
  pass: 'M19',
  title: 'Production Readiness and Go/No-Go',
  generatedAt: new Date().toISOString(),
  lockedStack: 'Next.js + TypeScript frontend, Fastify + TypeScript backend, PostgreSQL + Prisma, MinIO, Redis, BullMQ, Docker Compose, Nginx, GitHub Actions',
  staticGovernanceFileCount: staticGovernanceFiles.length,
  requiredRuntimeEvidence,
  missingRuntimeEvidence,
  lockfileExists,
  currentDecision,
  productionGoClaimed: false,
  note: currentDecision === 'HOLD'
    ? 'Static production go/no-go governance is present. Production GO remains blocked until all runtime/dependency evidence exists and release owners approve.'
    : 'All required evidence files are present; manual release-owner GO/NO-GO approval is still required.',
  evidenceHash,
};

fs.mkdirSync(file('certification-output'), { recursive: true });
fs.mkdirSync(file('certification-output/production-go-nogo'), { recursive: true });
fs.writeFileSync(file('certification-output/pass-m19-production-go-nogo-certification.json'), `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(file('certification-output/production-go-nogo/current-decision.json'), `${JSON.stringify(payload, null, 2)}\n`);

if (errors.length) {
  console.error('PASS M19 production go/no-go gate FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('PASS M19 production go/no-go gate PASSED.');
console.log(`Current release decision: ${currentDecision}.`);
if (missingRuntimeEvidence.length) console.log(`Missing runtime/dependency evidence: ${missingRuntimeEvidence.join(', ')}`);
