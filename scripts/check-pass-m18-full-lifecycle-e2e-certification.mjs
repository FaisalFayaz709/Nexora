import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const errors = [];
const file = (p) => path.join(root, p);
const exists = (p) => fs.existsSync(file(p));
const text = (p) => fs.readFileSync(file(p), 'utf8');
const requireFile = (p) => {
  if (!exists(p)) errors.push(`Missing PASS M18 full lifecycle artifact: ${p}`);
};
const requireText = (p, marker) => {
  if (!exists(p)) errors.push(`Missing file for marker ${marker}: ${p}`);
  else if (!text(p).includes(marker)) errors.push(`Missing marker in ${p}: ${marker}`);
};
const runGate = (script) => {
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    errors.push(`${script} failed during PASS M18 prerequisite check.\n${result.stdout}\n${result.stderr}`);
  }
};

for (const prerequisite of [
  'scripts/check-architecture.mjs',
  'scripts/check-contracts.mjs',
  'scripts/check-full-workflow-e2e.mjs',
  'scripts/check-docker-runtime-topology.mjs',
]) runGate(prerequisite);

for (const p of [
  'shared/src/contracts/e2e-certification/e2e-certification-manifest.ts',
  'shared/src/contracts/e2e-certification/m20-full-lifecycle-runtime.contracts.ts',
  'backend/src/modules/e2e-certification/full-workflow-e2e-policy.ts',
  'backend/src/modules/e2e-certification/full-workflow-e2e.integration.test.ts',
  'backend/src/modules/e2e-certification/m20-full-lifecycle-runtime-policy.ts',
  'backend/src/modules/e2e-certification/m20-full-lifecycle-runtime-policy.test.ts',
  'frontend/src/app/(erp)/e2e-certification/page.tsx',
  'frontend/src/modules/e2e-certification/full-workflow-certification-center.tsx',
  'tests/e2e/full-workflow-e2e-certification.md',
  'tests/e2e/FULL_LIFECYCLE_E2E_RUNTIME.md',
  'scripts/full-workflow-e2e-certify.mjs',
  'scripts/full-workflow-e2e-certify.sh',
  'scripts/full-workflow-e2e-certify.ps1',
  'scripts/pass-m18-full-lifecycle-e2e-certify.sh',
  'scripts/pass-m18-full-lifecycle-e2e-certify.ps1',
  'docs/production/FULL_LIFECYCLE_E2E_RUNTIME_RUNBOOK.md',
]) requireFile(p);

for (const marker of [
  'C17-SEED-ROLES-ORGANIZATIONS-BRANCHES-CANONICAL-DATA',
  'C17-IDENTITY-ORG-RBAC-MFA-SESSION-WORKFLOW',
  'C17-CRM-PROJECT-PROCUREMENT-INVENTORY-FINANCE-HAPPY-PATH',
  'C17-PROCUREMENT-THREE-WAY-MATCH-TO-AP-JOURNAL-PAYMENT',
  'C17-INVENTORY-CONCURRENT-RECEIPT-RESERVATION-NO-OVERPOST',
  'C17-ASSET-INSTALLATION-QR-ROTATION-SERVICE-MAINTENANCE',
  'C17-FIELD-SERVICE-PARTS-CONSUMPTION-STOCK-ASSET-HISTORY',
  'C17-FINANCE-IDEMPOTENCY-REVERSE-NOT-EDIT-BALANCE-INVOICE',
  'C17-CROSS-TENANT-IDOR-MAKER-CHECKER-PORTAL-SCOPES',
  'C17-DOCUMENT-MINIO-NOTIFICATION-WORKER-REPORT-EXPORT',
  'C17-FRONTEND-E2E-WORKFLOW-NAVIGATION-STATE-GATES',
  'C17-CERTIFICATION-EVIDENCE-MANIFEST-BLOCKS-PRODUCTION',
]) {
  requireText('scripts/full-workflow-e2e-certify.mjs', marker);
  requireText('shared/src/contracts/e2e-certification/e2e-certification-manifest.ts', marker);
}

