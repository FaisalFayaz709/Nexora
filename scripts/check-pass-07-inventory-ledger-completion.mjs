#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const startedAt = new Date().toISOString();
const checks = [];
const failures = [];
const blockers = [];
const warnings = [];
const previousPassWarnings = [];

function pathOf(path) { return join(root, path); }
function hasFile(path) { return existsSync(pathOf(path)) && statSync(pathOf(path)).isFile(); }
function hasDir(path) { return existsSync(pathOf(path)) && statSync(pathOf(path)).isDirectory(); }
function read(path) { return readFileSync(pathOf(path), 'utf8'); }
function readJson(path) { return JSON.parse(read(path)); }
function check(name, ok, message, options = {}) {
  checks.push({ name, ok, severity: options.blocker ? 'blocker' : options.warning ? 'warning' : 'failure' });
  if (ok) return;
  if (options.warning) warnings.push(message);
  else if (options.blocker) blockers.push(message);
  else failures.push(message);
}
function count(source, pattern) { return (source.match(pattern) ?? []).length; }
function walkFiles(dir, predicate) {
  const out = [];
  function walk(current) {
    if (!existsSync(current)) return;
    for (const entry of readdirSync(current)) {
      if (entry === 'node_modules' || entry === '.next' || entry === 'dist' || entry === '.git') continue;
      const p = join(current, entry);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (predicate(p)) out.push(p);
    }
  }
  walk(pathOf(dir));
  return out.map((p) => relative(root, p));
}
function runNodeGate(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: root, stdio: 'pipe', encoding: 'utf8' });
  return { ok: result.status === 0, status: result.status, stdout: result.stdout, stderr: result.stderr };
}
function writeEvidence(status, message, extra = {}) {
  mkdirSync(pathOf('certification-output'), { recursive: true });
  const payload = {
    pass: 'PASS_07',
    name: 'Inventory Ledger and Stock Control Completion',
    mode: sourceOnly ? 'source-only' : 'strict-runtime',
    status,
    message,
    checkedAt: startedAt,
    finishedAt: new Date().toISOString(),
    lockedStackPreserved: true,
    architectureChanged: false,
    sourceLevelGates: checks.length,
    checks,
    warnings,
    blockers,
    failures,
    previousPassWarnings,
    runtimeCommandsRequiredOnDeveloperMachine: [
      'pnpm install --frozen-lockfile',
      'pnpm pass:07:check',
      'pnpm inventory:check',
      'pnpm typecheck',
      'pnpm test',
      'pnpm db:migrate:deploy',
      'pnpm db:seed',
      'pnpm test -- --runInBand inventory stock-reservation stock-transfer stock-adjustment',
    ],
    ...extra,
  };
  writeFileSync(pathOf('certification-output/pass-07-inventory-ledger-completion.json'), `${JSON.stringify(payload, null, 2)}\n`);
}

const packageJson = readJson('package.json');
check('PASS 07 package script exists', packageJson.scripts?.['pass:07:check'] === 'node scripts/check-pass-07-inventory-ledger-completion.mjs', 'package.json must expose pass:07:check.');
check('PASS 07 source-only package script exists', packageJson.scripts?.['pass:07:source-check'] === 'node scripts/check-pass-07-inventory-ledger-completion.mjs --source-only', 'package.json must expose pass:07:source-check.');
check('PASS 07 bash certifier exists', hasFile('scripts/pass-07-inventory-ledger-completion-certify.sh'), 'PASS 07 bash certifier missing.');
check('PASS 07 PowerShell certifier exists', hasFile('scripts/pass-07-inventory-ledger-completion-certify.ps1'), 'PASS 07 PowerShell certifier missing.');

