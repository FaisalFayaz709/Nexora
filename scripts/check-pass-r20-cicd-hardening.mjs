#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const failures = [];
const warnings = [];
const checked = [];

function file(path) { return join(root, path); }
function exists(path) { return existsSync(file(path)); }
function read(path) { return readFileSync(file(path), 'utf8'); }
function requireFile(path) {
  checked.push(`file:${path}`);
  if (!exists(path)) failures.push(`Missing R20 required file: ${path}`);
}
function requireText(path, marker) {
  requireFile(path);
  if (exists(path) && !read(path).includes(marker)) failures.push(`Missing marker in ${path}: ${marker}`);
}
function requireAnyText(path, markers, label) {
  requireFile(path);
  if (exists(path) && !markers.some((marker) => read(path).includes(marker))) {
    failures.push(`Missing ${label} in ${path}; expected one of: ${markers.join(' | ')}`);
  }
}
function walk(dir) {
  const abs = file(dir);
  const out = [];
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    const p = join(abs, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(relative(root, p).replace(/\\/g, '/')));
    else out.push(relative(root, p).replace(/\\/g, '/'));
  }
  return out;
}

const requiredFiles = [
  '.github/workflows/ci-cd-hardening.yml',
  '.github/workflows/ci.yml',
  '.github/workflows/codeql.yml',
  '.github/workflows/semgrep.yml',
  '.github/workflows/runtime-certification.yml',
  '.github/dependabot.yml',
  '.github/CODEOWNERS',
  '.github/pull_request_template.md',
  'scripts/check-pass-r20-cicd-hardening.mjs',
  'scripts/pass-r20-cicd-hardening-certify.sh',
  'scripts/pass-r20-cicd-hardening-certify.ps1',
  'docs/production/CI_CD_HARDENING_RUNBOOK.md',
  'docs/production/BRANCH_PROTECTION_RULES.md',
  'docs/production/RELEASE_GATE_POLICY.md',
];
for (const path of requiredFiles) requireFile(path);

const hardened = exists('.github/workflows/ci-cd-hardening.yml') ? read('.github/workflows/ci-cd-hardening.yml') : '';
const hardenedMarkers = [
  'R20 CI/CD Hardened Gate',
  'pull_request:',
  'push:',
  'branches: [main]',
  'workflow_dispatch:',
  'concurrency:',
  'source-architecture-gates:',
  'install-quality-test-build:',
  'frontend-appendix-g-gates:',
  'backend-boundary-security-gates:',
  'docker-build-and-smoke:',
  'e2e-smoke-source-and-optional-runtime:',
  'r20-gate-summary:',
  'pnpm install --frozen-lockfile',
  'pnpm verify:static',
  'pnpm format:check',
  'pnpm lint',
  'pnpm typecheck',
  'pnpm db:validate',
  'pnpm db:generate',
  'pnpm db:migrate:status',
  'pnpm test',
  'pnpm build',
  'pnpm audit --audit-level high',
  'docker compose config',
  'docker compose build web api worker',
  'pnpm full-workflow:e2e:check',
  'pnpm test:e2e:browser',
  'actions/upload-artifact@v4',
  'node scripts/check-pass-r20-cicd-hardening.mjs --source-only',
];
for (const marker of hardenedMarkers) {
  if (!hardened.includes(marker)) failures.push(`Hardened workflow missing marker: ${marker}`);
}

for (let i = 0; i <= 19; i++) {
  const marker = i === 0
    ? 'check-pass-r0-source-of-truth-rebase.mjs'
    : `check-pass-r${i}-`;
  if (!hardened.includes(marker) && !hardened.includes(`pass:r${i}:source-check`)) {
    failures.push(`Hardened workflow missing source gate for R${i}.`);
  }
}

const frontendGateMarkers = [
  'check-pass-r3-route-group-shell-compliance.mjs',
  'check-pass-r4-central-api-query-system.mjs',
  'check-pass-r6-screen-contracts.mjs',
  'check-pass-r7-tanstack-grids.mjs',
  'check-pass-r8-rhf-zod-forms.mjs',
  'check-route-coverage.mjs',
];
for (const marker of frontendGateMarkers) if (!hardened.includes(marker)) failures.push(`Frontend Appendix G gate missing: ${marker}`);

const backendSecurityMarkers = [
  'check-pass-r17-backend-boundary-transaction-audit.mjs',
  'pnpm security:check',
  'pnpm audit --audit-level high',
  'check-route-coverage.mjs',
];
for (const marker of backendSecurityMarkers) if (!hardened.includes(marker)) failures.push(`Backend/security gate missing: ${marker}`);

const ci = exists('.github/workflows/ci.yml') ? read('.github/workflows/ci.yml') : '';
if (!ci.includes('R20 CI/CD hardening source gate')) failures.push('Existing CI workflow missing R20 source gate.');
if (!ci.includes('node scripts/check-pass-r20-cicd-hardening.mjs --source-only')) failures.push('Existing CI workflow does not run R20 checker.');

const runtime = exists('.github/workflows/runtime-certification.yml') ? read('.github/workflows/runtime-certification.yml') : '';
if (!runtime.includes('R20 CI/CD hardening source gate')) failures.push('Runtime certification workflow missing R20 preflight source gate.');
if (!runtime.includes('bash scripts/pass-r19-docker-runtime-certification.sh')) failures.push('Runtime certification workflow no longer runs R19 runtime certification.');

