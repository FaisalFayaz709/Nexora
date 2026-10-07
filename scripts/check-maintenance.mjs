import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];

const prior = spawnSync(process.execPath, ['scripts/check-field-service.mjs'], { stdio: 'inherit' });
if (prior.status !== 0) process.exit(prior.status ?? 1);

const lock = JSON.parse(readFileSync(join(root, 'docs/contracts/capability-locks/maintenance.json'), 'utf8'));
const catalog = readFileSync(join(root, 'docs/contracts/api-endpoint-matrix.csv'), 'utf8');
const routes = readFileSync(join(root, 'backend/src/modules/maintenance/maintenance.routes.ts'), 'utf8');

for (const route of lock.lockedRoutes) {
  const signature = `defineLockedRoute('${route.method}', '${route.path}')`;
  if (!routes.includes(signature)) failures.push(`Missing locked Maintenance route: ${route.method} ${route.path}`);
  if (!catalog.includes(route.path)) failures.push(`Maintenance route absent from frozen catalog: ${route.path}`);
  if (!routes.includes(`'${route.permission}'`)) failures.push(`Maintenance permission guard missing: ${route.permission}`);
}
const routeMatches = [...routes.matchAll(/defineLockedRoute\('([A-Z]+)', '([^']+)'\)/g)].map(m => `${m[1]} ${m[2]}`);
if (new Set(routeMatches).size !== lock.lockedRouteCount) failures.push(`Expected ${lock.lockedRouteCount} Maintenance routes, got ${new Set(routeMatches).size}`);

const schema = readFileSync(join(root, 'database/prisma/schema.prisma'), 'utf8');
for (const model of [...lock.sourcePhysicalModels, ...lock.implementationSupportModels]) {
  if (!new RegExp(`model\\s+${model}\\s*\\{`).test(schema)) failures.push(`Missing Maintenance Prisma model: ${model}`);
}
if (/\bFloat\b/.test(schema)) failures.push('Float introduced into Prisma schema.');

const migration = readFileSync(join(root, 'database/prisma/migrations/20260903000600_pass12_maintenance/migration.sql'), 'utf8');
for (const invariant of [
  'MaintenancePlan_frequency_check',
  "'DAYS','WEEKS','MONTHS','YEARS'",
  "'SCHEDULED','DUE','GENERATED','COMPLETED','SKIPPED','CANCELLED'",
  "'PENDING','IN_PROGRESS','COMPLETED','CANCELLED'",
  "'PASSED','REPAIRED','FAILED','REPLACED'",
  'MaintenanceSchedule_generatedWorkOrderId_key',
  'MaintenanceExecution_complete_check',
  'MaintenancePart_stockTransactionId_key',
  'MaintenancePart_qty_check',
]) if (!migration.includes(invariant)) failures.push(`Maintenance migration invariant missing: ${invariant}`);

const service = readFileSync(join(root, 'backend/src/modules/maintenance/maintenance.service.ts'), 'utf8');
const workflowPolicy = readFileSync(join(root, 'backend/src/modules/maintenance/maintenance-workflow-policy.ts'), 'utf8');
const completionPolicy = readFileSync(join(root, 'backend/src/modules/maintenance/maintenance-completion-policy.ts'), 'utf8');
const maintenanceBoundarySource = [service, workflowPolicy, completionPolicy].join('\n');
const maintenanceBoundaryCompact = maintenanceBoundarySource.replace(/\s+/g, '');
for (const invariant of [
  'MAINTENANCE_ASSET_TERMINAL',
  'IDEMPOTENCY_KEY_REQUIRED',
  'IDEMPOTENCY_KEY_REUSED',
  'this.fieldService.createMaintenanceWorkOrder',
  'this.assets.markUnderMaintenance',
  'this.inventory.consumeMaintenancePart',
  'MAINTENANCE_WORK_ORDER_NOT_CLOSED',
  'this.assets.recordMaintenanceCompletion',
  "type: 'maintenance.due'",
  'nextDueAt',
]) if (!maintenanceBoundaryCompact.includes(invariant.replace(/\s+/g, ''))) failures.push(`Maintenance service boundary invariant missing: ${invariant}`);
if (!service.includes('assertExecutionCompletionAllowed')) failures.push('Maintenance service does not call the centralized work-order completion policy.');
if (service.includes('FieldServiceRepository') || service.includes('AssetRepository') || service.includes('InventoryRepository')) failures.push('Maintenance service imports private cross-domain repositories.');
if (service.includes('BullMQ') || service.includes("from 'bullmq'")) failures.push('Maintenance critical state must not use BullMQ.');

const fieldFacade = readFileSync(join(root, 'backend/src/modules/service/field-service.facade.ts'), 'utf8');
if (!fieldFacade.includes('createMaintenanceWorkOrder')) failures.push('FieldServiceFacade lacks Maintenance WorkOrder creation.');
const assetFacade = readFileSync(join(root, 'backend/src/modules/assets/asset.facade.ts'), 'utf8');
for (const invariant of ['markUnderMaintenance', 'recordMaintenanceCompletion']) if (!assetFacade.includes(invariant)) failures.push(`AssetFacade missing ${invariant}`);
const invFacade = readFileSync(join(root, 'backend/src/modules/inventory/inventory.facade.ts'), 'utf8');
for (const invariant of ['consumeMaintenancePart', "referenceType: 'MaintenanceExecution'", "'TECHNICIAN_ISSUE'"]) if (!invFacade.includes(invariant)) failures.push(`InventoryFacade Maintenance integration missing: ${invariant}`);

const module = readFileSync(join(root, 'backend/src/modules/maintenance/maintenance.module.ts'), 'utf8');
for (const boundary of [
  "type { AssetFacade } from '../assets/index.js'",
  "type { FieldServiceFacade } from '../service/index.js'",
  "type { InventoryFacade } from '../inventory/index.js'",
]) if (!module.includes(boundary)) failures.push(`Maintenance public-facade boundary missing: ${boundary}`);

const app = readFileSync(join(root, 'backend/src/app.ts'), 'utf8');
for (const invariant of ['createMaintenanceModule(', 'fieldService.facade', 'assets.facade', 'inventory.facade', 'app.register(maintenance.plugin']) if (!app.includes(invariant)) failures.push(`Maintenance app composition missing: ${invariant}`);

for (const file of [
  'backend/src/modules/maintenance/maintenance.repository.ts',
  'backend/src/modules/maintenance/maintenance.service.ts',
  'backend/src/modules/maintenance/maintenance.controller.ts',
  'backend/src/modules/maintenance/maintenance.routes.ts',
  'backend/src/modules/maintenance/maintenance.module.ts',
  'frontend/src/app/(erp)/maintenance/page.tsx',
  'frontend/src/app/(erp)/maintenance-schedule/page.tsx',
]) if (!existsSync(join(root, file))) failures.push(`Missing Maintenance file: ${file}`);

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!pkg.scripts['maintenance:check']) failures.push('package.json missing maintenance:check script.');
if (!pkg.scripts['verify:static']?.includes('maintenance:check')) failures.push('verify:static does not include maintenance:check.');

if (failures.length) {
  console.error('Maintenance gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Maintenance gate PASSED: ${lock.lockedRouteCount} exact locked Maintenance routes, ${lock.sourcePhysicalModelCount} source models and ${lock.implementationSupportModels.length} support model.`);
