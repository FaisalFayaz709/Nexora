#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const checks = [];
const failures = [];
const blockers = [];

function pathOf(path) { return join(root, path); }
function hasFile(path) { return existsSync(pathOf(path)); }
function read(path) { return readFileSync(pathOf(path), 'utf8'); }
function json(path) { return JSON.parse(read(path)); }
function check(name, passed, message = '', options = {}) {
  const entry = { name, passed, message, blocker: Boolean(options.blocker) };
  checks.push(entry);
  if (!passed) {
    const line = `${name}${message ? ` — ${message}` : ''}`;
    if (options.blocker) blockers.push(line); else failures.push(line);
  }
}
function includesAll(name, content, required, message = '') {
  const missing = required.filter((needle) => !content.includes(needle));
  check(name, missing.length === 0, missing.length ? `${message || 'Missing invariant(s)'}: ${missing.join(', ')}` : '');
}
function excludesAll(name, content, forbidden, message = '') {
  const found = forbidden.filter((needle) => content.includes(needle));
  check(name, found.length === 0, found.length ? `${message || 'Forbidden invariant(s) found'}: ${found.join(', ')}` : '');
}
function runGate(name, args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 120000 });
  const passed = result.status === 0;
  check(name, passed, passed ? '' : `${args.join(' ')} failed with status ${result.status}. ${(result.stderr || result.stdout || '').slice(0, 1600)}`);
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

mkdirSync(pathOf('certification-output'), { recursive: true });

if (!sourceOnly) {
  check('root pnpm-lock.yaml exists for strict runtime certification', hasFile('pnpm-lock.yaml'), 'pnpm-lock.yaml is missing; run pnpm install from root and commit the lockfile before claiming runtime GO.', { blocker: true });
}

previousEvidence('certification-output/pass-13-field-service-offline-sync-completion.json');

runGate('architecture gate still passes', ['scripts/check-architecture.mjs']);
runGate('contracts gate still passes', ['scripts/check-contracts.mjs']);
runGate('PASS 13 field-service/offline-sync gate still passes source-only', ['scripts/check-pass-13-field-service-offline-sync-completion.mjs', '--source-only']);
runGate('maintenance source gate passes', ['scripts/check-maintenance.mjs']);

for (const required of [
  'backend/src/modules/maintenance/maintenance.routes.ts',
  'backend/src/modules/maintenance/maintenance.controller.ts',
  'backend/src/modules/maintenance/maintenance.service.ts',
  'backend/src/modules/maintenance/maintenance.repository.ts',
  'backend/src/modules/maintenance/maintenance.facade.ts',
  'backend/src/modules/maintenance/maintenance.module.ts',
  'backend/src/modules/maintenance/maintenance-workflow-policy.ts',
  'backend/src/modules/maintenance/maintenance-completion-policy.ts',
  'backend/src/modules/maintenance/maintenance.service.test.ts',
  'backend/src/modules/maintenance/maintenance-completion-policy.test.ts',
  'backend/src/modules/maintenance/maintenance-preventive-workflow.integration.test.ts',
  'worker/src/processors/maintenance-scan-policy.ts',
  'worker/src/schedulers/scheduler-registry.ts',
  'shared/src/contracts/maintenance/maintenance.contracts.ts',
  'shared/src/contracts/maintenance/maintenance-completion.contracts.ts',
  'shared/src/contracts/maintenance/maintenance-workflow-manifest.ts',
  'docs/contracts/capability-locks/maintenance.json',
  'frontend/src/modules/maintenance/maintenance-resource-config.ts',
  'frontend/src/modules/maintenance/maintenance-command-panel.tsx',
  'frontend/src/modules/maintenance/maintenance-resource-list.tsx',
  'frontend/src/modules/maintenance/maintenance-resource-detail.tsx',
  'frontend/src/modules/maintenance/maintenance-resource-form-page.tsx',
  'frontend/src/modules/maintenance/maintenance-scoped-command-page.tsx',
  'frontend/src/modules/maintenance/maintenance-completion-workbench.tsx',
  'frontend/src/modules/maintenance/api.ts',
  'frontend/src/app/(erp)/maintenance/page.tsx',
  'frontend/src/app/(erp)/maintenance/create/page.tsx',
  'frontend/src/app/(erp)/maintenance/schedule/page.tsx',
  'frontend/src/app/(erp)/maintenance/schedule/[id]/generate-work-order/page.tsx',
  'frontend/src/app/(erp)/maintenance/executions/[id]/complete/page.tsx',
]) check(`PASS 14 source file exists: ${required}`, hasFile(required), `${required} is required.`);

