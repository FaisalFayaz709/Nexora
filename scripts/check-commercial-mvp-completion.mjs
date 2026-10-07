import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const warnings = [];
const startedAt = new Date().toISOString();

function path(rel) { return join(root, rel); }
function read(rel) {
  if (!existsSync(path(rel))) {
    failures.push(`Missing required file: ${rel}`);
    return '';
  }
  return readFileSync(path(rel), 'utf8');
}
function hasFile(rel) { if (!existsSync(path(rel))) failures.push(`Missing required file: ${rel}`); }
const file = path;
function requireText(rel, marker, desc = marker) {
  const text = read(rel);
  if (text && !text.includes(marker)) failures.push(`${rel} missing ${desc}`);
}
function walk(dir, predicate = () => true) {
  const base = path(dir);
  if (!existsSync(base)) return [];
  const out = [];
  const stack = [base];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of readdirSync(current)) {
      const absolute = join(current, entry);
      const stats = statSync(absolute);
      if (stats.isDirectory()) stack.push(absolute);
      else if (predicate(absolute)) out.push(absolute);
    }
  }
  return out;
}
function modelBlock(schema, model) {
  return schema.match(new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
}
function routeSignaturePresent(text, method, endpoint) {
  const pattern = new RegExp(`defineLockedRoute\\(\\s*['\"]${method}['\"]\\s*,\\s*['\"]${endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['\"]\\s*\\)`);
  return pattern.test(text);
}

const priorGates = [
  ['architecture', 'scripts/check-architecture.mjs'],
  ['contracts', 'scripts/check-contracts.mjs'],
  ['commercial-finance', 'scripts/check-commercial-finance.mjs'],
  ['commercial-procurement', 'scripts/check-commercial-procurement.mjs'],
  ['enterprise-controls', 'scripts/check-enterprise-controls.mjs'],
  ['documentation-source-reconciliation', 'scripts/check-docs-source-reconciliation.mjs'],
];
const priorResults = [];
for (const [name, script] of priorGates) {
  if (!existsSync(path(script))) {
    failures.push(`Missing prior gate script: ${script}`);
    priorResults.push({ name, script, status: 'failed', exitCode: 1 });
    continue;
  }
  const run = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 * 30 });
  priorResults.push({ name, script, status: run.status === 0 ? 'passed' : 'failed', exitCode: run.status, stdout: run.stdout.trim(), stderr: run.stderr.trim() });
  if (run.status !== 0) failures.push(`Prior gate failed: ${name}: ${run.stderr || run.stdout}`);
}

const manifest = read('shared/src/contracts/commercial-mvp/commercial-mvp-manifest.ts');
const policy = read('backend/src/modules/commercial-mvp/commercial-mvp-policy.ts');
const policyTest = read('backend/src/modules/commercial-mvp/commercial-mvp-policy.test.ts');
const integrationTest = read('backend/src/modules/commercial-mvp/commercial-mvp.integration.test.ts');

const requiredAdditions = [
  ['NUMBER_SEQUENCE_MANAGEMENT', 'P0'],
  ['DATA_IMPORT_WIZARD_BASELINE', 'P0'],
  ['STOCK_COUNT_CYCLE_COUNT', 'P1'],
  ['TAX_ENGINE_BASELINE', 'P1'],
  ['BANK_CASH_MANAGEMENT_BASELINE', 'P1'],
  ['VENDOR_ONBOARDING_RISK', 'P2'],
  ['LANDED_COST_VALUATION', 'P2'],
  ['PURCHASE_CONTRACTS_BLANKET_PO', 'P2'],
  ['REPORT_BUILDER_GPS_SAAS_BILLING_READY', 'P3'],
];
for (const [key, priority] of requiredAdditions) {
  if (!manifest.includes(`key: '${key}'`)) failures.push(`Commercial MVP manifest missing addition ${key}.`);
  if (!manifest.includes(`priority: '${priority}'`)) failures.push(`Commercial MVP manifest missing priority ${priority} for ${key}.`);
  if (!policy.includes(key) && key !== 'REPORT_BUILDER_GPS_SAAS_BILLING_READY') failures.push(`Commercial MVP backend policy missing control key ${key}.`);
}

