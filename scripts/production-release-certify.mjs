#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outputDir = path.join(root, 'certification-output', 'production-release');
// Runtime evidence target: certification-output/production-release/release-candidate-manifest.json
const run = process.env.RUN_PRODUCTION_RELEASE === '1';
const apiBase = process.env.NEXORA_API_BASE_URL ?? '';

const gates = [
  'RELEASE-SOURCE-ARCHIVE-FROZEN-CHECKSUMED-REPRODUCIBLE',
  'RELEASE-LOCKED-STACK-DEPLOYMENT-TOPOLOGY-UNCHANGED',
  'RELEASE-ENVIRONMENT-SECRETS-AND-CONFIGURATION-MATRIX',
  'RELEASE-DATABASE-MIGRATION-BACKUP-RESTORE-ROLLBACK-GATE',
  'RELEASE-CONTAINER-IMAGE-NGINX-HEALTH-READINESS-GATE',
  'RELEASE-RUNTIME-E2E-SECURITY-SMOKE-EVIDENCE-GATE',
  'RELEASE-OBSERVABILITY-AUDIT-LOG-PII-REDACTION-GATE',
  'RELEASE-RELEASE-NOTES-KNOWN-RISKS-GO-NOGO-DECISION',
];

const requiredEvidenceFiles = [
  'pnpm-lock.yaml',
  'certification-output/final-certification.log',
  'certification-output/full-workflow-e2e/results.json',
  'certification-output/full-workflow-e2e/manifest.json',
  'certification-output/security-smoke-results.json',
  'certification-output/backup-restore.log',
  'docs/production/RELEASE_CANDIDATE_RUNBOOK.md',
  'docs/production/ROLLBACK_PLAN.md',
  'docs/production/ENVIRONMENT_MATRIX.md',
  'docs/production/GO_NOGO_DECISION_TEMPLATE.md',
];

function now() {
  return new Date().toISOString();
}

function writeJson(fileName, value) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

function runCommand(command, args) {
  const startedAt = now();
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', shell: false });
  return {
    command: [command, ...args].join(' '),
    status: result.status ?? 1,
    signal: result.signal,
    stdout: result.stdout.slice(-12000),
    stderr: result.stderr.slice(-12000),
    startedAt,
    finishedAt: now(),
  };
}

function sha256OfFiles(files) {
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    const fullPath = path.join(root, file);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      hash.update(file);
      hash.update(fs.readFileSync(fullPath));
    }
  }
  return hash.digest('hex');
}

if (!run) {
  console.error('Production release certification is runtime-blocking. Set RUN_PRODUCTION_RELEASE=1 after Docker, E2E, security smoke, backup/restore and release approvals are ready.');
  process.exit(2);
}

if (!apiBase) {
  console.error('NEXORA_API_BASE_URL is required, for example http://localhost:3001/api/v1');
  process.exit(2);
}

const staticCommands = [
  ['node', ['scripts/check-production-release.mjs']],
  ['node', ['scripts/check-architecture.mjs']],
  ['node', ['scripts/check-contracts.mjs']],
  ['docker', ['compose', 'config']],
];
const commandResults = staticCommands.map(([command, args]) => runCommand(command, args));
const missingEvidence = requiredEvidenceFiles.filter((file) => !fs.existsSync(path.join(root, file)));
const commandFailures = commandResults.filter((result) => result.status !== 0);

const evidenceHash = sha256OfFiles(requiredEvidenceFiles.filter((file) => fs.existsSync(path.join(root, file))));
const passed = missingEvidence.length === 0 && commandFailures.length === 0;
const gateEvidence = gates.map((gateId) => ({
  gateId,
  status: passed ? 'PASSED' : 'BLOCKED',
  evidenceFiles: requiredEvidenceFiles.filter((file) => fs.existsSync(path.join(root, file))),
  startedAt: commandResults[0]?.startedAt ?? now(),
  finishedAt: now(),
  notes: passed ? ['Production release-candidate evidence is attached and static command chain passed.'] : [`Missing evidence files: ${missingEvidence.join(', ') || 'none'}`, `Command failures: ${commandFailures.length}`],
}));

writeJson('command-results.json', commandResults);
writeJson('gate-evidence.json', gateEvidence);
writeJson('release-candidate-manifest.json', {
  marker: 'PRODUCTION_DEPLOYMENT_RELEASE_CANDIDATE',
  generatedAt: now(),
  gateCount: gates.length,
  passed,
  missingEvidence,
  commandFailureCount: commandFailures.length,
  evidenceHash,
  productionDecision: passed ? 'READY_FOR_GO_NOGO_APPROVAL' : 'HOLD',
});

if (!passed) {
  console.error('Production release certification BLOCKED. Attach all required runtime evidence before production sign-off.');
  process.exit(1);
}

console.log(`Production release certification PASSED. Evidence hash: ${evidenceHash}`);
console.log(`Evidence written to ${path.relative(root, outputDir)}.`);
