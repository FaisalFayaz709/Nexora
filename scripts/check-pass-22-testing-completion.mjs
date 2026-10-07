#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const checks = [];
const failures = [];
const blockers = [];
const warnings = [];
const gateRuns = [];

function pathOf(p) { return join(root, p); }
function hasFile(p) { return existsSync(pathOf(p)); }
function read(p) { return readFileSync(pathOf(p), 'utf8'); }
function check(name, passed, message = '', options = {}) {
  checks.push({ name, passed, message, blocker: Boolean(options.blocker) });
  if (!passed) {
    const line = `${name}${message ? ` — ${message}` : ''}`;
    if (options.blocker) blockers.push(line);
    else failures.push(line);
  }
}
function includesAll(name, path, required) {
  if (!hasFile(path)) {
    check(name, false, `Missing file: ${path}`);
    return;
  }
  const body = read(path);
  const missing = required.filter((marker) => !body.includes(marker));
  check(name, missing.length === 0, missing.length ? `Missing marker(s): ${missing.join(', ')}` : '');
}
function walk(dir) {
  const abs = pathOf(dir);
  const out = [];
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    if (['node_modules', '.next', 'dist', 'coverage', '.turbo'].includes(name)) continue;
    const p = join(abs, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(relative(root, p).split('\\').join('/')));
    else out.push(p);
  }
  return out;
}
function runGate(name, args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 180000 });
  gateRuns.push({ name, args, status: result.status ?? 1 });
  check(name, result.status === 0, result.status === 0 ? '' : `${args.join(' ')} failed with status ${result.status}. ${(result.stderr || result.stdout || '').slice(0, 2200)}`);
}
function previousEvidence(path) {
  if (!hasFile(path)) {
    if (sourceOnly) return;
    check(`previous pass evidence exists: ${path}`, false, `${path} is missing.`, { blocker: true });
    return;
  }
  let status = read(path);
  try { const parsed = JSON.parse(status); status = parsed.status ?? parsed.result ?? status; } catch {}
  const failed = String(status).includes('FAIL');
  check(`previous pass evidence is not failed: ${path}`, !failed, `${path} status ${status}.`, { blocker: !sourceOnly && failed });
}

mkdirSync(pathOf('certification-output'), { recursive: true });

if (!sourceOnly) {
  check('root pnpm-lock.yaml exists for strict PASS 22 runtime certification', hasFile('pnpm-lock.yaml'), 'pnpm-lock.yaml is missing; run pnpm install from root and commit the lockfile before claiming testing GO.', { blocker: true });
} else if (!hasFile('pnpm-lock.yaml')) {
  warnings.push('pnpm-lock.yaml is missing. Source-only PASS 22 can pass, but runtime testing GO remains blocked.');
}

runGate('PASS 21 security hardening source gate', ['scripts/check-pass-21-security-hardening-certification.mjs', '--source-only']);
runGate('R18 legacy test completion source gate', ['scripts/check-pass-r18-test-completion.mjs', '--source-only']);

const requiredFiles = [
  'shared/src/contracts/testing/pass-22-testing-completion.contracts.ts',
  'shared/src/contracts/testing/pass-22-testing-completion.contracts.test.ts',
  'backend/src/modules/test-completion/pass-22-testing-completion-policy.ts',
  'backend/src/modules/test-completion/pass-22-testing-completion-policy.test.ts',
  'frontend/src/modules/testing/pass-22-frontend-test-completion-policy.ts',
  'frontend/src/modules/testing/pass-22-frontend-test-completion-policy.test.ts',
  'tests/e2e/TESTING_COMPLETION_FULL_LIFECYCLE.md',
  'tests/e2e/playwright/pass-22-full-lifecycle.spec.ts',
  'tests/e2e/playwright/critical-workflows.spec.ts',
  'tests/e2e/playwright.config.ts',
  'docs/testing/TESTING_COMPLETION_MATRIX.md',
  'docs/testing/CRITICAL_WORKFLOW_TEST_COMPLETION_MATRIX.md',
  'docs/security/SECURITY_SMOKE_MATRIX.md',
  'scripts/check-pass-22-testing-completion.mjs',
  'scripts/pass-22-testing-completion-certify.sh',
  'scripts/pass-22-testing-completion-certify.ps1',
  'scripts/security-smoke-certify.mjs',
  'scripts/backup-restore-certify.sh',
  'scripts/full-workflow-e2e-certify.mjs',
  'docs/contracts/capability-locks/pass-22-testing-completion.json',
  '.github/workflows/ci.yml',
];
for (const f of requiredFiles) check(`PASS 22 required file exists: ${f}`, hasFile(f), `${f} is required.`);

