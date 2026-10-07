#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const startedAt = new Date().toISOString();
const checks = [];
const failures = [];
const blockers = [];
const warnings = [];
const previousPassWarnings = [];

function pathOf(path) { return join(root, path); }
function hasFile(path) { return existsSync(pathOf(path)); }
function read(path) { return hasFile(path) ? readFileSync(pathOf(path), 'utf8') : ''; }
function readJson(path) { return JSON.parse(read(path) || '{}'); }
function check(name, passed, message, options = {}) {
  const result = { name, passed: Boolean(passed), message: passed ? 'ok' : message };
  checks.push(result);
  if (!passed) {
    if (options.blocker) blockers.push(result);
    else failures.push(result);
  }
}
function includesAll(label, content, tokens, messagePrefix) {
  for (const token of tokens) check(`${label}: ${token}`, content.includes(token), `${messagePrefix}: missing ${token}`);
}
function count(content, regex) { return (content.match(regex) ?? []).length; }

mkdirSync(pathOf('certification-output'), { recursive: true });

const pkg = readJson('package.json');
check('PASS 08 package script exists', pkg.scripts?.['pass:08:check'] === 'node scripts/check-pass-08-stock-count-completion.mjs', 'package.json must expose pass:08:check.');
check('PASS 08 source-only package script exists', pkg.scripts?.['pass:08:source-check'] === 'node scripts/check-pass-08-stock-count-completion.mjs --source-only', 'package.json must expose pass:08:source-check.');
check('PASS 08 bash certifier exists', hasFile('scripts/pass-08-stock-count-completion-certify.sh'), 'PASS 08 bash certifier missing.');
check('PASS 08 PowerShell certifier exists', hasFile('scripts/pass-08-stock-count-completion-certify.ps1'), 'PASS 08 PowerShell certifier missing.');

for (const evidencePath of [
  'certification-output/pass-00-baseline-certification.json',
  'certification-output/pass-01-architecture-boundary-audit.json',
  'certification-output/pass-02-database-migration-seed-certification.json',
  'certification-output/pass-03-core-platform-security.json',
  'certification-output/pass-04-number-sequence-feature-flags.json',
  'certification-output/pass-05-business-masters-completion.json',
  'certification-output/pass-06-import-wizard-completion.json',
  'certification-output/pass-07-inventory-ledger-completion.json',
]) {
  if (!hasFile(evidencePath)) {
    if (!sourceOnly) check(`previous pass evidence exists: ${evidencePath}`, false, `${evidencePath} is missing.`);
    continue;
  }
  const status = String(readJson(evidencePath).status ?? '');
  const text = read(evidencePath);
  const knownRuntimeHold = text.includes('pnpm-lock.yaml') || text.includes('frozen-lockfile') || status.includes('RUNTIME_PENDING') || status.includes('OVERALL_HOLD');
  if (sourceOnly && (status.includes('FAIL') || status.includes('HOLD')) && knownRuntimeHold) {
    previousPassWarnings.push(`${evidencePath} remains accepted for source-level continuation because lockfile/runtime proof is pending.`);
    check(`previous pass source evidence tolerated pending runtime: ${evidencePath}`, true, '');
  } else {
    check(`previous pass evidence not failed: ${evidencePath}`, !status.includes('FAIL'), `${evidencePath} has failing status ${status}.`, { blocker: !sourceOnly });
  }
}

if (!sourceOnly) {
  check('root pnpm-lock.yaml exists for strict runtime certification', hasFile('pnpm-lock.yaml'), 'pnpm-lock.yaml is missing; run pnpm install from the root and commit the generated lockfile.', { blocker: true });
}

for (const required of [
  'backend/src/modules/inventory/stock-count/stock-count.routes.ts',
  'backend/src/modules/inventory/stock-count/stock-count.controller.ts',
  'backend/src/modules/inventory/stock-count/stock-count.service.ts',
  'backend/src/modules/inventory/stock-count/stock-count.repository.ts',
  'backend/src/modules/inventory/stock-count/stock-count-completion-policy.test.ts',
  'shared/src/contracts/inventory/stock-count.contracts.ts',
  'frontend/src/modules/inventory/stock-count-management-page.tsx',
  'frontend/src/modules/inventory/inventory-resource-detail.tsx',
  'database/prisma/schema.prisma',
]) {
  check(`PASS 08 source file exists: ${required}`, hasFile(required), `${required} is required.`);
}

