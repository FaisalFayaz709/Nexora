#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const failures = [];
const warnings = [];

function file(path) { return join(root, path); }
function exists(path) { return existsSync(file(path)); }
function read(path) { return readFileSync(file(path), 'utf8'); }
function walk(dir) {
  const abs = file(dir);
  const out = [];
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    const p = join(abs, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(relative(root, p).replace(/\\/g, '/')));
    else out.push(p);
  }
  return out;
}
function requireFile(path) { if (!exists(path)) failures.push(`Missing R18 artifact: ${path}`); }
function requireText(path, marker) {
  if (!exists(path)) failures.push(`Missing file for marker ${marker}: ${path}`);
  else if (!read(path).includes(marker)) failures.push(`Missing marker in ${path}: ${marker}`);
}

const requiredFiles = [
  'shared/src/contracts/e2e-certification/r18-test-completion.contracts.ts',
  'shared/src/contracts/e2e-certification/r18-test-completion.contracts.test.ts',
  'backend/src/modules/test-completion/r18-test-completion-policy.ts',
  'backend/src/modules/test-completion/r18-test-completion-policy.test.ts',
  'backend/src/modules/test-completion/r18-critical-workflow-executable.integration.test.ts',
  'frontend/src/modules/testing/r18-frontend-test-completion-policy.ts',
  'frontend/src/modules/testing/r18-frontend-test-completion-policy.test.ts',
  'tests/e2e/playwright.config.ts',
  'tests/e2e/playwright/critical-workflows.spec.ts',
  'tests/e2e/CRITICAL_WORKFLOW_TEST_COMPLETION.md',
  'docs/testing/CRITICAL_WORKFLOW_TEST_COMPLETION_MATRIX.md',
  'scripts/pass-r18-test-completion-certify.sh',
  'scripts/pass-r18-test-completion-certify.ps1',
];
for (const path of requiredFiles) requireFile(path);

const markers = [
  'R18_TEST_COMPLETION',
  'UNIT_BUSINESS_RULES',
  'REPOSITORY_POSTGRES_INTEGRATION',
  'FASTIFY_API_INTEGRATION',
  'CROSS_MODULE_WORKFLOW_INTEGRATION',
  'FRONTEND_COMPONENT_AND_HOOKS',
  'BROWSER_E2E_FULL_STACK',
  'SECURITY_ABUSE_AUTHORIZATION',
  'MIGRATION_SCHEMA_EVOLUTION',
  'PERFORMANCE_CRITICAL_PATHS',
  'BACKUP_RESTORE_OPERATIONAL_RECOVERY',
  'R18-PR-APPROVAL-RFQ-PO-GRN-STOCK',
  'R18-PROJECT-BOM-MATERIAL-REQUEST-PROCUREMENT',
  'R18-STOCK-RECEIPT-ASSET-INSTALLATION-QR',
  'R18-TICKET-WORK-ORDER-SERVICE-PARTS-CLOSE',
  'R18-INVOICE-APPROVAL-POST-PAYMENT-ALLOCATION',
  'R18-SUPPLIER-INVOICE-THREE-WAY-MATCH-PAYMENT',
  'R18-TECHNICIAN-OFFLINE-SYNC-REPLAY-CONFLICT',
  'R18-CROSS-TENANT-IDOR-MAKER-CHECKER',
  'R18-DOCUMENT-MINIO-REPORT-WORKER-EXPORT',
  'R18-FRONTEND-SHELL-FORM-GRID-WORKFLOW-STATES',
];
for (const marker of markers) {
  requireText('shared/src/contracts/e2e-certification/r18-test-completion.contracts.ts', marker);
}
for (const marker of markers.filter((m) => m.startsWith('R18-'))) {
  requireText('backend/src/modules/test-completion/r18-critical-workflow-executable.integration.test.ts', marker);
  requireText('docs/testing/CRITICAL_WORKFLOW_TEST_COMPLETION_MATRIX.md', marker);
}

for (const marker of [
  'sourceGateIsNotRuntimeCertification: true',
  'blocksProductionUntilRuntimeEvidence: true',
  'runtimeExecuted: false',
  'cannot claim production readiness',
]) requireText('backend/src/modules/test-completion/r18-test-completion-policy.test.ts', marker);

for (const marker of [
  'RUN_BROWSER_E2E=1',
  'playwright-results.json',
  'source-only R18 must not pretend browser E2E ran',
  '@playwright/test',
]) {
  if (marker === 'playwright-results.json') requireText('tests/e2e/playwright.config.ts', marker);
  else if (marker === '@playwright/test') requireText('tests/e2e/playwright/critical-workflows.spec.ts', marker);
  else requireText('tests/e2e/playwright/critical-workflows.spec.ts', marker);
}

