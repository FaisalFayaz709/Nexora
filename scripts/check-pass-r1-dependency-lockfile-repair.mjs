#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const failures = [];
const warnings = [];
const checked = [];

function check(name, ok, failureMessage, warning = false) {
  checked.push({ check: name, ok });
  if (!ok) {
    if (warning) warnings.push(failureMessage);
    else failures.push(failureMessage);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
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
  'scripts/check-lockfile-policy.mjs',
  'scripts/check-pass-r1-dependency-lockfile-repair.mjs',
  'scripts/pass-r1-dependency-lockfile-certify.mjs',
  'scripts/pass-r1-dependency-lockfile-certify.sh',
  'scripts/pass-r1-dependency-lockfile-certify.ps1',
];

for (const file of requiredFiles) {
  check(`required file exists: ${file}`, existsSync(resolve(root, file)), `${file} is missing`);
}

if (existsSync(resolve(root, 'package.json'))) {
  const pkg = readJson('package.json');
  check('root packageManager is pnpm@10.15.0', pkg.packageManager === 'pnpm@10.15.0', `packageManager changed to ${pkg.packageManager ?? 'undefined'}`);
  check('node engine remains >=22 <23', pkg.engines?.node === '>=22 <23', 'root package engines.node must remain >=22 <23');
  for (const script of ['lockfile:check', 'lockfile:policy', 'pass:r1:source-check', 'pass:r1:certify', 'pass:r1:certify:sh', 'pass:r1:certify:ps']) {
    check(`package script exists: ${script}`, Boolean(pkg.scripts?.[script]), `package.json missing script ${script}`);
  }
}

if (existsSync(resolve(root, '.node-version'))) {
  check('.node-version pins Node 22', read('.node-version').trim().startsWith('22.'), '.node-version must remain on Node 22');
}
if (existsSync(resolve(root, '.nvmrc'))) {
  check('.nvmrc pins Node 22', read('.nvmrc').trim().startsWith('22.'), '.nvmrc must remain on Node 22');
}

if (existsSync(resolve(root, '.npmrc'))) {
  const npmrc = read('.npmrc');
  for (const required of ['engine-strict=true', 'shared-workspace-lockfile=true', 'strict-peer-dependencies=false']) {
    check(`.npmrc contains ${required}`, npmrc.includes(required), `.npmrc missing ${required}`);
  }
}

if (existsSync(resolve(root, 'pnpm-workspace.yaml'))) {
  const workspace = read('pnpm-workspace.yaml');
  for (const workspaceName of ['frontend', 'backend', 'worker', 'shared', 'database']) {
    check(`workspace includes ${workspaceName}`, workspace.includes(`- ${workspaceName}`), `pnpm-workspace.yaml missing ${workspaceName}`);
  }
}

for (const workspacePkg of ['frontend/package.json', 'backend/package.json', 'worker/package.json', 'shared/package.json', 'database/package.json']) {
  if (!existsSync(resolve(root, workspacePkg))) continue;
  const pkg = readJson(workspacePkg);
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  for (const [name, version] of Object.entries(deps)) {
    if (name.startsWith('@nexora/')) {
      check(`${workspacePkg} uses workspace protocol for ${name}`, version === 'workspace:*', `${workspacePkg} must reference ${name} as workspace:*`);
    }
  }
}

const forbiddenRootLockfiles = ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'bun.lockb', 'bun.lock'];
for (const lockfile of forbiddenRootLockfiles) {
  check(`forbidden root lockfile absent: ${lockfile}`, !existsSync(resolve(root, lockfile)), `forbidden root lockfile present: ${lockfile}`);
}