const lock = json('docs/contracts/capability-locks/maintenance.json');
check('Maintenance capability lock keeps 5 blueprint Fastify routes', lock.lockedRouteCount === 5, `Expected 5 locked maintenance routes, found ${lock.lockedRouteCount}.`);
for (const signature of [
  ['GET', '/api/v1/maintenance/plans'],
  ['POST', '/api/v1/maintenance/plans'],
  ['GET', '/api/v1/maintenance/schedule'],
  ['POST', '/api/v1/maintenance/schedules/:id/generate-work-order'],
  ['POST', '/api/v1/maintenance/executions/:id/complete'],
]) {
  const [method, path] = signature;
  check(`Maintenance lock includes ${method} ${path}`, lock.lockedRoutes.some((r) => r.method === method && r.path === path), `${method} ${path} missing from maintenance capability lock.`);
}
check('Maintenance capability lock includes warranty/RMA handoff event', (lock.canonicalEvents ?? []).includes('maintenance.warranty_rma.review_required'), 'maintenance.warranty_rma.review_required event must be tracked.');
check('Maintenance capability lock marks Pass 14 frontend controlled parts completion', lock.frontendCompletion === 'PASS_14_CONTROLLED_RHF_PARTS_FIELD_ARRAY', 'frontendCompletion marker not updated.');

const routes = read('backend/src/modules/maintenance/maintenance.routes.ts');
includesAll('Maintenance routes expose only locked Fastify maintenance commands with permissions', routes, [
  "defineLockedRoute('GET', '/api/v1/maintenance/plans')",
  "defineLockedRoute('POST', '/api/v1/maintenance/plans')",
  "defineLockedRoute('GET', '/api/v1/maintenance/schedule')",
  "defineLockedRoute('POST', '/api/v1/maintenance/schedules/:id/generate-work-order')",
  "defineLockedRoute('POST', '/api/v1/maintenance/executions/:id/complete')",
  "guard('maintenance.view')",
  "guard('maintenance.create')",
  "guard('maintenance.execute')",
  "access.assertModuleEnabled(request.tenant!.organizationId, 'maintenance')",
], 'Route/permission invariant missing');
excludesAll('Maintenance routes do not access Prisma directly', routes, ['@nexora/database', 'prisma.'], 'Routes must not access persistence directly');

const controller = read('backend/src/modules/maintenance/maintenance.controller.ts');
includesAll('Maintenance controller parses shared contracts and delegates to service only', controller, [
  'CreateMaintenancePlanSchema',
  'MaintenanceScheduleQuerySchema',
  'IdempotencyKeySchema',
  'CompleteMaintenanceExecutionSchema',
  'this.service.createPlan',
  'this.service.schedule',
  'this.service.generateWorkOrder',
  'this.service.completeExecution',
], 'Controller contract/service invariant missing');
excludesAll('Maintenance controller has no direct persistence access', controller, ['@nexora/database', 'prisma.'], 'Controller must not access persistence directly');

const service = read('backend/src/modules/maintenance/maintenance.service.ts');
includesAll('Maintenance service implements preventive plan and schedule-to-work-order lifecycle', service, [
  'async createPlan(',
  'assertAssetMaintenanceAllowed',
  'assertRecurringPlanPolicy',
  'createChecklist',
  'createPlan',
  "type: 'maintenance.due'",
  'async generateWorkOrder(',
  'IDEMPOTENCY_KEY_REQUIRED',
  'findIdempotency',
  'claimIdempotency',
  'lockSchedule',
  'assertScheduleCanGenerateWorkOrder',
  'assertOneGeneratedWorkOrderPerSchedule',
  'this.fieldService.createMaintenanceWorkOrder',
  'this.assets.markUnderMaintenance',
  'MAINTENANCE_WORK_ORDER_GENERATED',
], 'Preventive plan/work-order invariant missing');
includesAll('Maintenance service implements execution completion, next schedule, stock ledger, asset history and warranty/RMA review transaction', service, [
  'async completeExecution(',
  'withTransaction',
  'this.repository.lockExecution',
  'this.fieldService.assertWorkOrder',
  'assertExecutionCompletionAllowed',
  'nextDueAtFromCycle',
  'assertNextSchedulePolicy',
  'assertMaintenancePartConsumptionPolicy',
  'this.inventory.validateServicePartSource',
  'this.inventory.consumeMaintenancePart',
  'this.repository.createPart',
  'this.repository.completeExecution',
  'this.repository.completeSchedule',
  'this.repository.createNextSchedule',
  'this.assets.recordMaintenanceCompletion',
  'createMaintenanceWarrantyRmaReviewDecision',
  "type: 'maintenance.warranty_rma.review_required'",
  "action: 'MAINTENANCE_EXECUTION_COMPLETED'",
], 'Execution completion invariant missing');
excludesAll('Maintenance critical service code does not import BullMQ or mutate through queues', service, ['from \'bullmq\'', 'Queue<', 'new Queue', 'Worker<'], 'Critical maintenance mutations cannot be owned by queues');