const requiredEndpoints = [
  ['GET', '/api/v1/number-sequences', 'backend/src/modules/platform/number-sequence/number-sequence.routes.ts'],
  ['POST', '/api/v1/number-sequences', 'backend/src/modules/platform/number-sequence/number-sequence.routes.ts'],
  ['POST', '/api/v1/number-sequences/:id/reset', 'backend/src/modules/platform/number-sequence/number-sequence.routes.ts'],
  ['POST', '/api/v1/imports/upload', 'backend/src/modules/data-import/data-import.routes.ts'],
  ['POST', '/api/v1/imports/:id/validate', 'backend/src/modules/data-import/data-import.routes.ts'],
  ['POST', '/api/v1/imports/:id/commit', 'backend/src/modules/data-import/data-import.routes.ts'],
  ['POST', '/api/v1/imports/:id/rollback', 'backend/src/modules/data-import/data-import.routes.ts'],
  ['POST', '/api/v1/stock-counts', 'backend/src/modules/inventory/stock-count/stock-count.routes.ts'],
  ['POST', '/api/v1/stock-counts/:id/start', 'backend/src/modules/inventory/stock-count/stock-count.routes.ts'],
  ['POST', '/api/v1/stock-counts/:id/submit', 'backend/src/modules/inventory/stock-count/stock-count.routes.ts'],
  ['POST', '/api/v1/stock-counts/:id/post', 'backend/src/modules/inventory/stock-count/stock-count.routes.ts'],
  ['GET', '/api/v1/tax-codes', 'backend/src/modules/commercial-finance/commercial-finance.routes.ts'],
  ['POST', '/api/v1/tax-rules', 'backend/src/modules/commercial-finance/commercial-finance.routes.ts'],
  ['POST', '/api/v1/tax/calculate', 'backend/src/modules/commercial-finance/commercial-finance.routes.ts'],
  ['GET', '/api/v1/tax/reports', 'backend/src/modules/commercial-finance/commercial-finance.routes.ts'],
  ['GET', '/api/v1/bank-accounts', 'backend/src/modules/commercial-finance/commercial-finance.routes.ts'],
  ['POST', '/api/v1/bank-statements/import', 'backend/src/modules/commercial-finance/commercial-finance.routes.ts'],
  ['POST', '/api/v1/bank-reconciliations/:id/close', 'backend/src/modules/commercial-finance/commercial-finance.routes.ts'],
  ['POST', '/api/v1/vouchers/payment', 'backend/src/modules/commercial-finance/commercial-finance.routes.ts'],
  ['POST', '/api/v1/vouchers/receipt', 'backend/src/modules/commercial-finance/commercial-finance.routes.ts'],
  ['POST', '/api/v1/vendor-onboarding/requests', 'backend/src/modules/vendors/onboarding/vendor-onboarding.routes.ts'],
  ['POST', '/api/v1/vendor-onboarding/:id/submit', 'backend/src/modules/vendors/onboarding/vendor-onboarding.routes.ts'],
  ['POST', '/api/v1/vendor-onboarding/:id/approve', 'backend/src/modules/vendors/onboarding/vendor-onboarding.routes.ts'],
  ['POST', '/api/v1/vendors/:id/blacklist', 'backend/src/modules/vendors/vendor.routes.ts'],
  ['POST', '/api/v1/landed-costs', 'backend/src/modules/commercial-finance/commercial-finance.routes.ts'],
  ['POST', '/api/v1/landed-costs/:id/allocate', 'backend/src/modules/commercial-finance/commercial-finance.routes.ts'],
  ['POST', '/api/v1/landed-costs/:id/post', 'backend/src/modules/commercial-finance/commercial-finance.routes.ts'],
  ['POST', '/api/v1/purchase-contracts', 'backend/src/modules/procurement/contracts/purchase-contract.routes.ts'],
  ['POST', '/api/v1/purchase-contracts/:id/approve', 'backend/src/modules/procurement/contracts/purchase-contract.routes.ts'],
  ['POST', '/api/v1/purchase-contracts/:id/create-release-order', 'backend/src/modules/procurement/contracts/purchase-contract.routes.ts'],
];
const matrix = read('docs/contracts/api-endpoint-matrix.csv');
const lockedRegistry = read('shared/src/contracts/registry/locked-endpoints.ts');
for (const [method, endpoint, rel] of requiredEndpoints) {
  const routeText = read(rel);
  if (!routeSignaturePresent(routeText, method, endpoint)) failures.push(`Missing commercial MVP locked route: ${method} ${endpoint} in ${rel}`);
  if (!manifest.includes(`${method} ${endpoint}`)) failures.push(`Commercial MVP manifest missing endpoint ${method} ${endpoint}.`);
  if (!integrationTest.includes(`${method} ${endpoint}`)) warnings.push(`Commercial MVP integration test does not explicitly assert ${method} ${endpoint}.`);
  if (!matrix.includes(endpoint)) failures.push(`API endpoint matrix missing commercial MVP endpoint ${method} ${endpoint}.`);
  if (!lockedRegistry.includes(`endpoint: "${endpoint}"`)) failures.push(`Locked endpoint registry missing ${method} ${endpoint}.`);
}

