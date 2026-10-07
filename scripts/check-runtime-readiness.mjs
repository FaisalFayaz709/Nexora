import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];

const prior = spawnSync(process.execPath, ['scripts/check-route-coverage.mjs'], { cwd: root, encoding: 'utf8' });
if (prior.status !== 0) {
  console.error(prior.stdout);
  console.error(prior.stderr);
  process.exit(prior.status ?? 1);
}

function walk(dir) {
  const out = [];
  for (const item of readdirSync(dir)) {
    const path = join(dir, item);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const integrationTests = walk(join(root, 'backend/src/modules'))
  .filter((path) => path.endsWith('.integration.test.ts'));
for (const file of integrationTests) {
  const source = readFileSync(file, 'utf8');
  if (source.includes('describe.skip') || source.includes('it.skip') || source.includes('test.skip')) {
    failures.push(`Skipped integration suite remains: ${file.replace(root + '/', '')}`);
  }
  if (source.includes('expect(true).toBe(true)')) {
    failures.push(`Placeholder assertion remains: ${file.replace(root + '/', '')}`);
  }
}

for (const file of [
  'backend/src/test/runtime-acceptance.ts',
  'scripts/final-certify.sh',
  'scripts/final-certify.ps1',
  'docs/production/RUNTIME_READINESS.md',
]) {
  if (!existsSync(join(root, file))) failures.push(`Missing final remediation artifact: ${file}`);
}

const helper = readFileSync(join(root, 'backend/src/test/runtime-acceptance.ts'), 'utf8');
for (const marker of [
  'RUN_INTEGRATION_TESTS',
  'RUNTIME_CERTIFICATION',
  'runtimeAcceptanceSuite',
  'Runtime acceptance automation pending',
]) if (!helper.includes(marker)) failures.push(`Runtime acceptance helper missing marker: ${marker}`);

const finalSh = readFileSync(join(root, 'scripts/final-certify.sh'), 'utf8');
for (const marker of [
  'export RUN_INTEGRATION_TESTS=1',
  'export RUNTIME_CERTIFICATION=1',
  'require_file pnpm-lock.yaml',
  'pnpm install --frozen-lockfile',
  'pnpm test',
]) if (!finalSh.includes(marker)) failures.push(`Final certification script missing marker: ${marker}`);

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.packageManager !== 'pnpm@10.15.0') failures.push(`packageManager drifted: ${pkg.packageManager}`);
if (!pkg.scripts['final-runtime-core-controls:check']) failures.push('Missing final-runtime-core-controls:check script.');
if (!pkg.scripts['verify:static'].includes('final-runtime-core-controls:check')) failures.push('verify:static omits final runtime remediation gate.');

const schema = readFileSync(join(root, 'database/prisma/schema.prisma'), 'utf8');
if (/\bFloat\b/.test(schema)) failures.push('Float exists in Prisma schema.');

const sourceRoots = ['backend/src', 'shared/src', 'frontend/src', 'worker/src'];
for (const sourceRoot of sourceRoots) {
  const dir = join(root, sourceRoot);
  if (!existsSync(dir)) continue;
  for (const file of walk(dir).filter((path) => /\.(ts|tsx)$/.test(path))) {
    const source = readFileSync(file, 'utf8');
    if (source.includes('Prisma.max(')) failures.push(`Invalid Prisma.max usage remains: ${file.replace(root + '/', '')}`);
  }
}

if (existsSync(join(root, 'pnpm-lock.yaml'))) {
  const lock = readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8');
  if (!lock.includes('lockfileVersion:')) failures.push('pnpm-lock.yaml exists but does not look like a pnpm lockfile.');
}

if (failures.length) {
  console.error('Final runtime-readiness remediation gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Final runtime-readiness remediation gate PASSED: ${integrationTests.length} integration suites are non-skipped and non-placeholder; final certification is strict.`);