const repository = read('backend/src/modules/maintenance/maintenance.repository.ts');
includesAll('Maintenance repository owns tenant/branch persistence, row locking, idempotency and write helpers', repository, [
  'listPlans',
  'listSchedules',
  'getScheduleForGeneration',
  'lockSchedule',
  'FOR UPDATE OF s, p',
  'createExecution',
  'setScheduleGenerated',
  'lockExecution',
  'FOR UPDATE OF e, s, p',
  'completeExecution',
  'completeSchedule',
  'createNextSchedule',
  'createPart',
  'findIdempotency',
  'claimIdempotency',
  'completeIdempotency',
  'organizationId',
  'branchId',
], 'Repository persistence invariant missing');

const policy = read('backend/src/modules/maintenance/maintenance-workflow-policy.ts');
includesAll('Maintenance workflow policy locks terminal assets, recurrence, generation, completion and no-async critical mutation rules', policy, [
  'assertAssetMaintenanceAllowed',
  'assertRecurringPlanPolicy',
  'assertScheduleCanGenerateWorkOrder',
  'assertOneGeneratedWorkOrderPerSchedule',
  'assertExecutionCompletionAllowed',
  'assertMaintenancePartConsumptionPolicy',
  'assertNextSchedulePolicy',
  'assertNoAsyncMaintenanceCriticalMutation',
  'MAINTENANCE_WORK_ORDER_NOT_CLOSED',
  'MAINTENANCE_ASSET_TERMINAL',
], 'Workflow policy invariant missing');

const completionPolicy = read('backend/src/modules/maintenance/maintenance-completion-policy.ts');
includesAll('Maintenance completion policy locks warranty/RMA handoff, cost rollup and runtime scenarios', completionPolicy, [
  'MaintenanceCompletionSubjects',
  'MaintenanceCompletionRoutes',
  'MaintenanceCompletionInvariants',
  'createMaintenanceWarrantyRmaReviewDecision',
  'assertMaintenanceWarrantyRmaHandoff',
  'FAILED_MAINTENANCE_RESULT',
  'ASSET_REPLACED_DURING_MAINTENANCE',
  'assertMaintenanceCostRollupPolicy',
  'LEDGER_DERIVED',
  'M14_MAINTENANCE_COST_MANUAL_OVERRIDE_FORBIDDEN',
], 'Completion policy invariant missing');

const worker = read('worker/src/processors/maintenance-scan-policy.ts');
includesAll('Maintenance scan worker remains discover-only', worker, [
  'runMaintenanceScanDiscoverOnly',
  'assertMaintenanceScanProcessorScope',
  'discover-only',
]);
excludesAll('Maintenance scan worker does not mutate critical state directly', worker, ['stockTransaction.create', 'workOrder.update', 'maintenanceExecution.update', 'asset.update'], 'maintenance.scan must discover due work only');

const contracts = read('shared/src/contracts/maintenance/maintenance.contracts.ts') + '\n' + read('shared/src/contracts/maintenance/maintenance-completion.contracts.ts');
includesAll('Shared maintenance contracts expose Pass 14 maturity, statuses, payloads and runtime scenarios', contracts, [
  'PASS_14_SOURCE_LEVEL_MAINTENANCE_WARRANTY_RMA_COMPLETION',
  'MaintenanceFrequencyTypeSchema',
  'MaintenanceScheduleStatusSchema',
  'MaintenanceExecutionStatusSchema',
  'MaintenanceResultSchema',
  'CreateMaintenancePlanSchema',
  'GenerateMaintenanceWorkOrderSchema',
  'MaintenancePartInputSchema',
  'CompleteMaintenanceExecutionSchema',
  'MaintenanceWarrantyRmaReviewSchema',
  'MaintenanceCostByAssetRowSchema',
  'M14-MAINTENANCE-COMPLETION-RHF-PARTS-FIELD-ARRAY',
], 'Maintenance contract invariant missing');