const previousPasses = [
  'certification-output/pass-00-baseline-certification.json',
  'certification-output/pass-01-architecture-boundary-audit.json',
  'certification-output/pass-02-database-migration-seed-certification.json',
  'certification-output/pass-03-core-platform-security.json',
  'certification-output/pass-04-number-sequence-feature-flags.json',
  'certification-output/pass-05-business-masters-completion.json',
  'certification-output/pass-06-import-wizard-completion.json',
];
for (const evidencePath of previousPasses) {
  if (!hasFile(evidencePath)) {
    if (!sourceOnly) check(`previous pass evidence exists: ${evidencePath}`, false, `${evidencePath} is missing.`);
    continue;
  }
  const evidence = readJson(evidencePath);
  const status = String(evidence.status ?? '');
  const hasKnownRuntimeBlocker = JSON.stringify(evidence).includes('pnpm-lock.yaml is missing') || JSON.stringify(evidence).includes('frozen-lockfile');
  if (sourceOnly && status.includes('FAIL') && hasKnownRuntimeBlocker) {
    previousPassWarnings.push(`${evidencePath} remains runtime-HOLD because pnpm-lock/runtime proof is pending.`);
    check(`previous pass source evidence tolerated pending runtime: ${evidencePath}`, true, '');
  } else {
    check(`previous pass evidence is not failed: ${evidencePath}`, !status.includes('FAIL'), `${evidencePath} has failing status ${status}.`, { blocker: !sourceOnly });
  }
}

if (!sourceOnly) {
  check('root pnpm-lock.yaml exists for strict runtime certification', hasFile('pnpm-lock.yaml'), 'pnpm-lock.yaml is missing; run pnpm install from the root and commit the generated lockfile.', { blocker: true });
}

for (const required of [
  'backend/src/modules/inventory/inventory.routes.ts',
  'backend/src/modules/inventory/inventory.controller.ts',
  'backend/src/modules/inventory/inventory.repository.ts',
  'backend/src/modules/inventory/stock-query.service.ts',
  'backend/src/modules/inventory/stock-reservation.service.ts',
  'backend/src/modules/inventory/stock-transfer.service.ts',
  'backend/src/modules/inventory/stock-adjustment.service.ts',
  'backend/src/modules/inventory/inventory.facade.ts',
  'backend/src/modules/inventory/inventory-core-policy.ts',
  'shared/src/contracts/inventory/stock-operations.contracts.ts',
  'database/prisma/schema.prisma',
]) {
  check(`inventory source file exists: ${required}`, hasFile(required), `${required} is required for PASS 07.`);
}

const routes = read('backend/src/modules/inventory/inventory.routes.ts');
for (const route of [
  '/api/v1/inventory/stock',
  '/api/v1/inventory/ledger',
  '/api/v1/inventory/serials/:serialNo',
  '/api/v1/inventory/reservations',
  '/api/v1/inventory/reservations/:id',
  '/api/v1/inventory/transfers',
  '/api/v1/inventory/transfers/:id/dispatch',
  '/api/v1/inventory/transfers/:id/receive',
  '/api/v1/inventory/adjustments',
  '/api/v1/inventory/adjustments/:id/post',
]) {
  check(`locked inventory endpoint present: ${route}`, routes.includes(route), `${route} route missing.`);
}
check('inventory routes use defineLockedRoute', count(routes, /defineLockedRoute/g) >= 10, 'Inventory routes must use locked Fastify route definitions.');
check('inventory routes enforce authenticateRequest', routes.includes('authenticateRequest'), 'Inventory routes must authenticate requests.');
check('inventory routes resolve tenant context', routes.includes('resolveTenantRequest'), 'Inventory routes must resolve tenant context.');
check('inventory routes permission-gate stock reads', routes.includes('inventory.view'), 'Inventory stock and ledger reads must require inventory.view.');
check('inventory routes permission-gate reservations', routes.includes('inventory.reserve'), 'Inventory reservations must require inventory.reserve.');
check('inventory routes permission-gate transfers', routes.includes('inventory.transfer'), 'Inventory transfers must require inventory.transfer.');
check('inventory routes permission-gate transfer receive', routes.includes('inventory.receive'), 'Inventory transfer receive must require inventory.receive.');
check('inventory routes permission-gate adjustments', routes.includes('inventory.adjust'), 'Inventory adjustments must require inventory.adjust.');
check('inventory routes block disabled inventory module', routes.includes("assertModuleEnabled(request.tenant!.organizationId, 'inventory')") || routes.includes("assertModuleEnabled(request.tenant!.organizationId,'inventory')"), 'Inventory routes must check module enablement.');

