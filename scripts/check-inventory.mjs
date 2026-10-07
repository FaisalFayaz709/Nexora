import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const lock = JSON.parse(
  readFileSync(join(root, 'docs/contracts/capability-locks/inventory.json'), 'utf8'),
);
const failures = [];

for (const script of [
  'scripts/check-dependency-foundation.mjs',
  'scripts/check-contracts.mjs',
  'scripts/check-contract-coverage.mjs',
  'scripts/check-database-foundation.mjs',
  'scripts/check-database-runtime-foundation.mjs',
  'scripts/check-identity-organization.mjs',
  'scripts/check-business-masters.mjs',
]) {
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}


const lockedEndpoints = JSON.parse(
  readFileSync(join(root, 'shared/src/contracts/registry/locked-endpoints.json'), 'utf8'),
);
const lockedSignatures = new Set(
  lockedEndpoints.map((entry) => `${entry.method} ${entry.endpoint}`),
);
for (const route of lock.implementedRoutes) {
  if (!lockedSignatures.has(`${route.method} ${route.path}`)) {
    failures.push(`Inventory route is not present in the frozen API registry: ${route.method} ${route.path}`);
  }
}

const schema = readFileSync(join(root, 'database/prisma/schema.prisma'), 'utf8');
for (const model of lock.newPhysicalModels) {
  if (!new RegExp(`model\\s+${model}\\s*\\{`).test(schema)) failures.push(`Missing inventory model: ${model}`);
}
if (/\bFloat\b/.test(schema)) failures.push('Float introduced into the Prisma schema.');

for (const model of [
  'StockBalance','StockTransaction','StockReservation','StockTransfer',
  'SerialNumber','BatchLot','StockAdjustment'
]) {
  const block = schema.match(new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
  if (!/\borganizationId\s+String\b/.test(block)) failures.push(`Tenant-owned inventory model lacks organizationId: ${model}`);
}

for (const invariant of [
  '@@unique([organizationId, warehouseId, locationScopeKey, productId])',
  '@@unique([organizationId, transferNo])',
  '@@unique([organizationId, serialNo])',
  '@@unique([organizationId, productId, lotNo])',
]) {
  if (!schema.includes(invariant)) failures.push(`Missing inventory uniqueness invariant: ${invariant}`);
}

const migration = readFileSync(
  join(root, 'database/prisma/migrations/20260901000400_pass6_inventory/migration.sql'),
  'utf8',
);
for (const invariant of [
  'CHECK ("onHand" >= 0 AND "reserved" >= 0 AND "reserved" <= "onHand")',
  'CREATE TRIGGER "StockTransaction_immutable"',
  'BEFORE UPDATE OR DELETE ON "StockTransaction"',
  '"StockTransfer_different_warehouses_check"',
  '"StockTransaction_type_check"',
]) {
  if (!migration.includes(invariant)) failures.push(`Migration invariant missing: ${invariant}`);
}
for (const type of lock.lockedStockTransactionTypes) {
  if (!migration.includes(`'${type}'`)) failures.push(`Locked stock transaction type missing: ${type}`);
}

const repository = readFileSync(join(root, 'backend/src/modules/inventory/inventory.repository.ts'), 'utf8');
for (const invariant of [
  'FOR UPDATE',
  'ON CONFLICT ("organizationId","warehouseId","locationScopeKey","productId")',
  'locationScopeKey',
]) {
  if (!repository.includes(invariant)) failures.push(`Balance locking invariant missing: ${invariant}`);
}

const reservation = readFileSync(join(root, 'backend/src/modules/inventory/stock-reservation.service.ts'), 'utf8');
const inventoryCorePolicy = readFileSync(join(root, 'backend/src/modules/inventory/inventory-core-policy.ts'), 'utf8');
if (!reservation.includes("import { assertCanReserve }") || !reservation.includes('assertCanReserve(balance, qty)')) {
  failures.push('Reservation service does not delegate free-stock enforcement to the centralized inventory policy.');
}
for (const invariant of [
  'export function assertCanReserve',
  'const available = availableStock(window)',
  'available.lessThan(qty)',
  'INVENTORY_INSUFFICIENT_AVAILABLE_STOCK',
]) {
  if (!inventoryCorePolicy.includes(invariant)) {
    failures.push(`Centralized reservation free-stock policy invariant missing: ${invariant}`);
  }
}
if (!reservation.includes('withTransaction(async (tx)')) failures.push('Reservation mutation is not transactional.');

const transfer = readFileSync(join(root, 'backend/src/modules/inventory/stock-transfer.service.ts'), 'utf8');
for (const invariant of [
  "transfer.status !== 'DRAFT'",
  "type: 'STOCK_TRANSFER'",
  'qty: item.qty.negated()',
  "transfer.status !== 'IN_TRANSIT'",
  "type: 'stock.transfer.received'",
  'setSerialInTransit',
  'setSerialReceived',
]) {
  if (!transfer.includes(invariant)) failures.push(`Transfer invariant missing: ${invariant}`);
}
if (transfer.includes('BullMQ')) failures.push('Critical stock transfer effect must not be queued.');

const adjustment = readFileSync(join(root, 'backend/src/modules/inventory/stock-adjustment.service.ts'), 'utf8');
for (const invariant of [
  "adjustment.status !== 'DRAFT'",
  'applyOnHandDelta(tx,',
  "type: 'ADJUSTMENT'",
  'INVENTORY_ADJUSTMENT_APPROVAL_REQUIRED',
]) {
  if (!adjustment.includes(invariant)) failures.push(`Adjustment invariant missing: ${invariant}`);
}

const routeFiles = [];
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.routes.ts')) routeFiles.push(p);
  }
}
walk(join(root, 'backend/src/modules'));
const routeText = routeFiles.map((p) => readFileSync(p, 'utf8')).join('\n');

for (const route of lock.implementedRoutes) {
  const signature = `defineLockedRoute('${route.method}', '${route.path}')`;
  if (!routeText.includes(signature)) failures.push(`Missing locked inventory route: ${route.method} ${route.path}`);
}
for (const permission of [
  'inventory.view','inventory.reserve','inventory.transfer','inventory.receive','inventory.adjust'
]) {
  if (!routeText.includes(`'${permission}'`)) failures.push(`Inventory permission guard missing: ${permission}`);
}

const facade = readFileSync(join(root, 'backend/src/modules/inventory/inventory.facade.ts'), 'utf8');
if (!facade.includes('tx: TransactionClient')) failures.push('Inventory facade does not accept caller transaction.');
if (!facade.includes("type: 'PURCHASE_RECEIPT'")) failures.push('Inventory facade lacks procurement receipt stock entry boundary.');

const app = readFileSync(join(root, 'backend/src/app.ts'), 'utf8');
if (!app.includes('createInventoryModule(') || !app.includes('numberSequence.facade')) {
  failures.push('Inventory module is not composed with NumberSequence public facade.');
}

if (failures.length) {
  console.error('Inventory gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Inventory gate PASSED: ${lock.routeCount} locked inventory routes, ${lock.newPhysicalModelCount} new inventory models.`);
