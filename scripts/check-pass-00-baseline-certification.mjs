#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const startedAt = new Date().toISOString();
const failures = [];
const blockers = [];
const warnings = [];
const checks = [];

function check(name, ok, message, options = {}) {
  checks.push({ name, ok, severity: options.blocker ? 'blocker' : options.warning ? 'warning' : 'failure' });
  if (ok) return;
  if (options.warning) warnings.push(message);
  else if (options.blocker) blockers.push(message);
  else failures.push(message);
}

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function readJson(path) {
  return JSON.parse(read(path));
}

function hasFile(path) {
  return existsSync(resolve(root, path));
}

function addEvidence(status, message) {
  const output = {
    pass: 'PASS_00',
    name: 'Recovery, baseline lock and build truth',
    mode: sourceOnly ? 'source-only' : 'strict',
    status,
    message,
    checkedAt: startedAt,
    finishedAt: new Date().toISOString(),
    lockfilePresent: hasFile('pnpm-lock.yaml'),
    checks,
    warnings,
    blockers,
    failures,
    requiredConnectedMachineCommand: 'powershell -ExecutionPolicy Bypass -File scripts\\pass-00-baseline-certify.ps1',
    lockedArchitecturePreserved: true,
    stackChangeMade: false
  };
  mkdirSync(resolve(root, 'certification-output'), { recursive: true });
  writeFileSync(resolve(root, 'certification-output/pass-00-baseline-certification.json'), `${JSON.stringify(output, null, 2)}\n`);
  return output;
}

const requiredFiles = [
  'package.json',
  'pnpm-workspace.yaml',
  '.npmrc',
  '.node-version',
  '.nvmrc',
  'frontend/package.json',
  'backend/package.json',
  'worker/package.json',
  'shared/package.json',
  'database/package.json',
  'docker-compose.yml',
  '.github/workflows/ci.yml',
  'infrastructure/docker/frontend.Dockerfile',
  'infrastructure/docker/backend.Dockerfile',
  'infrastructure/docker/worker.Dockerfile',
  'docs/SOURCE_OF_TRUTH.md',
  'docs/source/NEXORA_ERP_Complete_Technical_Specification_v1.2_2026-09-08.pdf',
  'scripts/check-lockfile-policy.mjs',
  'scripts/check-dependency-foundation.mjs'
];

for (const file of requiredFiles) {
  check(`required baseline file exists: ${file}`, hasFile(file), `${file} is missing`);
}

if (hasFile('package.json')) {
  const pkg = readJson('package.json');
  check('root packageManager remains pnpm@10.15.0', pkg.packageManager === 'pnpm@10.15.0', `packageManager changed to ${pkg.packageManager ?? 'undefined'}`);
  check('root Node engine remains >=22 <23', pkg.engines?.node === '>=22 <23', 'package.json engines.node must remain >=22 <23');
  for (const script of ['lint', 'typecheck', 'test', 'build', 'db:validate', 'architecture:check', 'contracts:check', 'dependencies:check', 'pass:00:source-check', 'pass:00:certify', 'pass:00:certify:ps']) {
    check(`root package script exists: ${script}`, Boolean(pkg.scripts?.[script]), `package.json missing required script: ${script}`);
  }
}

if (hasFile('.node-version')) {
  check('.node-version pins Node 22', read('.node-version').trim().startsWith('22.'), '.node-version must stay on Node 22');
}
if (hasFile('.nvmrc')) {
  check('.nvmrc pins Node 22', read('.nvmrc').trim().startsWith('22.'), '.nvmrc must stay on Node 22');
}
if (hasFile('.npmrc')) {
  const npmrc = read('.npmrc');
  for (const required of ['engine-strict=true', 'shared-workspace-lockfile=true', 'strict-peer-dependencies=false']) {
    check(`.npmrc contains ${required}`, npmrc.includes(required), `.npmrc missing ${required}`);
  }
}
if (hasFile('pnpm-workspace.yaml')) {
  const workspace = read('pnpm-workspace.yaml');
  for (const workspaceName of ['frontend', 'backend', 'worker', 'shared', 'database']) {
    check(`workspace includes ${workspaceName}`, workspace.includes(`- ${workspaceName}`), `pnpm-workspace.yaml missing ${workspaceName}`);
  }
}

for (const workspacePkg of ['frontend/package.json', 'backend/package.json', 'worker/package.json', 'shared/package.json', 'database/package.json']) {
  if (!hasFile(workspacePkg)) continue;
  const pkg = readJson(workspacePkg);
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  for (const [name, version] of Object.entries(deps)) {
    if (name.startsWith('@nexora/')) {
      check(`${workspacePkg} uses workspace protocol for ${name}`, version === 'workspace:*', `${workspacePkg} must reference ${name} as workspace:*`);
    }
  }
}