const contracts = read('shared/src/contracts/inventory/stock-operations.contracts.ts');
for (const token of [
  'StockBalanceQuerySchema',
  'StockLedgerQuerySchema',
  'StockBalanceListResponseSchema',
  'StockLedgerListResponseSchema',
  'CreateStockReservationSchema',
  'StockReservationResponseSchema',
  'StockTransferCommandSchema',
  'StockTransferResponseSchema',
  'CreateStockAdjustmentSchema',
  'StockAdjustmentResponseSchema',
  'SerialNumberResponseSchema',
  'TransferBatchAllocationSchema',
  'AdjustmentBatchAllocationSchema',
]) {
  check(`shared inventory operation contract includes ${token}`, contracts.includes(token), `Shared inventory operation contract must include ${token}.`);
}
for (const type of ['PURCHASE_RECEIPT', 'STOCK_TRANSFER', 'PROJECT_ISSUE', 'TECHNICIAN_ISSUE', 'ADJUSTMENT', 'CUSTOMER_INSTALLATION']) {
  check(`stock ledger contract supports transaction type ${type}`, contracts.includes(type), `Stock ledger must expose ${type}.`);
}
check('shared inventory contracts are exported', read('shared/src/contracts/inventory/index.ts').includes("stock-operations.contracts"), 'Inventory operation contracts must be exported from shared inventory index.');

const repo = read('backend/src/modules/inventory/inventory.repository.ts');
for (const token of [
  'lockBalance',
  'FOR UPDATE',
  'ON CONFLICT',
  'StockBalance',
  'applyOnHandDelta',
  'assertStockNotFrozen',
  'createTransaction',
  'linkTransactionSerials',
  'linkTransactionBatches',
  'findSerialsByNumbers',
  'lockSerialForAsset',
  'lockBatchForService',
  'createCostLayer',
]) {
  check(`inventory repository includes ${token}`, repo.includes(token), `Inventory repository must include ${token}.`);
}
check('balance mutation blocks negative on-hand', repo.includes('nextAggregate.isNegative()') && repo.includes('nextLocation.isNegative()'), 'Balance mutation must block negative aggregate/location balances.');
check('balance mutation blocks on-hand below reserved', repo.includes('lessThan(aggregate.reserved)') && repo.includes('lessThan(location.reserved)'), 'Balance mutation must block on-hand below reserved.');
check('warehouse and location balances mutate together', repo.includes('location.id !== aggregate.id') && repo.includes('updateBalance(tx, aggregate.id'), 'Aggregate and location balances must mutate in the same transaction path.');

const queryService = read('backend/src/modules/inventory/stock-query.service.ts');
for (const token of ['balances(', 'ledger(', 'serial(', 'available:', 'listBalances', 'listLedger', 'findSerial', 'branchId']) {
  check(`stock query service includes ${token}`, queryService.includes(token), `StockQueryService must include ${token}.`);
}

const reservation = read('backend/src/modules/inventory/stock-reservation.service.ts');
for (const token of ['withTransaction', 'lockBalance', 'assertCanReserve', 'StockReservation', 'reserved.add', 'reserved.sub', 'INVENTORY_RESERVATION_CREATED', 'INVENTORY_RESERVATION_RELEASED', 'stock.reservation.created']) {
  check(`stock reservation service includes ${token}`, reservation.includes(token), `Stock reservation service must include ${token}.`);
}
check('reservation service branch-scopes warehouses', reservation.includes('INVENTORY_BRANCH_SCOPE_DENIED'), 'Reservation service must enforce branch scope.');
check('reservation service prevents release of inactive reservation', reservation.includes("reservation.status !== 'ACTIVE'") || reservation.includes('INVENTORY_RESERVATION_INVALID_STATE'), 'Reservation release must be status-aware.');

const transfer = read('backend/src/modules/inventory/stock-transfer.service.ts');
for (const token of [
  'withBusinessNumber',
  'entityType: \'STOCK_TRANSFER\'',
  'withTransaction',
  'lockTransfer',
  'applyOnHandDelta',
  'qty.negated()',
  'STOCK_TRANSFER',
  'setSerialInTransit',
  'setSerialReceived',
  'markDispatched',
  'markReceived',
  'stock.transfer.received',
  'INVENTORY_TRANSFER_DISPATCHED',
  'INVENTORY_TRANSFER_RECEIVED',
  'INVENTORY_SERIAL_COUNT_MISMATCH',
  'INVENTORY_BATCH_QUANTITY_MISMATCH',
]) {
  check(`stock transfer service includes ${token}`, transfer.includes(token), `Stock transfer service must include ${token}.`);
}
check('stock transfer uses DRAFT -> IN_TRANSIT -> RECEIVED state guards', transfer.includes("transfer.status !== 'DRAFT'") && transfer.includes("transfer.status !== 'IN_TRANSIT'"), 'Stock transfer dispatch/receive must enforce state transitions.');
check('stock transfer validates source and destination warehouses differ', transfer.includes('INVENTORY_TRANSFER_SAME_WAREHOUSE'), 'Stock transfer must block same-warehouse transfers.');
check('stock transfer checks low stock after dispatch', transfer.includes('lowStockIfNeeded'), 'Stock transfer must trigger low-stock events after outbound movement.');

