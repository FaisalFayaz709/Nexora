import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const warnings = [];
const sourceOnly = process.argv.includes('--source-only');
const startedAt = new Date().toISOString();
function path(p) { return join(root, p); }
function read(p) { return readFileSync(path(p), 'utf8'); }
function fail(message) { failures.push(message); }
function warn(message) { warnings.push(message); }
function requireFile(p) { if (!existsSync(path(p))) fail(`Missing required R5 file: ${p}`); }
function requireText(p, marker, description = marker) {
  if (!existsSync(path(p))) { fail(`Cannot inspect missing file ${p} for ${description}`); return; }
  if (!read(p).includes(marker)) fail(`${p} missing ${description}`);
}

const requiredFiles = [
  'backend/src/modules/service/field-service.routes.ts',
  'backend/src/modules/service/field-service.controller.ts',
  'backend/src/modules/service/field-service.service.ts',
  'backend/src/modules/service/field-service.repository.ts',
  'backend/src/modules/service/field-service-offline-sync.policy.ts',
  'backend/src/modules/service/field-service-offline-sync.policy.test.ts',
  'shared/src/contracts/portal/portal-workspace-manifest.ts',
  'shared/src/contracts/registry/locked-endpoints.json',
  'shared/src/contracts/registry/locked-endpoints.ts',
  'shared/src/contracts/registry/contract-maturity.json',
  'docs/contracts/api-endpoint-matrix.csv',
  'docs/contracts/contract-lock.json',
  'docs/contracts/capability-locks/route-coverage.json',
];
requiredFiles.forEach(requireFile);

requireText('backend/src/modules/service/field-service.routes.ts', "technicianOfflineSync:defineLockedRoute('POST','/api/v1/portal/technician/offline-sync')", 'locked Fastify offline-sync route definition');
requireText('backend/src/modules/service/field-service.routes.ts', 'handler:controller.syncTechnicianOffline', 'offline-sync controller handler registration');
requireText('backend/src/modules/service/field-service.routes.ts', 'preHandler:technicianOnly', 'authenticated technician portal preHandler');
requireText('backend/src/modules/service/field-service.controller.ts', 'TechnicianOfflineSyncBatchSchema.parse(request.body)', 'shared Zod batch validation');
requireText('backend/src/modules/service/field-service.controller.ts', 'this.service.syncTechnicianOffline', 'controller delegates to service layer');
requireText('backend/src/modules/service/field-service.service.ts', 'async syncTechnicianOffline', 'service-level offline sync entrypoint');
requireText('backend/src/modules/service/field-service.service.ts', 'stableRequestHash', 'payload-hash based replay detection');
requireText('backend/src/modules/service/field-service.service.ts', 'offlineCommandIdempotencyKey', 'device/clientCommand idempotency key');
requireText('backend/src/modules/service/field-service.service.ts', 'OFFLINE_SYNC_REPLAY_PAYLOAD_CONFLICT', 'conflicting replay rejection');
requireText('backend/src/modules/service/field-service.service.ts', 'assertOfflineCommandFresh', 'stale command rejection');
requireText('backend/src/modules/service/field-service.service.ts', 'assertOfflineTechnicianScope', 'authenticated/assigned technician scope enforcement');
requireText('backend/src/modules/service/field-service.service.ts', 'withTransaction(async tx=>', 'PostgreSQL transaction boundary for offline command application');
requireText('backend/src/modules/service/field-service.service.ts', 'WORK_ORDER_OFFLINE_COMPLETED', 'offline work-order completion audit action');
requireText('backend/src/modules/service/field-service.service.ts', 'this.inventory.consumeServicePart(tx', 'parts consumption remains synchronous and transactional');
requireText('backend/src/modules/service/field-service.service.ts', 'this.assets.recordFieldServiceCompletion(tx', 'asset history update remains inside transaction');
requireText('backend/src/modules/service/field-service.repository.ts', 'findOfflineIdempotency', 'repository-owned idempotency lookup');
requireText('backend/src/modules/service/field-service.repository.ts', 'createOfflineIdempotency', 'repository-owned idempotency reservation');
requireText('backend/src/modules/service/field-service.repository.ts', 'storeOfflineIdempotencyResponse', 'repository-owned idempotency response storage');
requireText('backend/src/modules/service/field-service.repository.ts', 'tx.idempotencyKey.findUnique', 'idempotency table lookup through repository');
requireText('backend/src/modules/service/field-service-offline-sync.policy.ts', 'sortedOfflineCommands', 'ordered offline command replay policy');
requireText('backend/src/modules/service/field-service-offline-sync.policy.ts', 'assertOfflineBatchOrdering', 'duplicate clientCommandId guard');
requireText('shared/src/contracts/portal/portal-workspace-manifest.ts', 'TechnicianOfflineSyncBatchSchema', 'shared offline sync request contract');
requireText('shared/src/contracts/portal/portal-workspace-manifest.ts', 'clientBatchId', 'clientBatchId contract field');
requireText('shared/src/contracts/portal/portal-workspace-manifest.ts', 'TechnicianOfflineSyncResponseSchema', 'shared offline sync response contract');
requireText('shared/src/contracts/registry/locked-endpoints.json', '/api/v1/portal/technician/offline-sync', 'Appendix G.11 locked endpoint registry entry');
requireText('docs/contracts/api-endpoint-matrix.csv', '/api/v1/portal/technician/offline-sync', 'Appendix G.11 endpoint matrix row');
requireText('frontend/src/modules/portals/api.ts', 'syncTechnicianOffline', 'frontend API wrapper retained for route');
requireText('frontend/src/modules/portals/portal-offline-completion-workbench.tsx', 'clientBatchId', 'frontend workbench sends batch identity');