const schema = read('database/prisma/schema.prisma');
const requiredModels = [
  'NumberSequence','NumberSequenceReservation',
  'ImportTemplate','ImportBatch','ImportMapping','ImportRow','ImportRowError','DuplicateCheckRule',
  'StockCount','StockCountLine','StockCountVariance','StockCountApproval','StockCountPosting',
  'TaxCode','TaxRate','TaxRule','TaxJurisdiction','TaxTransaction','WithholdingTaxRule',
  'BankAccount','CashAccount','BankStatement','BankStatementLine','BankReconciliation','PaymentVoucher','ReceiptVoucher','ChequeRegister',
  'VendorOnboardingRequest','VendorDocument','VendorBankAccount','VendorRiskAssessment','VendorBlacklist','VendorCategoryApproval',
  'LandedCost','LandedCostLine','LandedCostAllocation','InventoryCostLayer',
  'PurchaseContract','PurchaseContractItem','BlanketPurchaseOrder','BlanketPurchaseOrderItem','PurchaseReleaseOrder','PurchaseReleaseOrderItem',
];
for (const model of requiredModels) {
  const block = modelBlock(schema, model);
  if (!block) failures.push(`Missing required commercial MVP Prisma model: ${model}`);
  const inheritsTenantFromParent = [
    'ImportMapping', 'ImportRow', 'ImportRowError', 'DuplicateCheckRule',
    'StockCountLine', 'StockCountVariance', 'StockCountApproval', 'StockCountPosting',
    'TaxRate', 'PaymentVoucher', 'ReceiptVoucher', 'ChequeRegister',
    'VendorDocument', 'VendorBankAccount', 'VendorBlacklist', 'VendorCategoryApproval',
    'LandedCostLine', 'LandedCostAllocation',
    'PurchaseContractItem', 'BlanketPurchaseOrderItem', 'PurchaseReleaseOrderItem',
  ].includes(model);
  if (block && /(NumberSequence|Import|StockCount|Tax|Bank|Cash|Cheque|Vendor|LandedCost|Purchase|Blanket)/.test(model) && !/\borganizationId\b/.test(block) && !inheritsTenantFromParent) {
    failures.push(`Commercial MVP tenant-owned model lacks organizationId: ${model}`);
  }
}
if (/\bFloat\b/.test(schema)) failures.push('Float introduced into Prisma schema; money and quantities must remain Decimal/Numeric.');

const dbMatrix = read('docs/traceability/database-entity-matrix.csv');
for (const model of requiredModels) {
  if (!dbMatrix.includes(`${model},`) && !dbMatrix.includes(`,${model},`)) warnings.push(`Database traceability matrix does not visibly list ${model}.`);
  const rowPattern = new RegExp(`(^|\\n)[^\\n,]*,${model},[^\\n]*,IMPLEMENTED_STATIC_ONLY(\\n|$)`);
  if (!['PurchaseContractItem','BlanketPurchaseOrderItem','PurchaseReleaseOrderItem'].includes(model) && !rowPattern.test(dbMatrix)) {
    warnings.push(`Database matrix may not mark ${model} as IMPLEMENTED_STATIC_ONLY.`);
  }
}
if (/BlanketPurchaseOrder[^\n]*NOT_IMPLEMENTED|BlanketPurchaseOrderItem[^\n]*NOT_IMPLEMENTED/.test(dbMatrix)) {
  failures.push('Blanket purchase order database traceability still says NOT_IMPLEMENTED.');
}