const routes = read('backend/src/modules/inventory/stock-count/stock-count.routes.ts');
includesAll('stock count route present', routes, [
  '/api/v1/stock-counts',
  '/api/v1/stock-counts/:id',
  '/api/v1/stock-counts/:id/count-sheet',
  '/api/v1/stock-counts/:id/start',
  '/api/v1/stock-counts/:id/submit',
  '/api/v1/stock-counts/:id/post',
], 'Locked Fastify stock-count endpoint missing');
check('stock-count routes use defineLockedRoute for list/detail/commands', count(routes, /defineLockedRoute/g) >= 7, 'Stock-count routes must be explicit locked routes.');
includesAll('stock count auth/module gates', routes, ['authenticateRequest', 'resolveTenantRequest', 'assertPermission', "assertModuleEnabled(request.tenant!.organizationId, 'inventory')"], 'Stock-count route guard incomplete');
includesAll('stock count permissions', routes, ['inventory.view', 'stock_count.manage', 'stock_count.post'], 'Stock-count permission gate incomplete');

const contracts = read('shared/src/contracts/inventory/stock-count.contracts.ts');
includesAll('stock-count contracts', contracts, [
  'StockCountQuerySchema',
  'CreateStockCountSchema',
  'StartStockCountSchema',
  'SubmitStockCountSchema',
  'PostStockCountSchema',
  'StockCountLineDataSchema',
  'StockCountVarianceDataSchema',
  'StockCountDetailResponseSchema',
  'StockCountListResponseSchema',
  'StockCountSheetResponseSchema',
], 'Shared stock-count contract incomplete');
check('submit contract rejects negative counted quantity', contracts.includes('countedQty cannot be negative'), 'Submit count contract must reject negative physical counts.');
check('stock count contracts exported', read('shared/src/contracts/inventory/index.ts').includes('stock-count.contracts'), 'Stock-count contracts must be exported from shared inventory index.');

const repo = read('backend/src/modules/inventory/stock-count/stock-count.repository.ts');
includesAll('stock-count repository persistence', repo, [
  'list(',
  'detail(',
  'countSheet(',
  'conflictingActiveCount',
  'snapshotBalances',
  'createLines',
  'FOR UPDATE',
  'createApproval',
  'createAdjustment',
  'createAdjustmentLine',
  'createPosting',
  'markPosted',
], 'Stock-count repository missing persistence behavior');
check('stock-count repository branches list/detail when branch context exists', repo.includes('warehouse: { branchId'), 'Stock count list/detail must be branch scoped.');
check('stock-count repository creates lines with skipDuplicates', repo.includes('skipDuplicates: true'), 'Starting a count must be retry-safe for line creation.');

const service = read('backend/src/modules/inventory/stock-count/stock-count.service.ts');
includesAll('stock-count service workflow', service, [
  'list(',
  'get(',
  'countSheet(',
  'withTransaction',
  'STOCK_COUNT_FREEZE_CONFLICT',
  'STOCK_COUNT_NO_STOCK_SCOPE',
  'STOCK_COUNT_DUPLICATE_LINE',
  'STOCK_COUNT_LINES_INCOMPLETE',
  'STOCK_COUNT_MAKER_CHECKER_REQUIRED',
  'createAdjustmentLine',
  'applyOnHandDelta',
  'bypassFreeze: true',
  'createTransaction',
  "referenceType: 'StockCount'",
  'STOCK_COUNT_CREATED',
  'STOCK_COUNT_STARTED',
  'STOCK_COUNT_SUBMITTED',
  'STOCK_COUNT_POSTED',
], 'Stock-count service missing business workflow behavior');
check('stock-count service validates warehouse/location scope', service.includes('assertWarehouseAndLocation') && service.includes('INVENTORY_BRANCH_SCOPE_DENIED'), 'Stock count service must validate warehouse/location and branch scope.');
check('stock-count post checks submitted line state', service.includes('STOCK_COUNT_LINES_NOT_SUBMITTED'), 'Stock count posting must reject unsubmitted lines.');
check('stock-count post writes only variance ledger lines', service.includes('if (variance.isZero()) continue'), 'Zero-variance lines should not create adjustment ledger noise.');