const commandPanel = read('frontend/src/modules/maintenance/maintenance-command-panel.tsx');
includesAll('Maintenance command panel uses CommandFormDialog, shared schemas and controlled RHF parts field array', commandPanel, [
  'CommandFormDialog',
  'GenerateMaintenanceWorkOrderSchema',
  'CompleteMaintenanceExecutionSchema',
  "name: 'parts'",
  "type: 'array'",
  'arrayFields',
  "name: 'productId'",
  "name: 'qty'",
  "name: 'sourceWarehouseId'",
  "name: 'sourceLocationId'",
  "name: 'batches'",
  'Batch allocations JSON',
  'warranty/RMA',
  'next due',
], 'Maintenance command panel invariant missing');
check('Maintenance command panel no longer hides parts as placeholder field', !/name:\s*['"]parts['"][^\n]*type:\s*['"]hidden['"]/.test(commandPanel), 'Maintenance parts must be a controlled field array, not hidden placeholder.');

const registry = read('frontend/src/modules/forms/resource-form-registry.ts');
includesAll('Central form registry exposes maintenance execution parts as controlled array fields', registry, [
  'completeMaintenanceExecution',
  'CompleteMaintenanceExecutionSchema',
  "name: 'parts'",
  "type: 'array'",
  'Controlled maintenance spare-part rows',
  'warranty/RMA review evidence',
], 'Central registry maintenance command invariant missing');
check('Central registry no longer hides maintenance execution parts placeholder', !/completeMaintenanceExecution[\s\S]*?name:\s*['"]parts['"][^\n]*type:\s*['"]hidden['"]/.test(registry), 'completeMaintenanceExecution parts must be a controlled array, not hidden placeholder.');

const frontendConfig = read('frontend/src/modules/maintenance/maintenance-resource-config.ts');
includesAll('Maintenance frontend resource config documents plan/schedule screens and RMA handoff controls', frontendConfig, [
  'MaintenanceResourceConfigs',
  'MaintenanceCommandConfigs',
  'generate-maintenance-work-order',
  'complete-maintenance-execution',
  '/maintenance/schedules/:id/generate-work-order',
  '/maintenance/executions/:id/complete',
  'Failed/replaced results create warranty/RMA review evidence',
]);

const api = read('frontend/src/modules/maintenance/api.ts');
includesAll('Maintenance API helper centralizes Fastify /api/v1 endpoint consumption', api, [
  'maintenanceEndpoints',
  'generateMaintenanceWorkOrder',
  'completeMaintenanceExecution',
  'postCommand',
  'createCrudResourceApi',
]);
excludesAll('Maintenance frontend source does not use raw fetch in module files', [
  'frontend/src/modules/maintenance/maintenance-resource-list.tsx',
  'frontend/src/modules/maintenance/maintenance-resource-detail.tsx',
  'frontend/src/modules/maintenance/maintenance-resource-form-page.tsx',
  'frontend/src/modules/maintenance/maintenance-command-panel.tsx',
  'frontend/src/modules/maintenance/maintenance-scoped-command-page.tsx',
  'frontend/src/modules/maintenance/maintenance-completion-workbench.tsx',
].map((f) => read(f)).join('\n'), ['fetch('], 'Centralized API client/query layer is required.');

const schema = read('database/prisma/schema.prisma');
includesAll('Prisma schema contains maintenance and asset warranty/RMA models required by Pass 14', schema, [
  'model MaintenancePlan',
  'model MaintenanceSchedule',
  'model MaintenanceExecution',
  'model MaintenanceChecklist',
  'model MaintenancePart',
  'model AssetWarranty',
  'model AssetRMA',
  'model WorkOrder',
  'model ServiceReport',
  'model StockTransaction',
  '@@unique([generatedWorkOrderId])',
  '@@unique([organizationId, rmaNo])',
]);

const result = {
  pass: 'PASS_14',
  name: 'Maintenance, Warranty Claims and RMA Completion',
  sourceOnly,
  status: failures.length || blockers.length ? 'FAIL' : (sourceOnly ? 'PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME' : 'PASS_STRICT_RUNTIME_GATES_READY'),
  checkedAt: new Date().toISOString(),
  checkedCount: checks.length,
  passedCount: checks.filter((c) => c.passed).length,
  blockerCount: blockers.length,
  failureCount: failures.length,
  checks,
  blockers,
  failures,
  limitations: [
    'This gate proves source-level maintenance/RMA compliance only unless run without --source-only on a machine with pnpm-lock.yaml and dependencies installed.',
    'Overall project remains HOLD until Pass 00 lockfile/frozen install/runtime proof is completed locally.',
    'Full Docker, browser E2E and database runtime evidence remain separate certification gates.',
  ],
};
writeFileSync(pathOf('certification-output/pass-14-maintenance-rma-completion.json'), JSON.stringify(result, null, 2));
writeFileSync(pathOf('certification-output/PASS_14_MAINTENANCE_RMA_COMPLETION_LOG.txt'), `PASS 14 maintenance/RMA gate ${result.status}\nchecks=${result.checkedCount}\npassed=${result.passedCount}\nblockers=${result.blockerCount}\nfailures=${result.failureCount}\n` + [...blockers, ...failures].join('\n') + '\n');
if (failures.length || blockers.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(`PASS 14 maintenance/RMA gate PASSED: ${result.passedCount}/${result.checkedCount} checks. Status ${result.status}.`);
