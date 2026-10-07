#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const checks = [];
const failures = [];
const blockers = [];

function hasFile(path) {
  return existsSync(join(root, path));
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function json(path) {
  return JSON.parse(read(path));
}

function check(name, passed, message = '', options = {}) {
  checks.push({ name, passed, message, blocker: Boolean(options.blocker) });
  if (!passed) {
    const entry = `${name}${message ? ` — ${message}` : ''}`;
    if (options.blocker) blockers.push(entry);
    else failures.push(entry);
  }
}

function includesAll(name, content, required, message = '') {
  const missing = required.filter((needle) => !content.includes(needle));
  check(name, missing.length === 0, missing.length ? `${message || 'Missing invariant(s)'}: ${missing.join(', ')}` : '');
}

function runGate(name, args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  const passed = result.status === 0;
  check(name, passed, passed ? '' : `${args.join(' ')} failed with status ${result.status}. ${(result.stderr || result.stdout).slice(0, 1200)}`);
}

function previousEvidence(path) {
  if (!hasFile(path)) {
    if (sourceOnly) return;
    check(`previous pass evidence exists: ${path}`, false, `${path} is missing.`, { blocker: true });
    return;
  }
  const raw = read(path);
  let status = raw;
  try { status = JSON.stringify(JSON.parse(raw).status ?? JSON.parse(raw).result ?? JSON.parse(raw)); } catch {}
  check(`previous pass evidence is not failed: ${path}`, !String(status).includes('FAIL'), `${path} has failing status ${status}.`, { blocker: !sourceOnly });
}

mkdirSync(join(root, 'certification-output'), { recursive: true });

if (!sourceOnly) {
  check('root pnpm-lock.yaml exists for strict runtime certification', hasFile('pnpm-lock.yaml'), 'pnpm-lock.yaml is missing; run pnpm install from the root and commit the generated lockfile.', { blocker: true });
}

previousEvidence('certification-output/pass-11-project-management-bom-budget-material-flow.json');

runGate('architecture gate still passes', ['scripts/check-architecture.mjs']);
runGate('contracts gate still passes', ['scripts/check-contracts.mjs']);
runGate('PASS 11 project management gate still passes source-only', ['scripts/check-pass-11-project-management-bom-budget-material-flow.mjs', '--source-only']);
runGate('assets source gate passes', ['scripts/check-assets.mjs']);

for (const required of [
  'backend/src/modules/assets/asset.routes.ts',
  'backend/src/modules/assets/asset.controller.ts',
  'backend/src/modules/assets/asset.service.ts',
  'backend/src/modules/assets/asset.repository.ts',
  'backend/src/modules/assets/asset.facade.ts',
  'backend/src/modules/assets/asset.module.ts',
  'backend/src/modules/assets/asset-lifecycle-policy.ts',
  'backend/src/modules/assets/asset-lifecycle-completion-policy.ts',
  'backend/src/modules/assets/asset-lifecycle-completion-policy.test.ts',
  'backend/src/modules/assets/asset-lifecycle.integration.test.ts',
  'backend/src/modules/inventory/inventory.facade.ts',
  'shared/src/contracts/assets/asset.contracts.ts',
  'shared/src/contracts/assets/asset-lifecycle-completion.contracts.ts',
  'shared/src/contracts/assets/asset-lifecycle-manifest.ts',
  'frontend/src/modules/assets/asset-resource-config.ts',
  'frontend/src/modules/assets/asset-command-panel.tsx',
  'frontend/src/modules/assets/asset-resource-detail.tsx',
  'frontend/src/modules/assets/asset-resource-form-page.tsx',
  'frontend/src/modules/assets/asset-resource-list.tsx',
  'frontend/src/modules/assets/api.ts',
  'frontend/src/modules/forms/resource-form-registry.ts',
  'frontend/src/app/(erp)/assets/page.tsx',
  'frontend/src/app/(erp)/assets/[id]/page.tsx',
  'frontend/src/app/(erp)/assets/[id]/history/page.tsx',
  'frontend/src/app/(erp)/assets/[id]/install/page.tsx',
  'frontend/src/app/(erp)/assets/[id]/replace/page.tsx',
  'frontend/src/app/(erp)/assets/[id]/retire/page.tsx',
  'frontend/src/app/(erp)/assets/[id]/qr/page.tsx',
  'frontend/src/app/(erp)/assets/[id]/rma/page.tsx',
  'database/prisma/schema.prisma',
  'docs/contracts/capability-locks/assets.json',
  'docs/contracts/api-endpoint-matrix.csv',
  'shared/src/contracts/registry/locked-endpoints.json',
]) {
  check(`PASS 12 source file exists: ${required}`, hasFile(required), `${required} is required.`);
}

const lock = json('docs/contracts/capability-locks/assets.json');
check('Asset capability lock has 13 locked routes', lock.lockedRouteCount === 13, `Expected 13 asset routes, found ${lock.lockedRouteCount}.`);
for (const signature of [
  ['GET', '/api/v1/assets'],
  ['GET', '/api/v1/assets/:id'],
  ['POST', '/api/v1/assets'],
  ['PATCH', '/api/v1/assets/:id'],
  ['POST', '/api/v1/assets/register-from-stock'],
  ['POST', '/api/v1/assets/:id/install'],
  ['POST', '/api/v1/assets/:id/replace'],
  ['POST', '/api/v1/assets/:id/retire'],
  ['GET', '/api/v1/assets/:id/history'],
  ['POST', '/api/v1/assets/:id/qr/rotate'],
  ['GET', '/api/v1/asset-qr/:token'],
  ['POST', '/api/v1/assets/:id/rma'],
  ['GET', '/api/v1/customer-sites/:id/assets'],
]) {
  const [method, path] = signature;
  check(`Asset capability lock includes ${method} ${path}`, lock.lockedRoutes.some((r) => r.method === method && r.path === path), `${method} ${path} missing from assets capability lock.`);
}

const routes = read('backend/src/modules/assets/asset.routes.ts');
includesAll('Asset route surface exposes locked CRUD, lifecycle, QR, RMA and site-assets routes', routes, [
  "defineLockedRoute('GET', '/api/v1/assets')",
  "defineLockedRoute('POST', '/api/v1/assets/register-from-stock')",
  "defineLockedRoute('POST', '/api/v1/assets/:id/install')",
  "defineLockedRoute('POST', '/api/v1/assets/:id/replace')",
  "defineLockedRoute('POST', '/api/v1/assets/:id/retire')",
  "defineLockedRoute('GET', '/api/v1/assets/:id/history')",
  "defineLockedRoute('POST', '/api/v1/assets/:id/qr/rotate')",
  "defineLockedRoute('GET', '/api/v1/asset-qr/:token')",
  "defineLockedRoute('POST', '/api/v1/assets/:id/rma')",
  "defineLockedRoute('GET', '/api/v1/customer-sites/:id/assets')",
  "guard('asset.view')",
  "guard('asset.create')",
  "guard('asset.install')",
  "guard('asset.replace')",
  "guard('asset.retire')",
  "guard('asset.manage_qr')",
  "guard('asset.rma')",
  "assertModuleEnabled(request.tenant!.organizationId, 'assets')",
], 'Asset route/permission invariant missing');

const controller = read('backend/src/modules/assets/asset.controller.ts');
includesAll('Asset controller parses shared contracts and delegates to service only', controller, [
  'CreateAssetSchema',
  'RegisterAssetFromStockSchema',
  'InstallAssetSchema',
  'ReplaceAssetSchema',
  'RetireAssetSchema',
  'RotateAssetQrSchema',
  'CreateAssetRmaSchema',
  'AssetHistoryQuerySchema',
  'this.service.registerFromStock',
  'this.service.install',
  'this.service.replace',
  'this.service.retire',
  'this.service.rotateQr',
  'this.service.resolveQr',
  'this.service.createRma',
], 'Asset controller contract/service invariant missing');
check('Asset controller does not import Prisma/database', !controller.includes('@nexora/database') && !/\bprisma\./.test(controller), 'Asset controller must not access persistence directly.');

const service = read('backend/src/modules/assets/asset.service.ts');
includesAll('Asset service implements lifecycle continuity and transaction boundaries', service, [
  'async registerFromStock(',
  'async install(',
  'async replace(',
  'async retire(',
  'async rotateQr(',
  'async resolveQr(',
  'async createRma(',
  'withTransaction',
  "entityType: 'ASSET'",
  "entityType: 'RMA'",
  'this.inventory.registerSerializedAsset',
  'this.inventory.linkSerializedAsset',
  'this.inventory.installSerializedAsset',
  'this.repository.createInstallation',
  'this.repository.createHistory',
  'this.repository.revokeQr',
  'hashToken(rawToken)',
  'newQrToken()',
  'qrExpiry(DEFAULT_QR_TTL_DAYS)',
  "type: 'asset.installed'",
  "type: 'asset.replaced'",
  "type: 'asset.warranty.expiring'",
  'requestApprovalIfConfigured',
  "subjectType: 'AssetRetirement'",
], 'Asset service lifecycle invariant missing');
check('Asset critical state does not use BullMQ/eventual consistency as source of truth', !service.includes('BullMQ') && !service.includes("from 'bullmq'"), 'Asset stock/status/QR/replacement/retirement critical state must remain transactional, not BullMQ-sourced.');

const repo = read('backend/src/modules/assets/asset.repository.ts');
includesAll('Asset repository owns persistence, row locking, history, QR and RMA storage', repo, [
  'lockAsset',
  'FOR UPDATE',
  'createInstallation',
  'createHistory',
  'createWarranty',
  'upsertQr',
  'revokeQr',
  'resolveQr',
  'createRma',
  'revokedAt: null',
  'warranties',
  'installations',
  'rmas',
], 'Asset repository persistence invariant missing');

const policy = read('backend/src/modules/assets/asset-lifecycle-policy.ts') + '\n' + read('backend/src/modules/assets/asset-lifecycle-completion-policy.ts');
includesAll('Asset policy layer blocks unsafe lifecycle transitions and terminal mutations', policy, [
  'AssetLifecycleTransactionBoundary',
  'AssetLifecycleChecklist',
  'assertAssetRegistrationFromStock',
  'assertAssetInstallable',
  'assertAssetInstallationPlacement',
  'assertAssetReplacementLink',
  'assertAssetRetirable',
  'assertAssetQrRotatable',
  'assertAssetQrResolvable',
  'assertAssetRmaAllowed',
  'assertWarrantyWindow',
  'deriveWarrantyStatus',
  'ASSET_QR_TERMINAL_STATE',
  'ASSET_RMA_TERMINAL_STATE',
  'assertReplacementQrRevocation',
  'assertQrPersistenceDoesNotLeak',
  'assertAssetLifecycleTerminalGuard',
], 'Asset lifecycle policy invariant missing');

const invFacade = read('backend/src/modules/inventory/inventory.facade.ts');
includesAll('Inventory facade supplies serialized asset registration and install consumption', invFacade, [
  'registerSerializedAsset',
  'linkSerializedAsset',
  'installSerializedAsset',
  "'CUSTOMER_INSTALLATION'",
  "status: 'INSTALLED'",
  'currentWarehouseId: null',
  'linkTransactionSerials',
], 'Inventory-to-asset facade invariant missing');

const assetModule = read('backend/src/modules/assets/asset.module.ts');
includesAll('Asset module composes dependencies through public facades', assetModule, [
  "type { ApprovalFacade } from '../approvals/index.js'",
  "type { CustomerFacade } from '../customers/index.js'",
  "type { EmployeeFacade } from '../hr/index.js'",
  "type { InventoryFacade } from '../inventory/index.js'",
  "type { ProjectFacade } from '../projects/index.js'",
  "type { VendorGovernanceFacade } from '../vendors/index.js'",
], 'Asset module public-facade boundary missing');

const app = read('backend/src/app.ts');
includesAll('Application composition registers assets and approval subject facade', app, [
  'createAssetModule(',
  "approvalSubjects.register('AssetRetirement', assets.facade)",
  'app.register(assets.plugin',
], 'Asset app composition missing');

const sharedContracts = read('shared/src/contracts/assets/asset.contracts.ts') + '\n' + read('shared/src/contracts/assets/asset-lifecycle-completion.contracts.ts') + '\n' + read('shared/src/contracts/assets/asset-lifecycle-manifest.ts');
includesAll('Shared asset contracts cover CRUD, commands, QR response and completion matrix', sharedContracts, [
  'CreateAssetSchema',
  'RegisterAssetFromStockSchema',
  'InstallAssetSchema',
  'ReplaceAssetSchema',
  'RetireAssetSchema',
  'CreateAssetRmaSchema',
  'RotateAssetQrSchema',
  'AssetHistoryQuerySchema',
  'AssetLifecycleCompletionRows',
  'AssetLifecycleCompletionMaturity',
  'PASS_12_SOURCE_LEVEL_ASSET_LIFECYCLE_QR_COMPLETION',
  'AssetQrResolutionResponseSchema',
  'M12-ASSET-INSTALLATION-UPDATES-SERIAL-STOCK-ASSET-HISTORY-AUDIT-QR-IN-ONE-TRANSACTION',
  'M12-ASSET-TERMINAL-STATES-BLOCK-FREE-EDIT-INSTALL-REPLACE-RMA',
], 'Shared asset completion contract invariant missing');

const prisma = read('database/prisma/schema.prisma');
for (const model of ['Asset', 'AssetInstallation', 'AssetHistory', 'AssetWarranty', 'AssetQrTag', 'AssetRMA', 'SerialNumber', 'StockTransaction', 'AuditLog', 'BusinessEvent']) {
  check(`Asset lifecycle Prisma model exists: ${model}`, new RegExp(`model\\s+${model}\\s*\\{`).test(prisma), `${model} model missing from Prisma schema.`);
}
includesAll('Asset schema maintains tenant/business-number/serial/QR constraints', prisma, [
  'assetNo',
  'serialNumberId',
  'replacedByAssetId',
  '@@unique([organizationId, assetNo])',
  '@unique',
  'AssetQrTag',
  'token',
  'revokedAt',
  'AssetWarranty',
  'AssetRMA',
], 'Asset schema invariant missing');
check('Asset schema does not use Float', !/\bFloat\b/.test(prisma), 'Float must not be used for money/quantity fields.');

const assetConfig = read('frontend/src/modules/assets/asset-resource-config.ts');
includesAll('Frontend asset resource config exposes lifecycle command surfaces', assetConfig, [
  "'register-from-stock'",
  "'install-asset'",
  "'replace-asset'",
  "'retire-asset'",
  "'rotate-asset-qr'",
  "'create-asset-rma'",
  "endpointTemplate: '/assets/:id/install'",
  "endpointTemplate: '/assets/:id/replace'",
  "endpointTemplate: '/assets/:id/retire'",
  "endpointTemplate: '/assets/:id/qr/rotate'",
  "endpointTemplate: '/assets/:id/rma'",
  "permission: 'asset.view'",
  "permission: 'asset.install'",
  "permission: 'asset.manage_qr'",
  "AssetCompletionPrinciples",
], 'Asset frontend resource config invariant missing');
check('Retire asset frontend command does not claim REPLACED is an allowed mutation state', !assetConfig.includes("allowedStates: ['ACTIVE', 'REPLACED'") && !assetConfig.includes("'ACTIVE', 'REPLACED', 'UNDER_MAINTENANCE'"), 'Retire command must not list REPLACED as allowed; terminal assets are inspection-only.');

const commandPanel = read('frontend/src/modules/assets/asset-command-panel.tsx');
includesAll('Frontend asset command panel is status-aware and uses RHF command dialogs', commandPanel, [
  'CommandFormDialog',
  'AssetCommandSchemas',
  'definitionFor',
  'commandActions',
  'allowedForStatus',
  'disabled: !allowedForStatus',
  'StateTransitionPanel',
  'MakerCheckerNotice',
  'Asset lifecycle commands remain backend-authoritative',
], 'Asset frontend command panel invariant missing');

const detail = read('frontend/src/modules/assets/asset-resource-detail.tsx');
includesAll('Frontend asset detail exposes profile, lifecycle commands and traceability tabs', detail, [
  'AssetCommandPanel',
  'ActivityTimeline',
  'AuditTimeline',
  'Lifecycle commands',
  'Traceability',
  'Serialized stock traceability',
  'Authorized QR lookup',
  'Append-only asset history',
], 'Asset detail traceability invariant missing');

const forms = read('frontend/src/modules/forms/resource-form-registry.ts');
includesAll('Frontend asset forms and command registry use shared asset contracts', forms, [
  'CreateAssetSchema',
  'RegisterAssetFromStockSchema',
  'InstallAssetSchema',
  'ReplaceAssetSchema',
  'RetireAssetSchema',
  'RotateAssetQrSchema',
  'CreateAssetRmaSchema',
  "'/assets'",
  "'/assets/register-from-stock'",
  'install-asset',
  'replace-asset',
  'retire-asset',
  'rotate-asset-qr',
  'create-asset-rma',
  'idempotent: true',
], 'Asset frontend form registry invariant missing');

const result = {
  pass: 'PASS_12_ASSET_LIFECYCLE_QR_COMPLETION',
  status: blockers.length ? 'HOLD_RUNTIME_BLOCKED' : failures.length ? 'FAIL_SOURCE_LEVEL' : 'PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME',
  mode: sourceOnly ? 'source-only' : 'strict',
  checkedAt: new Date().toISOString(),
  totals: {
    checks: checks.length,
    passed: checks.filter((c) => c.passed).length,
    failures: failures.length,
    blockers: blockers.length,
  },
  blockers,
  failures,
};

writeFileSync(join(root, 'certification-output/pass-12-asset-lifecycle-qr-completion.json'), JSON.stringify(result, null, 2));
writeFileSync(join(root, 'certification-output/PASS_12_ASSET_LIFECYCLE_QR_COMPLETION_LOG.txt'), [
  `PASS 12 Asset Lifecycle QR Completion`,
  `Status: ${result.status}`,
  `Mode: ${result.mode}`,
  `Checks: ${result.totals.checks}`,
  `Passed: ${result.totals.passed}`,
  `Failures: ${result.totals.failures}`,
  `Blockers: ${result.totals.blockers}`,
  '',
  ...blockers.map((item) => `BLOCKER: ${item}`),
  ...failures.map((item) => `FAILURE: ${item}`),
].join('\n'));

if (blockers.length || failures.length) {
  console.error(`PASS 12 asset lifecycle gate ${result.status}: ${failures.length} failures, ${blockers.length} blockers.`);
  for (const item of blockers) console.error(`BLOCKER: ${item}`);
  for (const item of failures) console.error(`FAILURE: ${item}`);
  process.exit(1);
}

console.log(`PASS 12 asset lifecycle gate PASSED: ${result.totals.passed}/${result.totals.checks} checks. Status ${result.status}.`);