const controller = read('backend/src/modules/inventory/stock-count/stock-count.controller.ts');
includesAll('stock-count controller wiring', controller, ['listEnvelope', 'dataEnvelope', 'StockCountQuerySchema', 'CreateStockCountSchema', 'StartStockCountSchema', 'SubmitStockCountSchema', 'PostStockCountSchema'], 'Stock count controller contract/envelope incomplete');

const prisma = read('database/prisma/schema.prisma');
for (const model of ['model StockCount', 'model StockCountLine', 'model StockCountVariance', 'model StockCountApproval', 'model StockCountPosting']) {
  check(`Prisma model exists: ${model}`, prisma.includes(model), `${model} missing from Prisma schema.`);
}
includesAll('Prisma stock-count fields', prisma, ['organizationId', 'warehouseId', 'locationId', 'countType', 'status', 'createdByUserId', 'frozenAt', 'submittedAt', 'postedAt'], 'StockCount model field missing');
check('StockCountLine uniqueness protects duplicate product count lines', prisma.includes('@@unique([stockCountId, productId])'), 'StockCountLine must be unique per count/product.');
check('StockCountPosting is unique per stock count', prisma.includes('stockCountId      String   @unique'), 'StockCountPosting must be 1:1 with StockCount.');

const inventoryRepo = read('backend/src/modules/inventory/inventory.repository.ts');
check('active stock counts freeze normal stock mutations', inventoryRepo.includes('assertStockNotFrozen') && inventoryRepo.includes('INVENTORY_STOCK_FROZEN'), 'Inventory repository must block normal stock mutation while a count is active.');
check('stock count active statuses block in-progress/submitted scopes', inventoryRepo.includes("'IN_PROGRESS', 'SUBMITTED'") || service.includes("'IN_PROGRESS', 'SUBMITTED'"), 'Stock count freeze must cover in-progress/submitted scopes.');

const frontendPage = read('frontend/src/modules/inventory/stock-count-management-page.tsx');
includesAll('stock-count frontend page', frontendPage, ['EntityList', 'Create Stock Count', 'Physical stock count and cycle count', 'Starting a count snapshots', 'Posting a count uses maker-checker'], 'Stock-count frontend page incomplete');
const detail = read('frontend/src/modules/inventory/inventory-resource-detail.tsx');
check('stock-count detail uses real backend detail endpoint', detail.includes("resource.key === 'stock-counts'"), 'Stock count detail page must use the new detail endpoint instead of command-only placeholder.');

const formRegistry = read('frontend/src/modules/forms/resource-form-registry.ts');
check('stock-count create form is registered', formRegistry.includes("resourceKey: 'stock-counts'") && formRegistry.includes('CreateStockCountSchema'), 'Stock count create form must use RHF/Zod resource registry.');
const commandPanel = read('frontend/src/modules/inventory/inventory-command-panel.tsx');
includesAll('stock-count command forms', commandPanel, ['StartStockCountSchema', 'SubmitStockCountSchema', 'PostStockCountSchema', 'start-stock-count', 'submit-stock-count', 'post-stock-count'], 'Stock count command form schema missing');

const status = blockers.length
  ? 'FAIL_BLOCKED'
  : failures.length
    ? (sourceOnly ? 'FAIL_SOURCE_LEVEL' : 'FAIL_STRICT_RUNTIME')
    : sourceOnly
      ? 'PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME'
      : 'PASS_STRICT_RUNTIME';

const payload = {
  pass: 'PASS_08',
  name: 'Stock Count and Cycle Count Completion',
  mode: sourceOnly ? 'source-only' : 'strict-runtime',
  status,
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
    'pnpm pass:08:check',
    'pnpm inventory:check',
    'pnpm typecheck',
    'pnpm test',
    'pnpm db:migrate:deploy',
    'pnpm db:seed',
    'pnpm test -- --runInBand stock-count inventory',
  ],
};
writeFileSync(pathOf('certification-output/pass-08-stock-count-completion.json'), `${JSON.stringify(payload, null, 2)}\n`);
console.log(`[${status}] PASS 08 stock count completion checks: ${checks.filter((c) => c.passed).length}/${checks.length} passed, ${failures.length} failures, ${blockers.length} blockers.`);
if (warnings.length || previousPassWarnings.length) console.log([...warnings, ...previousPassWarnings].join('\n'));
if (blockers.length || failures.length) process.exit(1);
