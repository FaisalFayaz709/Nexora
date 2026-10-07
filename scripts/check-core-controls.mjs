import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];

const inventoryGate = spawnSync(process.execPath, ['scripts/check-inventory.mjs'], {
  cwd: root,
  encoding: 'utf8',
});
if (inventoryGate.status !== 0) {
  console.error(inventoryGate.stdout);
  console.error(inventoryGate.stderr);
  process.exit(inventoryGate.status ?? 1);
}

const requiredFiles = [
  'database/prisma/migrations/20260901000500_pass0_6_remediation/migration.sql',
  'backend/src/plugins/openapi.ts',
  'backend/src/core/security/password-policy.ts',
  'backend/src/modules/identity/password-reset.service.ts',
  'backend/src/modules/platform/configuration/platform-access.facade.ts',
  'backend/src/modules/platform/configuration/platform-configuration.service.ts',
  'backend/src/modules/inventory/stock-count/stock-count.service.ts',
  'backend/src/modules/vendors/onboarding/vendor-onboarding.service.ts',
  'shared/src/constants/module-registry.ts',
  'shared/src/contracts/reports/report-export.contract.ts',
  'database/prisma/seed/feature-flags.seed.json',
  'database/prisma/seed/module-registry.seed.json',
  '.github/workflows/codeql.yml',
  'frontend/src/app/(auth)/login/page.tsx',
  'frontend/src/app/(erp)/inventory/stock/page.tsx',
  'frontend/src/app/(erp)/inventory/ledger/page.tsx',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) failures.push(`Missing remediation artifact: ${path}`);
}

const schema = readFileSync(join(root, 'database/prisma/schema.prisma'), 'utf8');
for (const model of [
  'PasswordResetToken',
  'FeatureFlag',
  'OrganizationFeature',
  'ModuleConfiguration',
  'SystemConfigurationHistory',
  'SaaSPlan',
  'SaaSSubscription',
  'VendorOnboardingRequest',
  'StockCount',
  'StockCountLine',
  'StockCountVariance',
  'StockCountApproval',
  'StockCountPosting',
  'InventoryCostLayer',
]) {
  if (!new RegExp(`model\\s+${model}\\s*\\{`).test(schema)) {
    failures.push(`Missing remediation/source-roadmap model: ${model}`);
  }
}

const auth = readFileSync(join(root, 'backend/src/modules/identity/authentication.service.ts'), 'utf8');
for (const marker of [
  'AUTH_MFA_ENROLLMENT_REQUIRED',
  'AUTH_ACCOUNT_LOCKED',
  'recordLoginFailure',
  'userRequiresMfa',
]) {
  if (!auth.includes(marker)) failures.push(`Identity remediation missing: ${marker}`);
}

const sessions = readFileSync(join(root, 'backend/src/modules/identity/identity.repository.ts'), 'utf8');
if (!sessions.includes('revokedAt: null') || !sessions.includes('expiresAt: { gt: new Date() }')) {
  failures.push('Active-session query remediation is missing.');
}

const routeGuardFiles = [
  'backend/src/modules/customers/customer.routes.ts',
  'backend/src/modules/vendors/vendor.routes.ts',
  'backend/src/modules/hr/employee/employee.routes.ts',
  'backend/src/modules/inventory/inventory.routes.ts',
];
for (const path of routeGuardFiles) {
  const source = readFileSync(join(root, path), 'utf8');
  if (!source.includes('assertModuleEnabled')) failures.push(`Module-disable API guard missing: ${path}`);
}

const inventoryRepo = readFileSync(join(root, 'backend/src/modules/inventory/inventory.repository.ts'), 'utf8');
for (const marker of [
  'applyOnHandDelta',
  'INVENTORY_STOCK_FROZEN',
  'if (location.id !== aggregate.id)',
]) {
  if (!inventoryRepo.includes(marker)) failures.push(`Inventory balance/freeze remediation missing: ${marker}`);
}

const numberSequence = readFileSync(
  join(root, 'backend/src/modules/platform/number-sequence/number-sequence.service.ts'),
  'utf8',
);
for (const marker of [
  'branchExists',
  'NUMBER_SEQUENCE_RESET_NOT_ALLOWED_AFTER_ISSUE',
  'reservationCount',
]) {
  if (!numberSequence.includes(marker)) failures.push(`Number-sequence remediation missing: ${marker}`);
}

const concurrency = [
  'backend/src/modules/platform/number-sequence/number-sequence.integration.test.ts',
  'backend/src/modules/inventory/inventory-concurrency.integration.test.ts',
];
for (const path of concurrency) {
  const source = readFileSync(join(root, path), 'utf8');
  if (!source.includes('RUN_INTEGRATION_TESTS') || source.includes('describe.skip(') || source.includes('expect(true).toBe(true)')) {
    failures.push(`Runtime concurrency suite remains placeholder/skipped: ${path}`);
  }
}

const audit = spawnSync(process.execPath, ['scripts/audit-core-controls.mjs'], {
  cwd: root,
  encoding: 'utf8',
});
let auditJson;
try {
  auditJson = JSON.parse(audit.stdout);
} catch {
  failures.push('Independent audit did not emit parseable JSON.');
}
if (auditJson?.staticBlockers?.length) {
  for (const blocker of auditJson.staticBlockers) {
    failures.push(`Audit static blocker ${blocker.id}: ${blocker.message}`);
  }
}
if (auditJson && auditJson.verdict !== 'STATIC_CONTROLS_PASS_CERTIFICATION_PENDING' && auditJson.verdict !== 'CERTIFIED_CORE_CONTROLS') {
  failures.push(`Unexpected independent-audit verdict: ${auditJson.verdict}`);
}

if (failures.length) {
  console.error('Core controls static gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Core controls static gate PASSED: ${auditJson.implementedLockedRouteCount} implemented locked routes; zero static audit blockers. Runtime/source certification remains separately tracked.`,
);
