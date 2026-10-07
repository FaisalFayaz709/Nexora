import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];

const prior = spawnSync(process.execPath, ['scripts/check-commercial-finance.mjs'], { stdio: 'inherit' });
if (prior.status !== 0) process.exit(prior.status ?? 1);

const lock = JSON.parse(readFileSync(join(root, 'docs/contracts/capability-locks/procurement-commercial-extensions.json'), 'utf8'));
const catalog = readFileSync(join(root, 'docs/contracts/api-endpoint-matrix.csv'), 'utf8');

const routeFiles = [
  'backend/src/modules/vendors/onboarding/vendor-onboarding.routes.ts',
  'backend/src/modules/inventory/stock-count/stock-count.routes.ts',
  'backend/src/modules/procurement/contracts/purchase-contract.routes.ts',
].map((file) => readFileSync(join(root, file), 'utf8')).join('\n');

for (const route of lock.lockedRoutes) {
  const sig = `defineLockedRoute('${route.method}', '${route.path}')`;
  if (!routeFiles.includes(sig)) failures.push(`Missing locked commercial-procurement route: ${route.method} ${route.path}`);
  if (!catalog.includes(route.path)) failures.push(`Commercial-procurement route absent frozen catalog: ${route.path}`);
  if (!routeFiles.includes(`'${route.permission}'`)) failures.push(`Permission guard missing: ${route.permission}`);
}
const routeMatches = [...routeFiles.matchAll(/defineLockedRoute\('([A-Z]+)',\s*'([^']+)'\)/g)].map((match) => `${match[1]} ${match[2]}`);
const requiredRouteSignatures = lock.lockedRoutes.map((route) => `${route.method} ${route.path}`);
const extraRouteSignatures = routeMatches.filter((signature) => !requiredRouteSignatures.includes(signature));
if (new Set(requiredRouteSignatures).size !== lock.lockedRouteCount) {
  failures.push(`Commercial-procurement lock declares ${lock.lockedRouteCount} routes but lists ${new Set(requiredRouteSignatures).size}.`);
}
for (const signature of requiredRouteSignatures) {
  if (!routeMatches.includes(signature)) failures.push(`Required locked commercial-procurement route missing from source: ${signature}`);
}
// Pass 08 added stock-count read routes in the same stock-count route file. They are allowed
// supporting read models and must not make the Appendix-F commercial command gate fail.
const unsupportedExtras = extraRouteSignatures.filter((signature) => ![
  'GET /api/v1/stock-counts',
  'GET /api/v1/stock-counts/:id',
  'GET /api/v1/stock-counts/:id/count-sheet',
].includes(signature));
if (unsupportedExtras.length) {
  failures.push(`Unexpected commercial-procurement route signatures: ${unsupportedExtras.join(', ')}`);
}

const schema = readFileSync(join(root, 'database/prisma/schema.prisma'), 'utf8');
for (const model of lock.models) {
  if (!new RegExp(`model\\s+${model}\\s*\\{`).test(schema)) failures.push(`Missing Prisma/support model: ${model}`);
}
if (!schema.includes('riskScore') || !schema.includes('blacklistedAt') || !schema.includes('approvedCategoryIdsJson')) {
  failures.push('Vendor governance fields missing from Prisma schema.');
}
if (/\bFloat\b/.test(schema)) failures.push('Float introduced into Prisma schema.');

const migration = [
  'database/prisma/migrations/20260903000800_pass15_procurement_inventory_commercial_extensions/migration.sql',
  'database/prisma/migrations/20260907104500_pass_m15_commercial_mvp_blanket_po_alignment/migration.sql',
].map((file) => readFileSync(join(root, file), 'utf8')).join('\n');
for (const invariant of [
  'Vendor_risk_score_check',
  'VendorRiskAssessment_rating_check',
  'PurchaseContract_organizationId_contractNo_key',
  'PurchaseContract_status_check',
  'PurchaseContractItem_limit_check',
  'PurchaseReleaseOrder_organizationId_releaseOrderNo_key',
  'PurchaseReleaseOrder_total_check',
  'PurchaseReleaseOrderItem_qty_check',
  'CREATE TABLE IF NOT EXISTS "BlanketPurchaseOrder"',
  'CREATE TABLE IF NOT EXISTS "BlanketPurchaseOrderItem"',
  'BlanketPurchaseOrder_organizationId_blanketPoNo_key',
  'BlanketPurchaseOrderItem_limit_check',
  'PurchaseReleaseOrder_blanketPurchaseOrderId_fkey',
]) {
  if (!migration.includes(invariant)) failures.push(`Migration invariant missing: ${invariant}`);
}

const vendorService = readFileSync(join(root, 'backend/src/modules/vendors/onboarding/vendor-onboarding.service.ts'), 'utf8');
for (const invariant of [
  'VENDOR_ONBOARDING_MAKER_CHECKER_REQUIRED',
  'VENDOR_VERIFICATION_REQUIRED',
  'VENDOR_RISK_BLOCKED',
  'VENDOR_BLACKLISTED',
  'createRiskAssessment',
  'approveVendor',
  'blacklistVendor',
  'VENDOR_ONBOARDING_APPROVED',
]) {
  if (!vendorService.includes(invariant)) failures.push(`Vendor onboarding invariant missing: ${invariant}`);
}
if (/\btx\s*\.\s*[a-zA-Z]\w*\s*\./.test(vendorService)) failures.push('VendorOnboardingService must persist through repository only.');

const vendorFacade = readFileSync(join(root, 'backend/src/modules/vendors/onboarding/vendor-governance.facade.ts'), 'utf8');
for (const invariant of [
  'VENDOR_BLACKLISTED',
  'VENDOR_RISK_BLOCKED',
  "vendor.status !== 'APPROVED'",
]) {
  if (!vendorFacade.includes(invariant)) failures.push(`Vendor governance facade invariant missing: ${invariant}`);
}

const stockCountService = readFileSync(join(root, 'backend/src/modules/inventory/stock-count/stock-count.service.ts'), 'utf8');
for (const invariant of [
  'STOCK_COUNT_FREEZE_CONFLICT',
  'STOCK_COUNT_MAKER_CHECKER_REQUIRED',
  "type: 'ADJUSTMENT'",
  'bypassFreeze: true',
  'STOCK_COUNT_POSTED',
]) {
  if (!stockCountService.includes(invariant)) failures.push(`Stock count invariant missing: ${invariant}`);
}
const inventoryRepo = readFileSync(join(root, 'backend/src/modules/inventory/inventory.repository.ts'), 'utf8');
for (const invariant of [
  'assertStockNotFrozen',
  'INVENTORY_STOCK_FROZEN',
  "status: { in: ['IN_PROGRESS', 'SUBMITTED'] }",
]) {
  if (!inventoryRepo.includes(invariant)) failures.push(`Inventory stock-freeze invariant missing: ${invariant}`);
}

const pcService = readFileSync(join(root, 'backend/src/modules/procurement/contracts/purchase-contract.service.ts'), 'utf8');
for (const invariant of [
  "entityType: 'PURCHASE_CONTRACT'",
  "entityType: 'PURCHASE_RELEASE_ORDER'",
  'PURCHASE_CONTRACT_MAKER_CHECKER_REQUIRED',
  'PURCHASE_CONTRACT_NOT_ACTIVE',
  'PURCHASE_CONTRACT_QUANTITY_EXCEEDED',
  'PURCHASE_CONTRACT_VALUE_EXCEEDED',
  'incrementContractItemRelease',
  'incrementContractReleaseValue',
  "type: 'purchase_release_order.created'",
  'this.vendors.assertApproved',
  'this.inventory.getProductForProcurement',
]) {
  if (!pcService.includes(invariant)) failures.push(`Purchase contract service invariant missing: ${invariant}`);
}
if (/\btx\s*\.\s*[a-zA-Z]\w*\s*\./.test(pcService)) failures.push('PurchaseContractService must persist through repository/facades only.');
if (pcService.includes('BullMQ') || pcService.includes("from 'bullmq'")) failures.push('Purchase contract critical state must not use BullMQ.');

const pcModule = readFileSync(join(root, 'backend/src/modules/procurement/procurement.module.ts'), 'utf8');
for (const invariant of [
  'PurchaseContractService',
  'purchaseContractRoutes',
  'new PurchaseContractController',
]) {
  if (!pcModule.includes(invariant)) failures.push(`Procurement module purchase-contract wiring missing: ${invariant}`);
}

const contracts = readFileSync(join(root, 'shared/src/contracts/procurement/purchase-contract.contracts.ts'), 'utf8');
for (const invariant of [
  'CreatePurchaseContractSchema',
  'CreatePurchaseReleaseOrderSchema',
  'PurchaseContractStatusSchema',
  'PurchaseReleaseOrderStatusSchema',
]) {
  if (!contracts.includes(invariant)) failures.push(`Shared purchase-contract contract missing: ${invariant}`);
}

for (const file of [
  'backend/src/modules/procurement/contracts/purchase-contract.repository.ts',
  'backend/src/modules/procurement/contracts/purchase-contract.service.ts',
  'backend/src/modules/procurement/contracts/purchase-contract.controller.ts',
  'backend/src/modules/procurement/contracts/purchase-contract.routes.ts',
  'frontend/src/app/(erp)/vendor-onboarding/page.tsx',
  'frontend/src/app/(erp)/stock-counts/page.tsx',
  'frontend/src/app/(erp)/purchase-contracts/page.tsx',
  'docs/architecture/source-boundaries/procurement-commercial-extensions.md',
  'docs/domain-rules/procurement-commercial-extensions/TRANSACTION_MODEL.md',
]) {
  if (!existsSync(join(root, file))) failures.push(`Missing commercial-procurement file: ${file}`);
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!String(pkg.scripts?.['verify:static'] ?? '').includes('commercial-procurement:check')) failures.push('verify:static does not include commercial-procurement:check.');
if (!String(pkg.scripts?.verify ?? '').includes('commercial-procurement:check')) failures.push('verify does not include commercial-procurement:check.');

if (failures.length) {
  console.error('Commercial-procurement gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Commercial-procurement gate PASSED: ${lock.lockedRouteCount} procurement/inventory commercial-extension routes and ${lock.sourceModelCountPlusSupport} models/support models.`);