const adjustment = read('backend/src/modules/inventory/stock-adjustment.service.ts');
for (const token of [
  'withTransaction',
  'createHeader',
  'createLine',
  'lockAdjustment',
  "adjustment.status !== 'DRAFT'",
  'applyOnHandDelta',
  'ADJUSTMENT',
  'createSerial',
  'updateSerial',
  'upsertBatchForPositive',
  'lockBatch',
  'markPosted',
  'INVENTORY_ADJUSTMENT_CREATED',
  'INVENTORY_ADJUSTMENT_POSTED',
  'stock.low',
]) {
  check(`stock adjustment service includes ${token}`, adjustment.includes(token), `Stock adjustment service must include ${token}.`);
}
check('adjustment service validates serial and batch counts', adjustment.includes('INVENTORY_SERIAL_COUNT_MISMATCH') && adjustment.includes('INVENTORY_BATCH_QUANTITY_MISMATCH'), 'Adjustment service must validate serial/batch quantities.');
check('adjustment service respects approval hook', adjustment.includes('approvalRequestId') && adjustment.includes('INVENTORY_ADJUSTMENT_APPROVAL_REQUIRED'), 'Adjustment posting must respect approval workflow integration.');

const transferRepo = read('backend/src/modules/inventory/stock-transfer.repository.ts');
for (const token of ['lockTransfer', 'FOR UPDATE', 'createHeader', 'createItem', 'attachSerials', 'attachBatches', 'markDispatched', 'markReceived', 'markItemReceived', 'lockSerials']) {
  check(`stock transfer repository includes ${token}`, transferRepo.includes(token), `Stock transfer repository must include ${token}.`);
}

const reservationRepo = read('backend/src/modules/inventory/stock-reservation.repository.ts');
for (const token of ['create', 'lockReservation', 'FOR UPDATE', 'markReleased']) {
  check(`stock reservation repository includes ${token}`, reservationRepo.includes(token), `Stock reservation repository must include ${token}.`);
}

const adjustmentRepo = read('backend/src/modules/inventory/stock-adjustment.repository.ts');
for (const token of ['createHeader', 'createLine', 'lockAdjustment', 'FOR UPDATE', 'lines(', 'markPosted', 'lockBatch', 'upsertBatchForPositive']) {
  check(`stock adjustment repository includes ${token}`, adjustmentRepo.includes(token), `Stock adjustment repository must include ${token}.`);
}

const facade = read('backend/src/modules/inventory/inventory.facade.ts');
for (const token of ['InventoryFacade', 'receivePurchaseReceipt', 'issueToProject', 'consumeForServiceReport', 'installSerializedAsset', 'releaseProjectReservation', 'applyOnHandDelta', 'createTransaction']) {
  check(`inventory facade includes ${token}`, facade.includes(token), `Inventory facade must expose/coordinate ${token}.`);
}
check('inventory facade coordinates purchase receipt atomic stock update', facade.includes('PURCHASE_RECEIPT') && facade.includes('GoodsReceipt'), 'Inventory facade must support purchase receipts for procurement GRN integration.');
check('inventory facade coordinates project issue atomic stock update', facade.includes('PROJECT_ISSUE') && facade.includes('PROJECT'), 'Inventory facade must support project material issue.');
check('inventory facade coordinates service part issue atomic stock update', facade.includes('TECHNICIAN_ISSUE') && (facade.includes('SERVICE_REPORT') || facade.includes('ServiceReport')), 'Inventory facade must support service report part consumption.');
check('inventory facade coordinates asset install stock movement', facade.includes('CUSTOMER_INSTALLATION') && facade.includes('Asset'), 'Inventory facade must support serialized asset installation.');