const forbiddenLockfiles = ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'bun.lockb', 'bun.lock'];
for (const lockfile of forbiddenLockfiles) {
  check(`forbidden root lockfile absent: ${lockfile}`, !hasFile(lockfile), `forbidden root lockfile present: ${lockfile}`);
}
for (const workspaceName of ['frontend', 'backend', 'worker', 'shared', 'database']) {
  check(`no workspace-local pnpm-lock.yaml under ${workspaceName}`, !hasFile(`${workspaceName}/pnpm-lock.yaml`), `workspace-local pnpm-lock.yaml is forbidden: ${workspaceName}/pnpm-lock.yaml`);
  for (const lockfile of forbiddenLockfiles) {
    check(`no workspace-local ${lockfile} under ${workspaceName}`, !hasFile(`${workspaceName}/${lockfile}`), `workspace-local forbidden lockfile present: ${workspaceName}/${lockfile}`);
  }
}

for (const dockerfile of ['infrastructure/docker/frontend.Dockerfile', 'infrastructure/docker/backend.Dockerfile', 'infrastructure/docker/worker.Dockerfile']) {
  if (!hasFile(dockerfile)) continue;
  const text = read(dockerfile);
  check(`${dockerfile} copies pnpm-lock.yaml`, text.includes('pnpm-lock.yaml'), `${dockerfile} must copy pnpm-lock.yaml`);
  check(`${dockerfile} uses pnpm install --frozen-lockfile`, text.includes('pnpm install --frozen-lockfile'), `${dockerfile} must use pnpm install --frozen-lockfile`);
}

if (hasFile('.github/workflows/ci.yml')) {
  const ci = read('.github/workflows/ci.yml');
  check('CI pins Node 22', ci.includes('node-version: 22') || ci.includes('node-version: "22"'), 'CI must use Node 22');
  check('CI checks lockfile policy', ci.includes('check-lockfile-policy.mjs') || ci.includes('lockfile:check'), 'CI must check lockfile policy');
  check('CI uses frozen install', ci.includes('pnpm install --frozen-lockfile'), 'CI must use pnpm install --frozen-lockfile');
}

const sourceAuthorityText = [
  hasFile('docs/SOURCE_OF_TRUTH.md') ? read('docs/SOURCE_OF_TRUTH.md') : '',
  hasFile('docs/compliance/BLUEPRINT_SOURCE_OF_TRUTH.md') ? read('docs/compliance/BLUEPRINT_SOURCE_OF_TRUTH.md') : '',
  hasFile('docs/compliance/APPENDIX_G_FRONTEND_COMPLETION_LOCK.md') ? read('docs/compliance/APPENDIX_G_FRONTEND_COMPLETION_LOCK.md') : ''
].join('\n');
for (const phrase of ['Total pages: **90**', 'Appendix F', 'Appendix G', 'Fastify', 'PostgreSQL', 'Prisma', 'MinIO', 'Redis', 'BullMQ', 'Next.js']) {
  check(`source authority docs contain ${phrase}`, sourceAuthorityText.includes(phrase), `source authority docs missing ${phrase}`);
}

const lockfilePresent = hasFile('pnpm-lock.yaml');
check('root pnpm-lock.yaml exists', lockfilePresent, 'pnpm-lock.yaml is still missing. It must be generated by pnpm on a connected machine; do not fabricate it.', { blocker: sourceOnly });
if (lockfilePresent) {
  const lockfile = read('pnpm-lock.yaml');
  check('pnpm-lock.yaml has lockfileVersion', /^lockfileVersion:/m.test(lockfile), 'pnpm-lock.yaml missing lockfileVersion');
  check('pnpm-lock.yaml has importers section', /^importers:/m.test(lockfile), 'pnpm-lock.yaml missing importers section');
  for (const importer of ['.', 'frontend', 'backend', 'worker', 'shared', 'database']) {
    const pattern = new RegExp(`^\\s{2}${importer.replace('.', '\\.')}:`, 'm');
    check(`pnpm-lock.yaml includes importer ${importer}`, pattern.test(lockfile), `pnpm-lock.yaml missing importer ${importer}`);
  }
}

let status = 'PASS';
let message = 'PASS 00 strict baseline gate passed: workspace, source authority and lockfile policy are intact.';
if (failures.length > 0) {
  status = 'FAIL';
  message = 'PASS 00 baseline gate failed.';
} else if (blockers.length > 0) {
  status = sourceOnly ? 'HOLD' : 'FAIL';
  message = sourceOnly
    ? 'PASS 00 source preparation completed, but network-dependent lockfile/install/build certification is still blocked.'
    : 'PASS 00 strict baseline gate failed because a real pnpm-lock.yaml is required.';
}

addEvidence(status, message);

if (failures.length > 0 || (!sourceOnly && blockers.length > 0)) {
  console.error(message);
  for (const failure of failures) console.error(`- ${failure}`);
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

if (blockers.length > 0) {
  console.warn(message);
  for (const blocker of blockers) console.warn(`- ${blocker}`);
  process.exit(0);
}

console.log(message);