const blanketMigration = read('database/prisma/migrations/20260907104500_pass_m15_commercial_mvp_blanket_po_alignment/migration.sql');
for (const marker of [
  'CREATE TABLE IF NOT EXISTS "BlanketPurchaseOrder"',
  'CREATE TABLE IF NOT EXISTS "BlanketPurchaseOrderItem"',
  'BlanketPurchaseOrder_organizationId_blanketPoNo_key',
  'BlanketPurchaseOrderItem_blanketPurchaseOrderId_productId_key',
  'PurchaseReleaseOrder_organizationId_blanketPurchaseOrderId_idx',
  'PurchaseReleaseOrder_blanketPurchaseOrderId_fkey',
]) {
  if (!blanketMigration.includes(marker)) failures.push(`M15 blanket PO migration missing invariant ${marker}.`);
}

const requiredPolicyMarkers = [
  'COMMERCIAL_MVP_CONTROL_MISSING',
  'NUMBER_SEQUENCE_NOT_TRANSACTION_SAFE',
  'IMPORT_WIZARD_INVALID_STATE',
  'STOCK_COUNT_MAKER_CHECKER_REQUIRED',
  'TAX_ENGINE_AUDIT_SNAPSHOT_REQUIRED',
  'BANK_RECONCILIATION_CLOSE_CONTROL_MISSING',
  'VENDOR_RISK_GATE_BLOCKED',
  'LANDED_COST_POSTING_CONTROL_MISSING',
  'PURCHASE_CONTRACT_LIMIT_EXCEEDED',
  'COMMERCIAL_CRITICAL_MUTATION_NOT_ASYNC',
];
for (const marker of requiredPolicyMarkers) {
  if (!policy.includes(marker)) failures.push(`Commercial MVP policy missing invariant ${marker}.`);
  if (!policyTest.includes(marker) && marker !== 'COMMERCIAL_MVP_CONTROL_MISSING') warnings.push(`Commercial MVP policy test may not assert ${marker}.`);
}

for (const [rel, markers] of Object.entries({
  'backend/src/modules/platform/number-sequence/number-sequence.service.ts': ['withBusinessNumberInTransaction', 'createReservation', 'consumeReservation', 'NUMBER_SEQUENCE_NOT_CONFIGURED'],
  'backend/src/modules/data-import/data-import.service.ts': ['IMPORT_BATCH_VALIDATED', 'IMPORT_BATCH_COMMITTED', 'IMPORT_BATCH_ROLLED_BACK', 'lockBatch'],
  'backend/src/modules/inventory/stock-count/stock-count.service.ts': ['STOCK_COUNT_MAKER_CHECKER_REQUIRED', 'STOCK_COUNT_POSTED', "type: 'ADJUSTMENT'", 'bypassFreeze: true'],
  'backend/src/modules/commercial-finance/commercial-finance.service.ts': ['IDEMPOTENCY_KEY_REQUIRED', 'LANDED_COST_ALLOCATION_MISMATCH', 'TAX_CALCULATED', 'BANK_RECONCILIATION_CLOSED', 'PAYMENT_VOUCHER_POSTED', 'RECEIPT_VOUCHER_POSTED'],
  'backend/src/modules/vendors/onboarding/vendor-onboarding.service.ts': ['VENDOR_ONBOARDING_MAKER_CHECKER_REQUIRED', 'VENDOR_VERIFICATION_REQUIRED', 'VENDOR_RISK_BLOCKED', 'VENDOR_BLACKLISTED'],
  'backend/src/modules/procurement/contracts/purchase-contract.service.ts': ['PURCHASE_CONTRACT_MAKER_CHECKER_REQUIRED', 'PURCHASE_CONTRACT_QUANTITY_EXCEEDED', 'PURCHASE_CONTRACT_VALUE_EXCEEDED', 'this.vendors.assertApproved'],
})) {
  for (const marker of markers) requireText(rel, marker, marker);
}