const layerMarkers = [
  'PASS_22_TESTING_COMPLETION',
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
];
const scenarioMarkers = [
  'PASS22-LOGIN-CORE-PLATFORM',
  'PASS22-CUSTOMER-PROJECT-BOM-MATERIAL-REQUEST',
  'PASS22-PROCUREMENT-PR-RFQ-PO-GRN-STOCK',
  'PASS22-ASSET-INSTALLATION-QR-MAINTENANCE',
  'PASS22-TICKET-WORKORDER-SERVICE-PARTS-CLOSE',
  'PASS22-FINANCE-INVOICE-POST-PAYMENT-AGING',
  'PASS22-SUPPLIER-INVOICE-THREE-WAY-MATCH',
  'PASS22-DOCUMENT-MINIO-REPORT-WORKER',
  'PASS22-PORTAL-SCOPES-OFFLINE-SYNC',
  'PASS22-SECURITY-CROSS-TENANT-MAKER-CHECKER',
  'PASS22-FULL-LIFECYCLE-DASHBOARD-PROFITABILITY',
];

for (const p of [
  'shared/src/contracts/testing/pass-22-testing-completion.contracts.ts',
  'docs/testing/TESTING_COMPLETION_MATRIX.md',
  'tests/e2e/TESTING_COMPLETION_FULL_LIFECYCLE.md',
]) includesAll(`PASS 22 layer and scenario markers locked in ${p}`, p, [...layerMarkers, ...scenarioMarkers]);

includesAll('PASS 22 backend policy keeps source-only honesty and strict runtime release decision', 'backend/src/modules/test-completion/pass-22-testing-completion-policy.ts', [
  'evaluatePass22TestingReleaseDecision',
  'HOLD_TESTING_RUNTIME_EVIDENCE_REQUIRED',
  'GO_TESTING_RUNTIME_CERTIFIED',
  'sourceGateIsNotRuntimeCertification',
  'cannotClaimProductionReadiness',
  'lockfilePresent',
  'frozenInstallPassed',
  'browserE2ePassed',
  'backupRestorePassed',
]);
includesAll('PASS 22 frontend policy locks shell/form/grid/portal/PWA test obligations', 'frontend/src/modules/testing/pass-22-frontend-test-completion-policy.ts', [
  'PASS_22_TESTING_COMPLETION_FRONTEND',
  'AppShell',
  'React Hook Form',
  'TanStack Table',
  'PortalShell',
  'TechnicianPwaShell',
  'OfflineProvider',
]);
includesAll('PASS 22 Playwright spec is runtime-gated and cannot fake E2E', 'tests/e2e/playwright/pass-22-full-lifecycle.spec.ts', [
  'RUN_BROWSER_E2E',
  'Source-only PASS_22 must not pretend browser E2E ran',
  'PASS22-FULL-LIFECYCLE-DASHBOARD-PROFITABILITY',
  'PASS22-PORTAL-SCOPES-OFFLINE-SYNC',
  '@playwright/test',
]);

const allTests = [
  ...walk('backend/src'),
  ...walk('frontend/src'),
  ...walk('shared/src'),
  ...walk('worker/src'),
  ...walk('database/tests'),
].filter((p) => /\.(test|spec)\.(ts|tsx|mjs|js)$/.test(p));
const backendTests = allTests.filter((p) => p.includes('/backend/src/'));
const frontendTests = allTests.filter((p) => p.includes('/frontend/src/'));
const sharedTests = allTests.filter((p) => p.includes('/shared/src/'));
const workerTests = allTests.filter((p) => p.includes('/worker/src/'));
const databaseTests = allTests.filter((p) => p.includes('/database/tests/'));
const integrationTests = allTests.filter((p) => /\.integration\.test\.(ts|tsx|mjs|js)$/.test(p));

