import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const fail = (message) => {
  console.error(`Lockfile policy gate FAILED: ${message}`);
  process.exit(1);
};

const rootPkgPath = join(root, 'package.json');
if (!existsSync(rootPkgPath)) fail('missing root package.json');
const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));

if (rootPkg.packageManager !== 'pnpm@10.15.0') {
  fail(`packageManager must remain pnpm@10.15.0, found ${rootPkg.packageManager ?? 'undefined'}`);
}

const npmrcPath = join(root, '.npmrc');
if (!existsSync(npmrcPath)) fail('missing .npmrc');
const npmrc = readFileSync(npmrcPath, 'utf8');
for (const required of ['engine-strict=true', 'shared-workspace-lockfile=true']) {
  if (!npmrc.includes(required)) fail(`.npmrc missing ${required}`);
}

const workspacePath = join(root, 'pnpm-workspace.yaml');
if (!existsSync(workspacePath)) fail('missing pnpm-workspace.yaml');
const workspace = readFileSync(workspacePath, 'utf8');
for (const workspaceName of ['frontend', 'backend', 'worker', 'shared', 'database']) {
  if (!workspace.includes(`- ${workspaceName}`)) fail(`pnpm workspace missing ${workspaceName}`);
}

const forbiddenLockfiles = ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'bun.lockb', 'bun.lock'];
for (const lockfile of forbiddenLockfiles) {
  if (existsSync(join(root, lockfile))) fail(`forbidden lockfile present: ${lockfile}`);
}

for (const workspaceName of ['frontend', 'backend', 'worker', 'shared', 'database']) {
  if (existsSync(join(root, workspaceName, 'pnpm-lock.yaml'))) {
    fail(`workspace-local pnpm-lock.yaml is forbidden: ${workspaceName}/pnpm-lock.yaml`);
  }
  for (const lockfile of forbiddenLockfiles) {
    if (existsSync(join(root, workspaceName, lockfile))) {
      fail(`workspace-local forbidden lockfile present: ${workspaceName}/${lockfile}`);
    }
  }
}

const lockfilePath = join(root, 'pnpm-lock.yaml');
if (!existsSync(lockfilePath)) {
  fail('missing pnpm-lock.yaml. Generate it with scripts/pass-m1-dependency-lockfile-certify.sh or scripts/pass-m1-dependency-lockfile-certify.ps1 on a machine with registry access. Do not fabricate it.');
}

const lockfile = readFileSync(lockfilePath, 'utf8');
if (!/^lockfileVersion:/m.test(lockfile)) fail('pnpm-lock.yaml missing lockfileVersion');
if (!/^importers:/m.test(lockfile)) fail('pnpm-lock.yaml missing importers section');
for (const importer of ['.', 'frontend', 'backend', 'worker', 'shared', 'database']) {
  const pattern = new RegExp(`^\\s{2}${importer.replace('.', '\\.')}:`, 'm');
  if (!pattern.test(lockfile)) fail(`pnpm-lock.yaml missing importer ${importer}`);
}

console.log('Lockfile policy gate PASSED: pnpm workspace lockfile is present and workspace policy is intact.');
