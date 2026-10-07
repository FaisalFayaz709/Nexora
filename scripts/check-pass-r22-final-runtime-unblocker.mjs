#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const failures = [];
const warnings = [];
const holdBlockers = [];
const checks = [];

function file(path) { return join(root, path); }
function exists(path) { return existsSync(file(path)); }
function read(path) { return readFileSync(file(path), 'utf8'); }
function requireFile(path) {
  checks.push({ type: 'file', path });
  if (!exists(path)) failures.push(`Missing required file: ${path}`);
}
function requireText(path, text, label = text) {
  requireFile(path);
  if (exists(path) && !read(path).includes(text)) failures.push(`${path} missing required marker: ${label}`);
}
function walk(dir) {
  const abs = file(dir);
  const out = [];
  if (!existsSync(abs)) return out;
  const skip = new Set(['node_modules', '.git', '.next', 'dist', 'coverage']);
  for (const name of readdirSync(abs)) {
    if (skip.has(name)) continue;
    const p = join(abs, name);
    const st = statSync(p);
    const rel = relative(root, p).replace(/\\/g, '/');
    if (st.isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}
function count(dir, predicate) { return walk(dir).filter(predicate).length; }

const requiredFiles = [
  'docs/production/FINAL_RUNTIME_COMMAND_SEQUENCE.md',
  'docs/production/FINAL_RUNTIME_CERTIFICATION_HANDOFF.md',
  'scripts/check-pass-r22-final-runtime-unblocker.mjs',
  'scripts/pass-r22-final-runtime-unblocker.sh',
  'scripts/pass-r22-final-runtime-unblocker.ps1',
];
requiredFiles.forEach(requireFile);

requireText('docs/production/FINAL_RUNTIME_COMMAND_SEQUENCE.md', 'pnpm install --frozen-lockfile', 'frozen install command');
requireText('docs/production/FINAL_RUNTIME_COMMAND_SEQUENCE.md', 'docker compose up -d', 'docker runtime command');
requireText('docs/production/FINAL_RUNTIME_COMMAND_SEQUENCE.md', 'pnpm test:e2e:browser:strict', 'strict E2E command');
requireText('docs/production/FINAL_RUNTIME_CERTIFICATION_HANDOFF.md', 'GO_CANDIDATE_RUNTIME_CERTIFIED', 'runtime GO candidate decision marker');
requireText('scripts/pass-r22-final-runtime-unblocker.sh', 'pnpm install --frozen-lockfile', 'bash frozen install');
requireText('scripts/pass-r22-final-runtime-unblocker.sh', 'docker compose up -d', 'bash docker up');
requireText('scripts/pass-r22-final-runtime-unblocker.ps1', 'pnpm install --frozen-lockfile', 'PowerShell frozen install');
requireText('scripts/pass-r22-final-runtime-unblocker.ps1', 'docker compose up -d', 'PowerShell docker up');

const pkg = exists('package.json') ? JSON.parse(read('package.json')) : { scripts: {}, packageManager: '' };
if (!pkg.packageManager?.startsWith('pnpm@')) failures.push('package.json must retain pnpm packageManager.');
['pass:r22:source-check', 'pass:r22:certify', 'pass:r22:certify:sh', 'pass:r22:certify:ps'].forEach((script) => {
  if (!pkg.scripts?.[script]) failures.push(`package.json missing script ${script}`);
});

const pageCount = count('frontend/src/app', (p) => p.endsWith('/page.tsx'));
const screenContractCount = count('docs/frontend-screens', (p) => p.endsWith('.md') && !p.endsWith('_screen-contract-template.md') && !p.endsWith('/index.md'));
const backendRouteCount = count('backend/src', (p) => p.endsWith('.routes.ts'));
const testCount = count('.', (p) => /\.(test|spec)\.(ts|tsx|mjs)$/.test(p));

if (!exists('pnpm-lock.yaml')) {
  holdBlockers.push('pnpm-lock.yaml is missing. Generate it on a network-enabled machine with pnpm install and commit it.');
}
const runtimeEvidence = [
  'certification-output/pass-r22-final-runtime-unblocker/r22-final-runtime-result.json',
  'certification-output/pass-r22-final-runtime-unblocker/r22-final-runtime.log',
  'certification-output/pass-r22-final-runtime-unblocker/r22-step-summary.tsv',
];
const missingRuntimeEvidence = runtimeEvidence.filter((p) => !exists(p));
if (missingRuntimeEvidence.length) {
  holdBlockers.push(`Runtime evidence is not present yet: ${missingRuntimeEvidence.join(', ')}`);
}

if (sourceOnly) warnings.push('R22 source gate verifies final handoff artifacts. It does not run pnpm, Docker, migrations, E2E or security smoke.');

const status = failures.length
  ? 'FAIL_SOURCE_LEVEL_FINAL_RUNTIME_HANDOFF'
  : holdBlockers.length
    ? 'PASS_SOURCE_LEVEL_FINAL_RUNTIME_HANDOFF_READY'
    : 'GO_CANDIDATE_RUNTIME_CERTIFIED';

const result = {
  pass: 'R22',
  name: 'Final runtime unblocker and production certification handoff',
  status,
  sourceOnly,
  checkedAt: new Date().toISOString(),
  productionGoClaimed: status === 'GO_CANDIDATE_RUNTIME_CERTIFIED',
  lockedStackChanged: false,
  counts: {
    frontendRoutePages: pageCount,
    screenContracts: screenContractCount,
    backendRouteFiles: backendRouteCount,
    testFiles: testCount,
  },
  holdBlockers,
  warnings,
  failures,
  checks,
};

mkdirSync(file('certification-output/pass-r22-final-runtime-unblocker'), { recursive: true });
writeFileSync(file('certification-output/pass-r22-final-runtime-unblocker/r22-source-check-result.json'), JSON.stringify(result, null, 2));
writeFileSync(file('certification-output/pass-r22-final-runtime-unblocker/r22-source-check-summary.tsv'), [
  'key\tvalue',
  `status\t${status}`,
  `frontendRoutePages\t${pageCount}`,
  `screenContracts\t${screenContractCount}`,
  `backendRouteFiles\t${backendRouteCount}`,
  `testFiles\t${testCount}`,
  `holdBlockers\t${holdBlockers.length}`,
  `failures\t${failures.length}`,
].join('\n') + '\n');

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