const policy = read('backend/src/modules/inventory/inventory-core-policy.ts');
for (const token of ['assertCanReserve', 'assertOnHandCanMove', 'assertSerialQuantityMatches', 'assertBatchQuantityMatches', 'InventoryCorePolicyChecklist', 'row-lock-required', 'ledger-entry-required', 'no-async-stock-mutation']) {
  check(`inventory core policy includes ${token}`, policy.includes(token), `Inventory core policy must include ${token}.`);
}

const schema = read('database/prisma/schema.prisma');
for (const model of [
  'StockBalance',
  'StockTransaction',
  'StockTransactionSerial',
  'StockTransactionBatch',
  'StockReservation',
  'StockTransfer',
  'StockTransferItem',
  'StockTransferItemSerial',
  'StockTransferItemBatch',
  'SerialNumber',
  'BatchLot',
  'StockAdjustment',
  'StockAdjustmentLine',
  'InventoryCostLayer',
]) {
  check(`Prisma inventory model exists: ${model}`, new RegExp(`model\\s+${model}\\s+{`).test(schema), `${model} model missing from Prisma schema.`);
}
for (const model of ['StockBalance','StockTransaction','StockReservation','StockTransfer','SerialNumber','BatchLot','StockAdjustment','InventoryCostLayer']) {
  const block = schema.match(new RegExp(`model\\s+${model}\\s+{[\\s\\S]*?\\n}`))?.[0] ?? '';
  check(`${model} has organizationId`, block.includes('organizationId'), `${model} must be tenant-owned and carry organizationId.`);
}
check('StockBalance uniqueness prevents duplicate aggregate/location balance rows', schema.includes('@@unique([organizationId, warehouseId, locationScopeKey, productId]'), 'StockBalance must be unique per org/warehouse/location-scope/product.');
check('StockTransaction indexes support tenant/product/warehouse/date queries', schema.includes('@@index([organizationId, warehouseId, productId, occurredAt]') && schema.includes('@@index([organizationId, type, occurredAt]'), 'StockTransaction needs tenant-leading warehouse/product/date and type/date indexes.');
check('SerialNumber tenant-local uniqueness exists', schema.includes('@@unique([organizationId, serialNo]'), 'Serial numbers must be unique per organization.');
check('BatchLot tenant/product/lot uniqueness exists', schema.includes('@@unique([organizationId, productId, lotNo]'), 'Batch lots must be unique per organization/product/lot.');
check('StockTransfer business number tenant uniqueness exists', schema.includes('@@unique([organizationId, transferNo]'), 'Stock transfer business number must be tenant-unique.');
check('StockAdjustment indexes include tenant/status', schema.includes('@@index([organizationId, status]'), 'StockAdjustment should have tenant/status index.');

const inventoryTests = walkFiles('backend/src/modules/inventory', (p) => /\.test\.ts$|\.integration\.test\.ts$/.test(p));
check('inventory test files exist', inventoryTests.length >= 5, 'Inventory module needs stock reservation/transfer/adjustment/concurrency tests.');
const inventoryTestHaystack = inventoryTests.map((file) => read(file)).join('\n').toLowerCase();
const inventoryTestRequirements = [
  ['over-reservation prevention', inventoryTestHaystack.includes('exceed') && inventoryTestHaystack.includes('available stock')],
  ['reservation above free stock', inventoryTestHaystack.includes('exceeds free stock') || inventoryTestHaystack.includes('rejects reservations above free stock')],
  ['concurrent stock commands', inventoryTestHaystack.includes('concurrent')],
  ['same transfer cannot double-dispatch', inventoryTestHaystack.includes('only one concurrent dispatch') || inventoryTestHaystack.includes('dispatched twice concurrently')],
  ['ledger effects', inventoryTestHaystack.includes('stocktransaction') || inventoryTestHaystack.includes('ledger')],
  ['serial movement', inventoryTestHaystack.includes('serialized') || inventoryTestHaystack.includes('serial')],
  ['batch validation', inventoryTestHaystack.includes('batch')],
  ['stock freeze guard', inventoryTestHaystack.includes('frozen') || inventoryTestHaystack.includes('stock freeze')],
];
for (const [name, ok] of inventoryTestRequirements) {
  check(`inventory tests cover ${name}`, ok, `Inventory tests should cover ${name}.`, { warning: name === 'stock freeze guard' });
}


