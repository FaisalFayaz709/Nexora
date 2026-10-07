#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const checks = [];
const failures = [];
const blockers = [];

function hasFile(path) { return existsSync(join(root, path)); }
function read(path) { return readFileSync(join(root, path), 'utf8'); }
function json(path) { return JSON.parse(read(path)); }
function check(name, passed, message = '', options = {}) {
  checks.push({ name, passed, message, blocker: Boolean(options.blocker) });
  if (!passed) {
    const entry = `${name}${message ? ` — ${message}` : ''}`;
    if (options.blocker) blockers.push(entry); else failures.push(entry);
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
  try { const parsed = JSON.parse(raw); status = JSON.stringify(parsed.status ?? parsed.result ?? parsed); } catch {}
  check(`previous pass evidence is not failed: ${path}`, !String(status).includes('FAIL'), `${path} has failing status ${status}.`, { blocker: !sourceOnly });
}

mkdirSync(join(root, 'certification-output'), { recursive: true });

if (!sourceOnly) {
  check('root pnpm-lock.yaml exists for strict runtime certification', hasFile('pnpm-lock.yaml'), 'pnpm-lock.yaml is missing; run pnpm install from the root and commit the generated lockfile.', { blocker: true });
}

previousEvidence('certification-output/pass-12-asset-lifecycle-qr-completion.json');

runGate('architecture gate still passes', ['scripts/check-architecture.mjs']);
runGate('contracts gate still passes', ['scripts/check-contracts.mjs']);
runGate('PASS 12 asset lifecycle gate still passes source-only', ['scripts/check-pass-12-asset-lifecycle-qr-completion.mjs', '--source-only']);
runGate('field-service source gate passes', ['scripts/check-field-service.mjs']);
runGate('inventory source gate passes for spare-part ledger integration', ['scripts/check-inventory.mjs']);

for (const required of [
  'backend/src/modules/service/field-service.routes.ts',
  'backend/src/modules/service/field-service.controller.ts',
  'backend/src/modules/service/field-service.service.ts',
  'backend/src/modules/service/field-service.repository.ts',
  'backend/src/modules/service/field-service.facade.ts',
  'backend/src/modules/service/field-service.module.ts',
  'backend/src/modules/service/field-service-workflow-policy.ts',
  'backend/src/modules/service/field-service-completion-policy.ts',
  'backend/src/modules/service/field-service-offline-sync.policy.ts',
  'backend/src/modules/service/field-service-technician-flow.integration.test.ts',
  'backend/src/modules/service/field-service-offline-sync.policy.test.ts',
  'backend/src/modules/inventory/inventory.facade.ts',
  'backend/src/modules/assets/asset.facade.ts',
  'shared/src/contracts/service/field-service.contracts.ts',
  'shared/src/contracts/service/field-service-completion.contracts.ts',
  'shared/src/contracts/portal/portal-workspace-manifest.ts',
  'frontend/src/modules/service/service-resource-config.ts',
  'frontend/src/modules/service/service-command-panel.tsx',
  'frontend/src/modules/service/technician-pwa-workspace.tsx',
  'frontend/src/modules/service/api.ts',
  'frontend/src/app/(technician)/layout.tsx',
  'frontend/src/app/(technician)/technician-pwa/jobs/page.tsx',
  'frontend/src/app/(technician)/technician-pwa/offline-queue/page.tsx',
  'frontend/src/app/(technician)/technician-pwa/sync/page.tsx',
  'docs/contracts/capability-locks/field-service.json',
  'docs/contracts/api-endpoint-matrix.csv',
  'shared/src/contracts/registry/locked-endpoints.json',
]) check(`PASS 13 source file exists: ${required}`, hasFile(required), `${required} is required.`);

const lock = json('docs/contracts/capability-locks/field-service.json');
check('Field-service capability lock has 22 routes including offline sync', lock.lockedRouteCount === 22, `Expected 22 field-service routes, found ${lock.lockedRouteCount}.`);
for (const signature of [
  ['GET', '/api/v1/tickets'],
  ['POST', '/api/v1/tickets'],
  ['POST', '/api/v1/tickets/:id/assign'],
  ['POST', '/api/v1/tickets/:id/resolve'],
  ['POST', '/api/v1/tickets/:id/close'],
  ['GET', '/api/v1/work-orders'],
  ['POST', '/api/v1/work-orders'],
  ['POST', '/api/v1/work-orders/:id/assign'],
  ['POST', '/api/v1/work-orders/:id/accept'],
  ['POST', '/api/v1/work-orders/:id/start-travel'],
  ['POST', '/api/v1/work-orders/:id/arrive'],
  ['POST', '/api/v1/work-orders/:id/start'],
  ['POST', '/api/v1/work-orders/:id/check-in'],
  ['POST', '/api/v1/work-orders/:id/location'],
  ['POST', '/api/v1/work-orders/:id/check-out'],
  ['POST', '/api/v1/work-orders/:id/service-report'],
  ['POST', '/api/v1/work-orders/:id/complete'],
  ['POST', '/api/v1/portal/technician/offline-sync'],
]) {
  const [method, path] = signature;
  check(`Field-service lock includes ${method} ${path}`, lock.lockedRoutes.some((r) => r.method === method && r.path === path), `${method} ${path} missing from field-service capability lock.`);
}

const routes = read('backend/src/modules/service/field-service.routes.ts');
includesAll('Field-service routes expose ticket, work-order, visit and offline-sync locked Fastify commands', routes, [
  "defineLockedRoute('GET','/api/v1/tickets')",
  "defineLockedRoute('POST','/api/v1/tickets')",
  "defineLockedRoute('POST','/api/v1/work-orders/:id/assign')",
  "defineLockedRoute('POST','/api/v1/work-orders/:id/accept')",
  "defineLockedRoute('POST','/api/v1/work-orders/:id/start-travel')",
  "defineLockedRoute('POST','/api/v1/work-orders/:id/arrive')",
  "defineLockedRoute('POST','/api/v1/work-orders/:id/start')",
  "defineLockedRoute('POST','/api/v1/work-orders/:id/check-in')",
  "defineLockedRoute('POST','/api/v1/work-orders/:id/location')",
  "defineLockedRoute('POST','/api/v1/work-orders/:id/check-out')",
  "defineLockedRoute('POST','/api/v1/work-orders/:id/service-report')",
  "defineLockedRoute('POST','/api/v1/work-orders/:id/complete')",
  "defineLockedRoute('POST','/api/v1/portal/technician/offline-sync')",
  "guard('ticket.view')",
  "guard('ticket.create')",
  "guard('workorder.assign')",
  "guard('workorder.close')",
  'const technicianOnly=',
  'handler:controller.syncTechnicianOffline',
], 'Field-service route/guard invariant missing');
check('Field-service routes do not invent technician.location.manage permission on technician-only mutations', !routes.includes("'technician.location.manage'"), 'Technician visit/offline commands are authenticated technician scope, not an invented global permission.');

const controller = read('backend/src/modules/service/field-service.controller.ts');
includesAll('Field-service controller parses shared contracts and delegates to service only', controller, [
  'CreateTicketRequestSchema',
  'AssignTicketSchema',
  'ResolveTicketSchema',
  'CloseTicketSchema',
  'CreateWorkOrderSchema',
  'AssignWorkOrderSchema',
  'TechnicianCheckInSchema',
  'TechnicianLocationSchema',
  'TechnicianCheckOutSchema',
  'CreateServiceReportSchema',
  'CompleteWorkOrderRequestSchema',
  'TechnicianOfflineSyncBatchSchema',
  'this.service.syncTechnicianOffline',
], 'Controller contract/service invariant missing');
check('Field-service controller has no direct persistence access', !controller.includes('@nexora/database') && !/\bprisma\./.test(controller), 'Controller must not access Prisma/database directly.');

const service = read('backend/src/modules/service/field-service.service.ts');
includesAll('Field-service service implements online work-order lifecycle and atomic completion', service, [
  'async createTicket(',
  'async assignTicket(',
  'async createWorkOrder(',
  'async assignWorkOrder(',
  'async acceptWorkOrder(',
  'async technicianCommand(',
  'async checkIn(',
  'async recordLocation(',
  'async checkOut(',
  'async createServiceReport(',
  'async completeWorkOrder(',
  'withTransaction',
  "entityType:'TICKET'",
  "entityType:'WORK_ORDER'",
  "type:'ticket.created'",
  "type:'work_order.assigned'",
  "type:'work_order.completed'",
  'this.inventory.consumeServicePart',
  'this.assets.recordFieldServiceCompletion',
  'assertWorkOrderCompletionAllowed',
  'assertFieldServiceReportCompletionEvidence',
  'purgeExpiredLocationData',
], 'Online lifecycle invariant missing');
includesAll('Field-service service implements offline sync idempotency, scope, freshness, ordered replay and conflict handling', service, [
  'async syncTechnicianOffline(',
  'sortedOfflineCommands(input.commands)',
  'applyOfflineCommandWithIdempotency',
  'offlineCommandIdempotencyKey',
  'stableRequestHash',
  'findOfflineIdempotency',
  'storeOfflineIdempotencyResponse',
  'OFFLINE_SYNC_REPLAY_PAYLOAD_CONFLICT',
  'assertOfflineCommandFresh',
  'assertOfflineTechnicianScope',
  'applyOfflineAccept',
  'applyOfflineStatusCommand',
  'applyOfflineCheckIn',
  'applyOfflineLocation',
  'applyOfflineCheckOut',
  'applyOfflineServiceReport',
  'applyOfflineComplete',
  'applyOfflineEvidenceAudit',
], 'Offline-sync invariant missing');
check('Field-service critical state does not import or instantiate BullMQ', !service.includes('BullMQ') && !service.includes("from 'bullmq'") && !service.includes('new Queue('), 'Critical field-service state must not be mutated through queues.');

const repository = read('backend/src/modules/service/field-service.repository.ts');
includesAll('Field-service repository owns persistence for visits, service reports, parts, idempotency and row locking', repository, [
  'lockTicket',
  'lockWorkOrder',
  'activeAssignmentTx',
  'createServiceReport',
  'serviceReportParts',
  'linkPartTransaction',
  'createVisit',
  'createVisitLocation',
  'createLocationPing',
  'createCheckIn',
  'createCheckOut',
  'findOfflineIdempotency',
  'createOfflineIdempotency',
  'storeOfflineIdempotencyResponse',
], 'Repository persistence invariant missing');

const completionPolicy = read('backend/src/modules/service/field-service-completion-policy.ts');
includesAll('Field-service completion policy locks technician scope, evidence and no-async controls', completionPolicy, [
  'FieldServiceCompletionControls',
  'FieldServiceCriticalCommands',
  'FieldServiceCriticalTables',
  'assertAssignedTechnicianCommandScope',
  'assertFieldServiceReportCompletionEvidence',
  'assertTechnicianStockSourceScope',
  'assertSlaSnapshotCompleteness',
  'assertNoAsyncFieldServiceCriticalMutation',
], 'Completion policy invariant missing');

const offlinePolicy = read('backend/src/modules/service/field-service-offline-sync.policy.ts');
includesAll('Offline sync policy validates type, command identity, technician scope, freshness and ordering', offlinePolicy, [
  'OfflineTechnicianCommandType',
  'offlineCommandType',
  'offlineCommandIdempotencyKey',
  'assertOfflineTechnicianScope',
  'assertOfflineCommandFresh',
  'assertOfflineBatchOrdering',
  'sortedOfflineCommands',
  'OFFLINE_SYNC_DUPLICATE_CLIENT_COMMAND',
  'OFFLINE_SYNC_COMMAND_STALE',
], 'Offline policy invariant missing');

const inventoryFacade = read('backend/src/modules/inventory/inventory.facade.ts');
includesAll('Inventory facade exposes service-part validation and stock ledger consumption', inventoryFacade, [
  'validateServicePartSource',
  'consumeServicePart',
  "'TECHNICIAN_ISSUE'",
  'lockBatchForService',
  'linkTransactionBatches',
  'SERVICE_SERIAL_PART_REQUIRES_ASSET_WORKFLOW',
], 'Inventory integration invariant missing');

const assetFacade = read('backend/src/modules/assets/asset.facade.ts');
includesAll('Asset facade exposes field-service completion history hook', assetFacade, [
  'recordFieldServiceCompletion',
  'serviceReportId',
  'workOrderId',
  'parts',
], 'Asset field-service facade invariant missing');

const serviceConfig = read('frontend/src/modules/service/service-resource-config.ts');
includesAll('Service frontend config exposes full status-aware ticket/work-order command surface', serviceConfig, [
  'assign-ticket',
  'resolve-ticket',
  'close-ticket',
  'assign-work-order',
  'accept-work-order',
  'start-work-order-travel',
  'arrive-work-order',
  'start-work-order',
  'check-in-work-order',
  'location-work-order',
  'create-service-report',
  'check-out-work-order',
  'complete-work-order',
  '/work-orders/:id/location',
  'Offline technician commands are replayed through /api/v1/portal/technician/offline-sync',
], 'Frontend service config invariant missing');

const commandPanel = read('frontend/src/modules/service/service-command-panel.tsx');
includesAll('Service command panel uses RHF/Zod fields for service report parts and visit commands', commandPanel, [
  'TechnicianLocationSchema',
  'const servicePartFields: ResourceFormField[]',
  "name: 'parts', label: 'Parts used', type: 'array'",
  'arrayFields: servicePartFields',
  "name: 'batches', label: 'Batch allocations', type: 'json'",
  "case 'location-work-order'",
  "name: 'accuracyMeters'",
  'PASS 13 transaction and offline rules',
], 'Frontend service command panel invariant missing');
check('Service report parts are no longer hidden placeholder fields', !commandPanel.includes("name: 'parts', label: 'Parts used', type: 'hidden'"), 'Parts must be a controlled field array, not hidden placeholder.');

const pwa = read('frontend/src/modules/service/technician-pwa-workspace.tsx');
includesAll('Technician PWA workspace exposes controlled offline sync queue form', pwa, [
  'offlineCommandFields: ResourceFormField[]',
  "endpoint: '/portal/technician/offline-sync'",
  "name: 'commands', label: 'Offline command queue', type: 'array'",
  'clientCommandId',
  'workOrderId',
  'technicianEmployeeId',
  'occurredAt',
  'Payload JSON',
  "value: 'SERVICE_REPORT'",
  "value: 'CHECK_OUT'",
  "value: 'COMPLETE'",
  'Backend rejects wrong tenant, wrong technician, stale commands and conflicting payload replays.',
], 'Technician PWA/offline-sync frontend invariant missing');
check('Technician offline commands are no longer hidden placeholder fields', !pwa.includes("name: 'commands', label: 'Offline commands', type: 'hidden'"), 'Offline commands must be a controlled field array.');

const api = read('frontend/src/modules/service/api.ts');
includesAll('Service frontend API exposes all locked Fastify field-service endpoints including offline sync', api, [
  "tickets: '/tickets'",
  "workOrders: '/work-orders'",
  'assignWorkOrder',
  'acceptWorkOrder',
  'startWorkOrderTravel',
  'arriveWorkOrder',
  'startWorkOrder',
  'createServiceReport',
  'checkInWorkOrder',
  'locationWorkOrder',
  'checkOutWorkOrder',
  "technicianOfflineSync: '/portal/technician/offline-sync'",
  'syncTechnicianOffline',
], 'Frontend API invariant missing');

const shared = read('shared/src/contracts/service/field-service-completion.contracts.ts') + '\n' + read('shared/src/contracts/portal/portal-workspace-manifest.ts') + '\n' + read('shared/src/contracts/portal/portal-offline-completion.contracts.ts');
includesAll('Shared contracts document Pass 13 field-service and offline-sync scope', shared, [
  'Pass13FieldServiceCompletionMarker',
  'PASS_13_FIELD_SERVICE_OFFLINE_SYNC_COMPLETION_SOURCE_CERTIFIED',
  'TechnicianOfflineSyncBatchSchema',
  'TechnicianOfflineCommandSchema',
  'commands: z.array(TechnicianOfflineCommandSchema).min(1).max(200)',
  'OFFLINE_SYNC_CLIENT_COMMAND_IDEMPOTENCY',
  'OFFLINE_SYNC_ORDERING_AND_CONFLICT_POLICY',
], 'Shared contract invariant missing');

const status = failures.length || blockers.length
  ? (blockers.length ? 'HOLD_AUDIT_FOUND_BLOCKERS' : 'FAIL_SOURCE_LEVEL')
  : 'PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME';

const result = {
  pass: 13,
  name: 'Field Service, Ticketing, Work Orders, Technician PWA and Offline Sync Completion',
  status,
  sourceOnly,
  checkedAt: new Date().toISOString(),
  summary: {
    checks: checks.length,
    passed: checks.filter((c) => c.passed).length,
    failed: failures.length,
    blockers: blockers.length,
  },
  failures,
  blockers,
  runtimeCertification: 'PENDING_LOCAL_LOCKFILE_AND_ENVIRONMENT',
  lockedArchitecture: {
    frontend: 'Next.js + TypeScript + Tailwind/shadcn + React Hook Form + Zod + TanStack Query/Table',
    backend: 'Fastify + TypeScript modular monolith',
    persistence: 'PostgreSQL + Prisma',
    async: 'Redis + BullMQ only for post-commit side effects',
    storage: 'MinIO through StorageService/document ids for evidence',
  },
  checks,
};

writeFileSync(join(root, 'certification-output/pass-13-field-service-offline-sync-completion.json'), JSON.stringify(result, null, 2) + '\n');
writeFileSync(join(root, 'certification-output/PASS_13_FIELD_SERVICE_OFFLINE_SYNC_COMPLETION_LOG.txt'), [
  `PASS 13 field-service/offline-sync completion result: ${status}`,
  `Checks: ${result.summary.passed}/${result.summary.checks}`,
  failures.length ? `Failures:\n- ${failures.join('\n- ')}` : 'Failures: none',
  blockers.length ? `Blockers:\n- ${blockers.join('\n- ')}` : 'Blockers: none',
  'Runtime note: full GO still requires root pnpm-lock.yaml plus local install/typecheck/test/migrate/seed proof.',
].join('\n\n'));

if (failures.length || blockers.length) {
  console.error(`PASS 13 field-service/offline-sync gate ${status}`);
  for (const f of failures) console.error(`- ${f}`);
  for (const b of blockers) console.error(`- ${b}`);
  process.exit(1);
}
console.log(`PASS 13 field-service/offline-sync gate PASSED: ${result.summary.passed}/${result.summary.checks} checks. Status ${status}.`);
