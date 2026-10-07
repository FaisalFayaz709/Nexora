import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];

const prior = spawnSync(process.execPath, ['scripts/check-finance.mjs'], { stdio: 'inherit' });
if (prior.status !== 0) process.exit(prior.status ?? 1);

const lock = JSON.parse(readFileSync(join(root, 'docs/contracts/capability-locks/commercial-finance.json'), 'utf8'));
const catalog = readFileSync(join(root, 'docs/contracts/api-endpoint-matrix.csv'), 'utf8');
const routes = readFileSync(join(root, 'backend/src/modules/commercial-finance/commercial-finance.routes.ts'), 'utf8');

for (const route of lock.lockedRoutes) {
  const sig = `defineLockedRoute('${route.method}', '${route.path}')`;
  if (!routes.includes(sig)) failures.push(`Missing locked commercial-finance route: ${route.method} ${route.path}`);
  if (!catalog.includes(route.path)) failures.push(`Route absent frozen catalog: ${route.path}`);
  if (!routes.includes(`'${route.permission}'`)) failures.push(`Permission guard missing: ${route.permission}`);
}
const routeMatches = [...routes.matchAll(/defineLockedRoute\('([A-Z]+)', '([^']+)'\)/g)].map(m => `${m[1]} ${m[2]}`);
if (new Set(routeMatches).size !== lock.lockedRouteCount) failures.push(`Expected ${lock.lockedRouteCount} commercial-finance routes, found ${new Set(routeMatches).size}`);

const schema = readFileSync(join(root, 'database/prisma/schema.prisma'), 'utf8');
for (const model of lock.newPhysicalModels) {
  if (!new RegExp(`model\\s+${model}\\s*\\{`).test(schema)) failures.push(`Missing Prisma model: ${model}`);
}
if (!/model\s+InventoryCostLayer\s*\{/.test(schema)) failures.push('InventoryCostLayer must remain present for landed-cost valuation.');
if (/\bFloat\b/.test(schema)) failures.push('Float introduced into Prisma schema.');

const migration = readFileSync(join(root, 'database/prisma/migrations/20260903000700_pass14_commercial_finance/migration.sql'), 'utf8');
for (const invariant of [
  'LandedCost_organizationId_landedCostNo_key',
  'LandedCost_organizationId_idempotencyKey_key',
  'LandedCostAllocation_unit_delta_check',
  "'SALES','PURCHASE','WITHHOLDING','REVERSE_CHARGE'",
  'TaxTransaction_source_check',
  'BankStatementLine_one_side_check',
  'BankReconciliation_status_check',
  'PaymentVoucher_account_exclusive_check',
  'ReceiptVoucher_account_exclusive_check',
  'ChequeRegister_organizationId_bankAccountId_chequeNo_key',
]) if (!migration.includes(invariant)) failures.push(`Migration invariant missing: ${invariant}`);

const service = readFileSync(join(root, 'backend/src/modules/commercial-finance/commercial-finance.service.ts'), 'utf8');
for (const invariant of [
  "entityType: 'LANDED_COST'",
  "entityType: 'PAYMENT_VOUCHER'",
  'LANDED_COST_ALLOCATION_MISMATCH',
  'IDEMPOTENCY_KEY_REQUIRED',
  'this.inventory.recordLandedCostLayer',
  'this.finance.postCommercialJournal',
  'TAX_CALCULATED',
  'TaxTransaction',
  'BANK_STATEMENT_IMPORTED',
  'BANK_RECONCILIATION_CLOSED',
  'BANK_RECONCILIATION_ALREADY_CLOSED',
  'PAYMENT_VOUCHER_POSTED',
  'RECEIPT_VOUCHER_POSTED',
  "entityType: 'RECEIPT_VOUCHER'",
  'createReceiptVoucher',
]) if (!service.includes(invariant)) failures.push(`Service invariant missing: ${invariant}`);
if (service.includes('BullMQ') || service.includes("from 'bullmq'")) failures.push('Commercial finance critical state must not use BullMQ.');

const module = readFileSync(join(root, 'backend/src/modules/commercial-finance/commercial-finance.module.ts'), 'utf8');
for (const boundary of [
  "type { FinanceFacade } from '../finance/index.js'",
  "type { InventoryFacade } from '../inventory/index.js'",
  "type { ProcurementFacade } from '../procurement/index.js'",
]) if (!module.includes(boundary)) failures.push(`Facade boundary missing: ${boundary}`);

const financeRepository = readFileSync(join(root, 'backend/src/modules/finance/finance.repository.ts'), 'utf8');
const financeFacade = readFileSync(join(root, 'backend/src/modules/finance/finance.facade.ts'), 'utf8');
if (!financeFacade.includes('postCommercialJournal')) failures.push('FinanceFacade lacks postCommercialJournal boundary.');
if (!financeFacade.includes('ensureCommercialAccounts')) failures.push('FinanceFacade lacks ensureCommercialAccounts boundary.');
if (!financeRepository.includes('ensureCommercialAccounts')) failures.push('FinanceRepository must own commercial account upserts.');

const inventoryFacade = readFileSync(join(root, 'backend/src/modules/inventory/inventory.facade.ts'), 'utf8');
if (!inventoryFacade.includes('recordLandedCostLayer')) failures.push('InventoryFacade lacks landed-cost valuation boundary.');
if (!inventoryFacade.includes("sourceType: 'LandedCost'")) failures.push('InventoryFacade landed cost layers must use sourceType LandedCost.');

const app = readFileSync(join(root, 'backend/src/app.ts'), 'utf8');
for (const invariant of [
  'createCommercialFinanceModule',
  'finance.facade',
  'procurement.facade',
  'inventory.facade',
  'app.register(commercialFinance.plugin',
]) if (!app.includes(invariant)) failures.push(`App composition missing: ${invariant}`);

for (const file of [
  'backend/src/modules/commercial-finance/commercial-finance.repository.ts',
  'backend/src/modules/commercial-finance/commercial-finance.service.ts',
  'backend/src/modules/commercial-finance/commercial-finance.controller.ts',
  'backend/src/modules/commercial-finance/commercial-finance.routes.ts',
  'backend/src/modules/commercial-finance/commercial-finance.module.ts',
  'frontend/src/app/(erp)/tax-codes/page.tsx',
  'frontend/src/app/(erp)/bank-accounts/page.tsx',
  'frontend/src/app/(erp)/landed-costs/page.tsx',
  'frontend/src/app/(erp)/vouchers/receipt/page.tsx',
]) if (!existsSync(join(root, file))) failures.push(`Missing file: ${file}`);

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!String(pkg.scripts?.['verify:static'] ?? '').includes('commercial-finance:check')) failures.push('verify:static does not include commercial-finance:check.');

if (failures.length) {
  console.error('Commercial-finance gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Commercial-finance gate PASSED: ${lock.lockedRouteCount} Appendix-F commercial finance routes and ${lock.newPhysicalModelCount} models.`);