for (const marker of [
  'RUN_FULL_WORKFLOW_E2E',
  'RUN_FULL_WORKFLOW_E2E_STRICT',
  'FULL_LIFECYCLE_E2E_RUNTIME_RESULTS_REQUIRED',
  'PROBE_ONLY_PREPRODUCTION_CERTIFICATION_NOT_RELEASE_SIGNOFF',
  'certification-output/full-lifecycle-e2e/runtime-results.json',
  'zero failed and zero skipped critical scenarios',
  'productionReady: failedProbes.length === 0 && Boolean(strictRuntimeResults)',
]) requireText('scripts/full-workflow-e2e-certify.mjs', marker);

for (const marker of [
  "{ segment: 'customer'",
  "{ segment: 'project'",
  "{ segment: 'purchase request'",
  "{ segment: 'RFQ'",
  "{ segment: 'purchase order'",
  "{ segment: 'goods receipt'",
  "{ segment: 'inventory ledger'",
  "{ segment: 'asset lifecycle'",
  "{ segment: 'service ticket'",
  "{ segment: 'work order'",
  "{ segment: 'maintenance plan'",
  "{ segment: 'supplier invoice'",
  "{ segment: 'payments'",
  "{ segment: 'documents'",
  "{ segment: 'reports'",
  "{ segment: 'search'",
  "{ segment: 'calendar'",
]) requireText('scripts/full-workflow-e2e-certify.mjs', marker);

for (const marker of [
  'customer→contract→project',
  'procurement→inventory→asset',
  'service→maintenance→finance',
  'not release sign-off',
  'pnpm full-workflow:e2e:certify',
]) requireText('docs/production/FULL_LIFECYCLE_E2E_RUNTIME_RUNBOOK.md', marker);

requireText('scripts/final-certify.sh', 'RUN_FULL_WORKFLOW_E2E=1');
requireText('scripts/final-certify.sh', 'RUN_FULL_WORKFLOW_E2E_STRICT=1');
requireText('scripts/final-certify.sh', 'pnpm full-workflow:e2e:certify');
requireText('scripts/final-certify.ps1', 'RUN_FULL_WORKFLOW_E2E');
requireText('scripts/final-certify.ps1', 'RUN_FULL_WORKFLOW_E2E_STRICT');
requireText('scripts/final-certify.ps1', 'full-workflow:e2e:certify');
requireText('package.json', 'full-lifecycle:e2e:check');
requireText('package.json', 'pass:m18:certify');
requireText('package.json', 'pass:m18:certify:ps');
requireText('package.json', 'full-lifecycle:e2e:check');
requireText('package.json', 'verify:static');

const pkg = JSON.parse(text('package.json'));
if (!pkg.scripts['verify:static'].includes('full-lifecycle:e2e:check')) errors.push('verify:static does not include full-lifecycle:e2e:check.');
if (!pkg.scripts.verify.includes('full-lifecycle:e2e:check')) errors.push('verify does not include full-lifecycle:e2e:check.');
if (pkg.packageManager !== 'pnpm@10.15.0') errors.push(`packageManager drifted: ${pkg.packageManager}`);

if (errors.length) {
  console.error('PASS M18 full lifecycle E2E certification gate FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const result = {
  pass: 'M18',
  name: 'Full Lifecycle E2E Certification Gate',
  status: 'PASSED_SOURCE_LEVEL_RUNTIME_READY',
  lockedStackUnchanged: true,
  productionRuntimeClaimed: false,
  blocksProductionUntilStrictRuntimeEvidence: true,
  scenarioFamilies: 12,
  lifecycleSegments: 17,
  runtimeEvidenceRequired: 'certification-output/full-lifecycle-e2e/runtime-results.json',
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync(file('certification-output'), { recursive: true });
fs.writeFileSync(file('certification-output/pass-m18-full-lifecycle-e2e-certification.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log('PASS M18 full lifecycle E2E certification gate PASSED: 12 scenario families, strict runtime evidence blocker, final certification wiring and lifecycle command chain verified.');