check('PASS 22 broad source test count', allTests.length >= 145, `Expected at least 145 test/spec files; found ${allTests.length}.`);
check('PASS 22 backend test breadth', backendTests.length >= 120, `Expected at least 120 backend tests; found ${backendTests.length}.`);
check('PASS 22 frontend test coverage exists', frontendTests.length >= 5, `Expected at least 5 frontend tests; found ${frontendTests.length}.`);
check('PASS 22 shared contract tests exist', sharedTests.length >= 7, `Expected at least 7 shared tests; found ${sharedTests.length}.`);
check('PASS 22 database migration/schema tests exist', databaseTests.length >= 1, `Expected at least 1 database test; found ${databaseTests.length}.`);
check('PASS 22 integration suite count', integrationTests.length >= 35, `Expected at least 35 integration tests; found ${integrationTests.length}.`);

for (const p of integrationTests) {
  const body = read(relative(root, p).split('\\').join('/'));
  if (body.includes('describe.skip') || body.includes('it.skip') || body.includes('test.skip')) failures.push(`Skipped integration suite remains: ${relative(root, p).split('\\').join('/')}`);
  if (body.includes('expect(true).toBe(true)')) failures.push(`Placeholder assertion remains: ${relative(root, p).split('\\').join('/')}`);
}

const packageJson = JSON.parse(read('package.json'));
for (const script of [
  'pass:22:source-check',
  'pass:22:check',
  'pass:22:certify',
  'pass:22:certify:sh',
  'pass:22:certify:ps',
  'test:completion:check',
  'test:e2e:browser',
  'security:smoke:certify',
]) check(`package.json script exists: ${script}`, Boolean(packageJson.scripts?.[script]), `${script} missing.`);
check('verify:static includes PASS 22 source gate', String(packageJson.scripts?.['verify:static'] ?? '').includes('pass:22:source-check'), 'verify:static must include pass:22:source-check.');
check('verify includes PASS 22 source gate', String(packageJson.scripts?.verify ?? '').includes('pass:22:source-check'), 'verify must include pass:22:source-check.');
check('CI includes PASS 22 source gate', hasFile('.github/workflows/ci.yml') && read('.github/workflows/ci.yml').includes('PASS 22 testing completion source gate'), 'CI must run the PASS 22 source gate.');

const result = {
  pass: 'PASS_22',
  name: 'Testing Completion',
  sourceOnly,
  status: failures.length || blockers.length ? 'FAIL' : sourceOnly ? 'PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME' : 'PASS_SOURCE_LEVEL_RUNTIME_GATES_PENDING',
  checkedAt: new Date().toISOString(),
  counts: {
    checks: checks.length,
    passed: checks.filter((c) => c.passed).length,
    failures: failures.length,
    blockers: blockers.length,
    warnings: warnings.length,
    testFiles: allTests.length,
    backendTests: backendTests.length,
    frontendTests: frontendTests.length,
    sharedTests: sharedTests.length,
    workerTests: workerTests.length,
    databaseTests: databaseTests.length,
    integrationTests: integrationTests.length,
    criticalWorkflowScenarios: scenarioMarkers.length,
  },
  gates: gateRuns,
  enforcedRules: [
    'All blueprint test layers are locked at source level.',
    'Critical lifecycle scenarios from core platform through finance, portals, offline sync and dashboards are represented.',
    'Browser E2E remains runtime-gated and cannot be claimed in source-only mode.',
    'Strict testing GO requires lockfile, frozen install, typecheck, lint, tests, migrations, seed, E2E, security, performance and backup/restore evidence.',
    'Tests preserve Fastify /api/v1, Next.js frontend, shared contracts, Prisma/PostgreSQL, MinIO, Redis/BullMQ side-effect boundaries, RBAC, tenant isolation, audit and transactions.',
  ],
  warnings,
  failures,
  blockers,
  checks,
  limitations: [
    'This source gate does not execute pnpm install, typecheck, lint, unit tests, integration tests, browser E2E, Docker runtime, migrations, seed, performance smoke or backup/restore.',
    'Final GO remains blocked until pnpm-lock.yaml and runtime evidence are produced on a real local/CI environment.',
  ],
};
writeFileSync(pathOf('certification-output/pass-22-testing-completion.json'), JSON.stringify(result, null, 2));
writeFileSync(pathOf('certification-output/PASS_22_TESTING_COMPLETION_LOG.txt'), `${result.status}\nChecks run: ${result.counts.checks}\nChecks passed: ${result.counts.passed}\nFailures: ${failures.length}\nBlockers: ${blockers.length}\nTest files: ${allTests.length}\nIntegration tests: ${integrationTests.length}\n`);
if (failures.length || blockers.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