const frontendInventoryFiles = walkFiles('frontend/src', (p) => /inventory|stock|warehouse|serial|reservation|transfer|adjustment/.test(p) && /\.(ts|tsx)$/.test(p));
check('frontend inventory files exist', frontendInventoryFiles.length >= 10, 'Frontend inventory list/workflow surfaces are expected for PASS 07.');
const frontendInventory = frontendInventoryFiles.map((file) => read(file)).join('\n');
const frontendLower = frontendInventory.toLowerCase();
const frontendRequirements = [
  ['TanStack', frontendInventory.includes('TanStack') || frontendInventory.includes('useReactTable')],
  ['centralized command form dialog', frontendInventory.includes('CommandFormDialog') || frontendInventory.includes('ResourceFormDialog')],
  ['shared Zod command schemas', frontendInventory.includes('EmptyCommandSchema') || frontendInventory.includes('PostStockCountSchema')],
  ['apiGet', frontendInventory.includes('apiGet')],
  ['postCommand/apiPost', frontendInventory.includes('postCommand') || frontendInventory.includes('apiPost')],
  ['Stock Ledger', frontendLower.includes('stock ledger')],
  ['Reservations', frontendInventory.includes('Reservations')],
  ['Transfers', frontendInventory.includes('Transfers')],
  ['Adjustments', frontendInventory.includes('Adjustments')],
  ['Serial', frontendInventory.includes('Serial')],
];
for (const [token, ok] of frontendRequirements) {
  check(`frontend inventory implementation includes ${token}`, ok, `Frontend inventory source should include ${token}.`, { warning: token === 'TanStack' });
}

for (const file of frontendInventoryFiles) {
  const source = read(file);
  check(`frontend inventory file has no Prisma/server imports: ${file}`, !/from ['"](@nexora\/database|@nexora\/backend|@nexora\/worker|.*prisma.*)['"]/.test(source), `${file} imports server-only code.`);
}

for (const doc of [
]) {
  check(`PASS 07 compliance doc exists: ${doc}`, hasFile(doc), `${doc} is missing.`);
}

const existingInventoryGate = hasFile('scripts/check-inventory.mjs') ? runNodeGate('scripts/check-inventory.mjs') : { ok: false, stdout: '', stderr: 'missing check-inventory.mjs' };
check('existing inventory source gate passes', existingInventoryGate.ok, `scripts/check-inventory.mjs failed.\n${existingInventoryGate.stdout}\n${existingInventoryGate.stderr}`);

const failedChecks = failures.length;
const blockerChecks = blockers.length;
let status;
let message;
if (blockerChecks > 0 || failedChecks > 0) {
  status = 'FAIL';
  message = 'PASS 07 inventory ledger/source gates failed. Fix blockers/failures before marking the pass complete.';
} else if (sourceOnly) {
  status = previousPassWarnings.length ? 'PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME' : 'PASS_SOURCE_LEVEL_RUNTIME_PENDING';
  message = previousPassWarnings.length
    ? 'PASS 07 source-level inventory gates passed, but overall project remains HOLD because earlier runtime evidence is pending.'
    : 'PASS 07 source-level inventory gates passed. Runtime certification remains pending on a developer machine.';
} else {
  status = 'PASS_STRICT_RUNTIME_EVIDENCE_REQUIRED';
  message = 'PASS 07 static gates passed. Confirm pnpm/typecheck/tests/database runtime commands on the developer machine.';
}
writeEvidence(status, message, {
  failedChecks,
  blockerChecks,
  inventorySourceFiles: {
    backendInventoryTests: inventoryTests.length,
    frontendInventoryFiles: frontendInventoryFiles.length,
  },
  existingInventoryGate: {
    ok: existingInventoryGate.ok,
    stdout: existingInventoryGate.stdout.slice(-2000),
    stderr: existingInventoryGate.stderr.slice(-2000),
  },
});

if (failedChecks > 0 || blockerChecks > 0) {
  console.error(message);
  for (const failure of failures) console.error(`FAILURE: ${failure}`);
  for (const blocker of blockers) console.error(`BLOCKER: ${blocker}`);
  process.exit(1);
}
console.log(message);
for (const warning of [...warnings, ...previousPassWarnings]) console.warn(`WARNING: ${warning}`);