const packageJson = JSON.parse(read('package.json'));
for (const script of ['test:completion:check', 'test:e2e:browser', 'pass:r18:source-check', 'pass:r18:certify:sh', 'pass:r18:certify:ps']) {
  if (!packageJson.scripts?.[script]) failures.push(`package.json missing script: ${script}`);
}
if (!String(packageJson.scripts?.['verify:static'] ?? '').includes('test:completion:check')) failures.push('verify:static does not include test:completion:check.');
if (!String(packageJson.scripts?.verify ?? '').includes('test:completion:check')) failures.push('verify does not include test:completion:check.');
if (!packageJson.devDependencies?.['@playwright/test']) warnings.push('Root devDependencies does not include @playwright/test; browser E2E may require tests/e2e package install context.');

if (!exists('.github/workflows/ci.yml')) failures.push('Missing .github/workflows/ci.yml');
else if (!read('.github/workflows/ci.yml').includes('R18 test completion source gate')) failures.push('CI missing R18 test completion source gate.');

const allSource = [
  ...walk('backend/src'),
  ...walk('frontend/src'),
  ...walk('shared/src'),
  ...walk('database/tests'),
].filter((p) => /\.(test|spec)\.(ts|tsx|mjs)$/.test(p));
const backendTests = allSource.filter((p) => p.includes('/backend/src/'));
const frontendTests = allSource.filter((p) => p.includes('/frontend/src/'));
const sharedTests = allSource.filter((p) => p.includes('/shared/src/'));
const databaseTests = allSource.filter((p) => p.includes('/database/tests/'));
if (allSource.length < 120) failures.push(`Expected at least 120 source test files after R18, found ${allSource.length}.`);
if (backendTests.length < 90) failures.push(`Expected broad backend test coverage, found ${backendTests.length} backend tests.`);
if (frontendTests.length < 2) failures.push(`Expected frontend tests after R18, found ${frontendTests.length}.`);
if (sharedTests.length < 5) warnings.push(`Shared test count is low: ${sharedTests.length}.`);
if (databaseTests.length < 1) failures.push('Expected database migration/schema test coverage.');

for (const path of [
  'backend/src/modules/security-hardening/security-hardening.integration.test.ts',
  'database/tests/schema-foundation.test.mjs',
  'scripts/check-prisma-schema-migrations.mjs',
  'scripts/security-smoke-certify.mjs',
  'scripts/backup-restore-certify.sh',
  'docs/production/FULL_LIFECYCLE_E2E_RUNTIME_RUNBOOK.md',
  'scripts/full-workflow-e2e-certify.mjs',
]) requireFile(path);

for (const marker of ['create-rfq|publish|select|inspect|allocate|resolve|calculate|generate-work-order']) {
  requireText('backend/src/test/executable-workflow-scenario.ts', marker);
}

const result = {
  pass: 'R18',
  name: 'Test Completion Pass',
  sourceOnly,
  status: failures.length ? 'FAIL' : 'PASS_SOURCE_LEVEL_RUNTIME_READY',
  checkedAt: new Date().toISOString(),
  counts: {
    testFiles: allSource.length,
    backendTests: backendTests.length,
    frontendTests: frontendTests.length,
    sharedTests: sharedTests.length,
    databaseTests: databaseTests.length,
    criticalWorkflowScenarios: markers.filter((m) => m.startsWith('R18-')).length,
  },
  enforcedRules: [
    'Unit, repository, API, workflow, frontend, browser E2E, security, migration, performance and backup/restore test layers are represented.',
    'Critical ERP lifecycle workflows have executable backend scenario definitions.',
    'Browser E2E source specs exist but are gated behind RUN_BROWSER_E2E/RUNTIME_CERTIFICATION.',
    'Source-only R18 output cannot claim production readiness.',
    'R18 is wired into package scripts and CI source gates.',
  ],
  warnings,
  failures,
  limitations: [
    'This source gate does not execute pnpm install, typecheck, unit tests, integration tests, migrations, Docker runtime or browser E2E.',
    'pnpm-lock.yaml is still required before frozen install and runtime certification can be completed.',
    'Production readiness remains blocked until R19 Docker runtime, R20 CI hardening and R21 final compliance audit pass with evidence.',
  ],
};
mkdirSync(file('certification-output'), { recursive: true });
writeFileSync(file('certification-output/pass-r18-test-completion.json'), JSON.stringify(result, null, 2));
if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