for (const workspace of ['frontend', 'backend', 'worker', 'shared', 'database']) {
  for (const lockfile of ['pnpm-lock.yaml', 'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'bun.lockb', 'bun.lock']) {
    check(`no workspace-local lockfile ${workspace}/${lockfile}`, !existsSync(resolve(root, workspace, lockfile)), `workspace-local lockfile is forbidden: ${workspace}/${lockfile}`);
  }
}

for (const dockerfile of ['infrastructure/docker/frontend.Dockerfile', 'infrastructure/docker/backend.Dockerfile', 'infrastructure/docker/worker.Dockerfile']) {
  if (!existsSync(resolve(root, dockerfile))) continue;
  const text = read(dockerfile);
  check(`${dockerfile} copies pnpm-lock.yaml`, text.includes('pnpm-lock.yaml'), `${dockerfile} must copy pnpm-lock.yaml`);
  check(`${dockerfile} uses frozen lockfile install`, text.includes('pnpm install --frozen-lockfile'), `${dockerfile} must use pnpm install --frozen-lockfile`);
}

if (existsSync(resolve(root, '.github/workflows/ci.yml'))) {
  const ci = read('.github/workflows/ci.yml');
  check('CI uses pnpm/action-setup@v4', ci.includes('pnpm/action-setup@v4'), 'CI must set up pnpm using pnpm/action-setup@v4');
  check('CI uses Node 22', ci.includes('node-version: 22'), 'CI must use Node 22');
  check('CI checks lockfile policy', ci.includes('check-lockfile-policy.mjs'), 'CI must explicitly check lockfile policy');
  check('CI uses frozen install', ci.includes('pnpm install --frozen-lockfile'), 'CI must run pnpm install --frozen-lockfile');
}

const rootLockfile = existsSync(resolve(root, 'pnpm-lock.yaml'));
check('root pnpm-lock.yaml presence', rootLockfile, 'pnpm-lock.yaml is not present yet; generate it with pnpm on a connected machine.', sourceOnly);
if (rootLockfile) {
  const lockfile = read('pnpm-lock.yaml');
  check('pnpm-lock.yaml has lockfileVersion', /^lockfileVersion:/m.test(lockfile), 'pnpm-lock.yaml missing lockfileVersion');
  check('pnpm-lock.yaml has importers', /^importers:/m.test(lockfile), 'pnpm-lock.yaml missing importers section');
  for (const importer of ['.', 'frontend', 'backend', 'worker', 'shared', 'database']) {
    const pattern = new RegExp(`^\\s{2}${importer.replace('.', '\\.')}:`, 'm');
    check(`pnpm-lock.yaml includes importer ${importer}`, pattern.test(lockfile), `pnpm-lock.yaml missing importer ${importer}`);
  }
}

const output = {
  pass: 'R1',
  name: 'Dependency and lockfile repair',
  mode: sourceOnly ? 'source-only' : 'strict',
  status: failures.length === 0 ? (warnings.length === 0 ? 'PASS' : 'PASS_WITH_BLOCKERS') : 'FAIL',
  checkedAt: new Date().toISOString(),
  root: relative(process.cwd(), root) || '.', 
  lockfilePresent: rootLockfile,
  checked,
  warnings,
  failures,
  nextAction: rootLockfile
    ? 'Run scripts/pass-r1-dependency-lockfile-certify.* to prove frozen install and dependency-backed gates.'
    : 'Run scripts/pass-r1-dependency-lockfile-certify.ps1 on a connected machine to generate the real pnpm-lock.yaml and certify R1.'
};

mkdirSync(resolve(root, 'certification-output'), { recursive: true });
writeFileSync(resolve(root, sourceOnly ? 'certification-output/pass-r1-source-side-certification.json' : 'certification-output/pass-r1-dependency-lockfile-repair-check.json'), `${JSON.stringify(output, null, 2)}\n`);

if (failures.length > 0) {
  console.error('PASS R1 dependency/lockfile repair gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn('PASS R1 source-preparation gate PASSED with active blockers:');
  for (const warning of warnings) console.warn(`- ${warning}`);
} else {
  console.log('PASS R1 dependency/lockfile repair gate PASSED');
}