const routeText = read('backend/src/modules/service/field-service.routes.ts');
if (/\/api\/frontend\/.*offline-sync/.test(routeText)) fail('Offline sync was incorrectly implemented as a Next.js/frontend API route.');
const serviceText = read('backend/src/modules/service/field-service.service.ts');
for (const forbidden of ['from \'bullmq\'', 'from "bullmq"', 'new Queue(', 'QueueProducer']) {
  if (serviceText.includes(forbidden)) fail(`Offline sync service imports/uses queue for critical mutation: ${forbidden}`);
}
const controllerText = read('backend/src/modules/service/field-service.controller.ts');
if (/@nexora\/database|\bprisma\./.test(controllerText)) fail('Controller violates boundary by importing or calling database/Prisma.');
if (/@nexora\/database|\bprisma\./.test(routeText)) fail('Route violates boundary by importing or calling database/Prisma.');

const endpoints = JSON.parse(read('shared/src/contracts/registry/locked-endpoints.json'));
const offline = endpoints.filter((entry) => entry.method === 'POST' && entry.endpoint === '/api/v1/portal/technician/offline-sync');
if (offline.length !== 1) fail(`Expected exactly one locked offline-sync endpoint; found ${offline.length}.`);
const maturity = JSON.parse(read('shared/src/contracts/registry/contract-maturity.json'));
if (!maturity.some((entry) => entry.method === 'POST' && entry.endpoint === '/api/v1/portal/technician/offline-sync')) fail('Contract maturity registry lacks offline-sync endpoint.');
const lock = JSON.parse(read('docs/contracts/contract-lock.json'));
if (lock.endpointCatalogCount !== endpoints.length) fail(`Contract lock endpointCatalogCount ${lock.endpointCatalogCount} != registry count ${endpoints.length}.`);

if (!sourceOnly) {
  const contracts = spawnSync(process.execPath, ['scripts/check-contracts.mjs'], { cwd: root, stdio: 'inherit' });
  if (contracts.status !== 0) fail('check-contracts.mjs failed after R5 endpoint catalog update.');
  const routeCoverage = spawnSync(process.execPath, ['scripts/check-route-coverage.mjs'], { cwd: root, stdio: 'inherit' });
  if (routeCoverage.status !== 0) fail('check-route-coverage.mjs failed after R5 route registration.');
} else {
  warn('Source-only mode: package install, TypeScript, database migrations and runtime Fastify injection tests were not executed.');
}
if (!existsSync(path('pnpm-lock.yaml'))) warn('pnpm-lock.yaml remains absent until registry-backed pnpm install is run on a connected machine.');

mkdirSync(path('certification-output'), { recursive: true });
const payload = {
  gate: 'pass-r5-backend-offline-sync-route',
  pass: 'R5',
  title: 'Technician PWA offline-sync Fastify backend route source gate',
  startedAt,
  completedAt: new Date().toISOString(),
  sourceOnly,
  lockedStackPreserved: true,
  endpoint: 'POST /api/v1/portal/technician/offline-sync',
  scope: 'Adds the Appendix G.11 Fastify /api/v1 technician offline-sync route with shared Zod validation, technician/assignment scope, idempotency, replay conflict handling, synchronous transaction boundaries, audit logging and no Next.js business API split.',
  endpointCatalogCount: endpoints.length,
  warnings,
  failures,
};
writeFileSync(path('certification-output/pass-r5-backend-offline-sync-route.json'), `${JSON.stringify(payload, null, 2)}\n`);

if (failures.length) {
  console.error('Pass R5 backend offline-sync route gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Pass R5 backend offline-sync route gate PASSED: Appendix G.11 route is present in Fastify backend and locked catalog.');
for (const warning of warnings) console.warn(`WARN: ${warning}`);