const codeql = exists('.github/workflows/codeql.yml') ? read('.github/workflows/codeql.yml') : '';
for (const marker of ['CodeQL', 'github/codeql-action/init@v3', 'github/codeql-action/analyze@v3', 'javascript-typescript']) {
  if (!codeql.includes(marker)) failures.push(`CodeQL workflow missing marker: ${marker}`);
}
const semgrep = exists('.github/workflows/semgrep.yml') ? read('.github/workflows/semgrep.yml') : '';
for (const marker of ['Semgrep', 'semgrep/semgrep-action', 'p/owasp-top-ten', 'security-events: write']) {
  if (!semgrep.includes(marker)) failures.push(`Semgrep workflow missing marker: ${marker}`);
}
const dependabot = exists('.github/dependabot.yml') ? read('.github/dependabot.yml') : '';
for (const marker of ['package-ecosystem: npm', 'package-ecosystem: github-actions', 'groups:', 'pnpm-workspace-runtime', 'github-actions']) {
  if (!dependabot.includes(marker)) failures.push(`Dependabot config missing marker: ${marker}`);
}

const pr = exists('.github/pull_request_template.md') ? read('.github/pull_request_template.md') : '';
for (const marker of [
  'locked stack',
  'centralized API/query layer',
  'Backend routes/controllers do not access Prisma directly',
  'TanStack Table',
  'React Hook Form + Zod',
  'R20 hardened CI gate',
]) if (!pr.includes(marker)) failures.push(`PR template missing marker: ${marker}`);

const branchProtection = exists('docs/production/BRANCH_PROTECTION_RULES.md') ? read('docs/production/BRANCH_PROTECTION_RULES.md') : '';
for (const marker of [
  'Require a pull request before merging',
  'Require approvals from CODEOWNERS',
  'Require status checks to pass before merge',
  'Source architecture gates R0-R20',
  'Frozen install, quality, tests, build',
  'Appendix G frontend gates',
  'Backend boundaries and security gates',
  'Docker build and smoke',
  'CodeQL',
  'Semgrep',
]) if (!branchProtection.includes(marker)) failures.push(`Branch protection doc missing marker: ${marker}`);

const releasePolicy = exists('docs/production/RELEASE_GATE_POLICY.md') ? read('docs/production/RELEASE_GATE_POLICY.md') : '';
for (const marker of [
  'pnpm install --frozen-lockfile',
  'pnpm verify:static',
  'pnpm format:check',
  'pnpm lint',
  'pnpm typecheck',
  'pnpm db:validate',
  'pnpm db:migrate:status',
  'pnpm test',
  'pnpm build',
  'pnpm audit --audit-level high',
  'docker compose build web api worker',
  'Missing `pnpm-lock.yaml`',
  'Direct Prisma access from backend routes/controllers',
  'Raw frontend business fetch outside the central API client',
]) if (!releasePolicy.includes(marker)) failures.push(`Release policy missing marker: ${marker}`);

const pkg = exists('package.json') ? JSON.parse(read('package.json')) : { scripts: {} };
const requiredScripts = [
  'ci:hardening:check',
  'pass:r20:source-check',
  'pass:r20:certify',
  'pass:r20:certify:sh',
  'pass:r20:certify:ps',
];
for (const script of requiredScripts) {
  if (!pkg.scripts?.[script]) failures.push(`package.json missing R20 script: ${script}`);
}
if (!String(pkg.scripts?.['verify:static'] ?? '').includes('pass:r20:source-check')) failures.push('verify:static does not include pass:r20:source-check.');
if (!String(pkg.scripts?.verify ?? '').includes('pass:r20:source-check')) failures.push('verify does not include pass:r20:source-check.');

for (const path of ['scripts/pass-r20-cicd-hardening-certify.sh', 'scripts/pass-r20-cicd-hardening-certify.ps1']) {
  requireText(path, 'R20_CI_CD_HARDENING');
  requireText(path, 'check-pass-r20-cicd-hardening.mjs --source-only');
  requireText(path, 'certification-output');
}

const counts = {
  workflows: walk('.github/workflows').filter((p) => p.endsWith('.yml') || p.endsWith('.yaml')).length,
  frontendPages: walk('frontend/src/app').filter((p) => p.endsWith('/page.tsx')).length,
  screenContracts: walk('docs/frontend-screens').filter((p) => p.endsWith('.md') && !p.includes('_screen-contract-template')).length,
  backendRoutes: walk('backend/src').filter((p) => p.endsWith('.routes.ts')).length,
  sourceGateScripts: walk('scripts').filter((p) => /^scripts\/check-pass-r\d+/.test(p)).length,
};

if (!exists('pnpm-lock.yaml')) warnings.push('pnpm-lock.yaml is still missing; hardened CI will intentionally fail frozen install until the lockfile is generated and committed.');
if (sourceOnly) warnings.push('R20 source gate verifies CI/CD source configuration only; it does not prove live GitHub Actions execution.');

const status = failures.length ? 'FAIL' : 'PASS_SOURCE_LEVEL_CI_CD_HARDENING_READY';
const result = {
  pass: 'R20',
  name: 'CI/CD Hardening',
  status,
  sourceOnly,
  checkedAt: new Date().toISOString(),
  lockedStackChanged: false,
  requiredWorkflow: '.github/workflows/ci-cd-hardening.yml',
  counts,
  warnings,
  failures,
  checked,
  nextPass: 'R21 Final blueprint compliance audit',
};
mkdirSync(file('certification-output'), { recursive: true });
writeFileSync(file('certification-output/pass-r20-cicd-hardening-source-gate.json'), JSON.stringify(result, null, 2));

if (failures.length) {
  console.error(`R20 CI/CD hardening gate failed with ${failures.length} failure(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('R20 CI/CD hardening gate passed.');
console.log(JSON.stringify(result, null, 2));