for (const rel of [
  'frontend/src/app/(erp)/commercial-mvp/page.tsx',
  'frontend/src/app/(erp)/imports/page.tsx',
  'frontend/src/app/(erp)/stock-counts/page.tsx',
  'frontend/src/app/(erp)/tax-codes/page.tsx',
  'frontend/src/app/(erp)/bank-accounts/page.tsx',
  'frontend/src/app/(erp)/landed-costs/page.tsx',
  'frontend/src/app/(erp)/purchase-contracts/page.tsx',
  'frontend/src/app/(erp)/vendor-onboarding/page.tsx',
]) {
  hasFile(rel);
  const pageText = existsSync(file(rel)) ? read(rel) : '';
  if (/import\s*\{\s*AppShell\s*\}/.test(pageText) || /<\/?AppShell\b/.test(pageText)) failures.push(`${rel} must rely on the ERP route-group shell, not direct AppShell wrapping.`);
}
requireText('frontend/src/app/(erp)/layout.tsx', 'ErpRouteShell', 'ERP route-group shell for commercial MVP pages');
requireText('frontend/src/modules/commercial/commercial-mvp-workbench.tsx', 'Idempotency-Key', 'commercial workbench idempotency header');
requireText('frontend/src/modules/commercial/commercial-mvp-workbench.tsx', 'useMutation', 'commercial workbench command mutation');
requireText('frontend/src/modules/commercial/commercial-mvp-workbench.tsx', 'invalidateQueries', 'commercial workbench query invalidation');

const frontendCodeFiles = walk('frontend/src', (absolute) => /\.(tsx?|jsx?)$/.test(absolute));
for (const absolute of frontendCodeFiles) {
  const text = readFileSync(absolute, 'utf8');
  for (const line of text.split(/\r?\n/).filter((item) => /^\s*import\b/.test(item))) {
    for (const forbidden of ['@nexora/database', '@prisma/client', 'minio', 'bullmq', 'ioredis', '../backend', '../../backend', '../database', '../../database']) {
      if (line.includes(forbidden)) failures.push(`${relative(root, absolute)} contains forbidden frontend import: ${line.trim()}`);
    }
  }
}

const pkg = JSON.parse(read('package.json'));
for (const scriptName of ['commercial-finance:check', 'commercial-procurement:check', 'enterprise-controls:check', 'commercial-mvp:check', 'pass:m15:certify']) {
  if (!pkg.scripts?.[scriptName]) failures.push(`package.json missing script ${scriptName}.`);
}
for (const aggregate of ['verify:static', 'verify']) {
  if (!String(pkg.scripts?.[aggregate] ?? '').includes('commercial-mvp:check')) failures.push(`${aggregate} does not include commercial-mvp:check.`);
}

mkdirSync(path('certification-output'), { recursive: true });
const payload = {
  gate: 'commercial-mvp-check',
  pass: 'M15',
  title: 'Commercial Addendum Must-Have Completion Gate',
  startedAt,
  completedAt: new Date().toISOString(),
  certificationScope: 'Zero-dependency static/source gate. Dependency-backed tests, Prisma validation and Docker runtime remain blocked until a real pnpm-lock.yaml exists.',
  lockedStackPreserved: true,
  requiredAdditions: requiredAdditions.length,
  requiredEndpoints: requiredEndpoints.length,
  requiredModels: requiredModels.length,
  frontendCodeFilesScanned: frontendCodeFiles.length,
  priorResults,
  warnings,
  failures,
};
writeFileSync(path('certification-output/pass-m15-commercial-mvp-certification.json'), `${JSON.stringify(payload, null, 2)}\n`);

if (failures.length > 0) {
  console.error('Commercial MVP completion gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Commercial MVP completion gate PASSED: ${requiredAdditions.length} addendum controls, ${requiredEndpoints.length} routes, ${requiredModels.length} models, ${frontendCodeFiles.length} frontend files scanned.`);
if (warnings.length) {
  console.warn('Commercial MVP completion warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}
