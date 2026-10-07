import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];

const prior = spawnSync(process.execPath, ['scripts/check-projects.mjs'], { stdio: 'inherit' });
if (prior.status !== 0) process.exit(prior.status ?? 1);

const lock = JSON.parse(
  readFileSync(join(root, 'docs/contracts/capability-locks/assets.json'), 'utf8'),
);
const catalog = readFileSync(
  join(root, 'docs/contracts/api-endpoint-matrix.csv'),
  'utf8',
);
const routes = readFileSync(
  join(root, 'backend/src/modules/assets/asset.routes.ts'),
  'utf8',
);

for (const route of lock.lockedRoutes) {
  const signature = `defineLockedRoute('${route.method}', '${route.path}')`;
  if (!routes.includes(signature)) failures.push(`Missing locked Asset route: ${route.method} ${route.path}`);
  if (!catalog.includes(route.path)) failures.push(`Asset route absent frozen catalog: ${route.path}`);
  if (route.permission !== 'Authenticated/portal' && !routes.includes(`'${route.permission}'`)) {
    failures.push(`Asset permission guard missing: ${route.permission}`);
  }
}

const routeMatches = [
  ...routes.matchAll(/defineLockedRoute\('([A-Z]+)', '([^']+)'\)/g),
].map((match) => `${match[1]} ${match[2]}`);
if (new Set(routeMatches).size !== lock.lockedRouteCount) {
  failures.push(`Expected ${lock.lockedRouteCount} unique Asset-related routes, found ${new Set(routeMatches).size}`);
}

const schema = readFileSync(join(root, 'database/prisma/schema.prisma'), 'utf8');
for (const model of lock.newPhysicalModels) {
  if (!new RegExp(`model\\s+${model}\\s*\\{`).test(schema)) failures.push(`Missing Asset Prisma model: ${model}`);
}
if (/\bFloat\b/.test(schema)) failures.push('Float introduced into Prisma schema.');

const migration = readFileSync(
  join(root, 'database/prisma/migrations/20260903000400_pass10_assets/migration.sql'),
  'utf8',
);
for (const invariant of [
  "'PROCURED','IN_WAREHOUSE','ALLOCATED','ISSUED','INSTALLED','ACTIVE'",
  "'ACTIVE','EXPIRING','EXPIRED','VOID'",
  'Asset_organizationId_assetNo_key',
  'Asset_serialNumberId_key',
  'AssetWarranty_dates_check',
  'AssetQrTag_token_key',
  'AssetRMA_organizationId_rmaNo_key',
  'SerialNumber_assetId_fkey',
  'SerialNumber_assetId_key',
]) {
  if (!migration.includes(invariant)) failures.push(`Asset migration invariant missing: ${invariant}`);
}

const assetSourceFiles = [
  'backend/src/modules/assets/asset.service.ts',
  'backend/src/modules/assets/asset-lifecycle-policy.ts',
  'backend/src/modules/assets/asset-lifecycle-completion-policy.ts',
].map((path) => readFileSync(join(root, path), 'utf8')).join('\n');
for (const invariant of [
  "entityType: 'ASSET'",
  "entityType: 'RMA'",
  'ASSET_SERIAL_REGISTRATION_REQUIRED',
  'ASSET_INSTALL_INVALID_STATE',
  'this.inventory.installSerializedAsset',
  "type: 'asset.installed'",
  "type: 'asset.warranty.expiring'",
  "'REPLACED'",
  "'RETIRED'",
  'requestApprovalIfConfigured',
  "subjectType: 'AssetRetirement'",
  'ASSET_QR_INVALID_OR_EXPIRED',
  'hashToken(rawToken)',
  'ASSET_QR_RESOLVED',
]) {
  if (!assetSourceFiles.includes(invariant)) failures.push(`Asset source invariant missing: ${invariant}`);
}
if (assetSourceFiles.includes('BullMQ') || assetSourceFiles.includes("from 'bullmq'")) {
  failures.push('Asset critical state must not use BullMQ.');
}

const invFacade = readFileSync(
  join(root, 'backend/src/modules/inventory/inventory.facade.ts'),
  'utf8',
);
for (const invariant of [
  'registerSerializedAsset',
  'linkSerializedAsset',
  'installSerializedAsset',
  "'CUSTOMER_INSTALLATION'",
  "status: 'INSTALLED'",
  'currentWarehouseId: null',
  'linkTransactionSerials',
]) {
  if (!invFacade.includes(invariant)) failures.push(`Inventory Asset facade invariant missing: ${invariant}`);
}

const assetModule = readFileSync(
  join(root, 'backend/src/modules/assets/asset.module.ts'),
  'utf8',
);
for (const boundary of [
  "type { ApprovalFacade } from '../approvals/index.js'",
  "type { CustomerFacade } from '../customers/index.js'",
  "type { EmployeeFacade } from '../hr/index.js'",
  "type { InventoryFacade } from '../inventory/index.js'",
  "type { ProjectFacade } from '../projects/index.js'",
  "type { VendorGovernanceFacade } from '../vendors/index.js'",
]) {
  if (!assetModule.includes(boundary)) failures.push(`Asset public-facade boundary missing: ${boundary}`);
}

const app = readFileSync(join(root, 'backend/src/app.ts'), 'utf8');
for (const invariant of [
  'createAssetModule(',
  "approvalSubjects.register('AssetRetirement', assets.facade)",
  'app.register(assets.plugin',
]) {
  if (!app.includes(invariant)) failures.push(`Asset app composition missing: ${invariant}`);
}

for (const file of [
  'backend/src/modules/assets/asset.repository.ts',
  'backend/src/modules/assets/asset.service.ts',
  'backend/src/modules/assets/asset.controller.ts',
  'backend/src/modules/assets/asset.routes.ts',
  'backend/src/modules/assets/asset.facade.ts',
  'backend/src/modules/assets/asset.module.ts',
  'frontend/src/app/(erp)/assets/page.tsx',
]) {
  if (!existsSync(join(root, file))) failures.push(`Missing Asset file: ${file}`);
}

if (failures.length) {
  console.error('Assets gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Assets gate PASSED: ${lock.assetCatalogRouteCount} exact locked Asset routes + ${lock.relatedCustomerSiteAssetRouteCount} locked site-assets route and ${lock.newPhysicalModelCount} Asset models.`,
);
