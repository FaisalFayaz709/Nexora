#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const errors = [];
const file = (p) => path.join(root, p);
const exists = (p) => fs.existsSync(file(p));
const read = (p) => fs.readFileSync(file(p), 'utf8');
const requireFile = (p) => { if (!exists(p)) errors.push(`Missing M20 required file: ${p}`); };
const requireText = (p, marker) => {
  if (!exists(p)) errors.push(`Missing file for marker ${marker}: ${p}`);
  else if (!read(p).includes(marker)) errors.push(`Missing marker ${marker} in ${p}`);
};

const requiredFiles = [
  'scripts/check-pass-m20-runtime-evidence-pipeline.mjs',
  'scripts/pass-m20-local-final-certification.sh',
  'scripts/pass-m20-local-final-certification.ps1',
  'scripts/security-smoke-certify.mjs',
  'scripts/backup-restore-certify.sh',
  'scripts/backup-restore-certify.ps1',
];
for (const p of requiredFiles) requireFile(p);

const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts ?? {};
for (const script of [
  'security:smoke:certify',
  'backup-restore:certify',
  'backup-restore:certify:ps',
  'runtime-evidence:pipeline:check',
  'pass:m20:certify',
  'pass:m20:certify:ps',
  'final:certify',
  'final:certify:ps',
]) {
  if (!scripts[script]) errors.push(`Missing package script: ${script}`);
}

for (const marker of [
  'corepack prepare pnpm@10.15.0 --activate',
  'pnpm install --lockfile-only',
  'pnpm install --frozen-lockfile',
  'pnpm verify:static',
  'pnpm lint',
  'pnpm typecheck',
  'pnpm test',
  'pnpm db:validate',
  'pnpm db:generate',
  'docker compose build',
  'docker compose up -d',
  'pnpm docker:runtime:certify',
  'pnpm full-workflow:e2e:certify',
  'pnpm security:smoke:certify',
  'pnpm backup-restore:certify',
  'pnpm production-release:certify',
  'pnpm production-go-nogo:check',
]) requireText('scripts/pass-m20-local-final-certification.sh', marker);

for (const marker of [
  'corepack prepare pnpm@10.15.0 --activate',
  'pnpm install --lockfile-only',
  'pnpm install --frozen-lockfile',
  'pnpm verify:static',
  'pnpm lint',
  'pnpm typecheck',
  'pnpm test',
  'pnpm db:validate',
  'pnpm db:generate',
  'docker compose build',
  'docker compose up -d',
  'pnpm docker:runtime:certify',
  'pnpm full-workflow:e2e:certify',
  'pnpm security:smoke:certify',
  'pnpm backup-restore:certify',
  'pnpm production-release:certify',
  'pnpm production-go-nogo:check',
]) requireText('scripts/pass-m20-local-final-certification.ps1', marker);

for (const marker of [
  'SECURITY_SMOKE_RESULTS',
  'certification-output/security-smoke-results.json',
  'pnpm security:check',
  'NEXORA_API_BASE_URL',
  '/health/live',
  '/health/ready',
  '/auth/me',
  'zero unauthorized bypasses',
]) requireText('scripts/security-smoke-certify.mjs', marker);

for (const marker of [
  'BACKUP_RESTORE_CERTIFICATION',
  'certification-output/backup-restore.log',
  'pg_dump',
  'pg_restore',
  'nexora_restore_verify',
  'docker compose exec -T postgres',
]) requireText('scripts/backup-restore-certify.sh', marker);

for (const marker of [
  'BACKUP_RESTORE_CERTIFICATION',
  'certification-output\\backup-restore.log',
  'pg_dump',
  'pg_restore',
  'nexora_restore_verify',
  'docker compose exec -T postgres',
]) requireText('scripts/backup-restore-certify.ps1', marker);

const runtimeEvidence = [
  'pnpm-lock.yaml',
  'certification-output/final-certification.log',
  'certification-output/full-workflow-e2e/results.json',
  'certification-output/full-workflow-e2e/manifest.json',
  'certification-output/security-smoke-results.json',
  'certification-output/backup-restore.log',
  'certification-output/production-release/release-candidate-manifest.json',
];
const missingRuntimeEvidence = runtimeEvidence.filter((p) => !exists(p));
const currentDecision = missingRuntimeEvidence.length === 0 ? 'READY_FOR_MANUAL_GO_NOGO_REVIEW' : 'HOLD';
const evidenceHash = crypto.createHash('sha256').update(JSON.stringify({ requiredFiles, runtimeEvidence, missingRuntimeEvidence, currentDecision })).digest('hex');

const payload = {
  gate: 'pass-m20-runtime-evidence-pipeline',
  pass: 'M20',
  title: 'Dependency and Runtime Evidence Unblocker',
  generatedAt: new Date().toISOString(),
  staticGovernance: errors.length === 0 ? 'PASSED' : 'FAILED',
  lockedStackChanged: false,
  productionGoClaimed: false,
  runtimeEvidenceRequired: runtimeEvidence,
  missingRuntimeEvidence,
  currentDecision,
  evidenceHash,
  note: currentDecision === 'HOLD'
    ? 'M20 adds strict local evidence-producing scripts. This sandbox still cannot claim production GO because online lockfile/runtime evidence is absent.'
    : 'All expected evidence files are present; manual release-owner decision is still required.',
};
fs.mkdirSync(file('certification-output'), { recursive: true });
fs.writeFileSync(file('certification-output/pass-m20-runtime-evidence-pipeline-certification.json'), `${JSON.stringify(payload, null, 2)}\n`);

if (errors.length) {
  console.error('PASS M20 runtime evidence pipeline gate FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('PASS M20 runtime evidence pipeline gate PASSED.');
console.log(`Current decision: ${currentDecision}.`);
if (missingRuntimeEvidence.length) console.log(`Missing runtime evidence: ${missingRuntimeEvidence.join(', ')}`);
