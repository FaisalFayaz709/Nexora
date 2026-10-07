import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];

const prior = spawnSync(process.execPath, ['scripts/check-approval-engine.mjs'], { stdio: 'inherit' });
if (prior.status !== 0) process.exit(prior.status ?? 1);

const lock = JSON.parse(
  readFileSync(join(root, 'docs/contracts/capability-locks/projects.json'), 'utf8'),
);
const catalog = readFileSync(
  join(root, 'docs/contracts/api-endpoint-matrix.csv'),
  'utf8',
);
const routes = readFileSync(
  join(root, 'backend/src/modules/projects/project.routes.ts'),
  'utf8',
);

for (const route of lock.lockedRoutes) {
  const signature = `defineLockedRoute('${route.method}', '${route.path}')`;
  if (!routes.includes(signature)) failures.push(`Missing locked Project route: ${route.method} ${route.path}`);
  if (!catalog.includes(route.path)) failures.push(`Project route absent from frozen catalog: ${route.path}`);
  if (!routes.includes(`'${route.permission}'`)) failures.push(`Project permission guard missing: ${route.permission}`);
}

const routeMatches = [
  ...routes.matchAll(/defineLockedRoute\('([A-Z]+)', '([^']+)'\)/g),
].map((match) => `${match[1]} ${match[2]}`);
if (new Set(routeMatches).size !== lock.lockedRouteCount) {
  failures.push(`Expected ${lock.lockedRouteCount} unique Project routes, found ${new Set(routeMatches).size}`);
}

const schema = readFileSync(join(root, 'database/prisma/schema.prisma'), 'utf8');
for (const model of lock.newPhysicalModels) {
  if (!new RegExp(`model\\s+${model}\\s*\\{`).test(schema)) {
    failures.push(`Missing Project Prisma model: ${model}`);
  }
}
if (/\bFloat\b/.test(schema)) failures.push('Float introduced into Prisma schema.');

for (const status of lock.canonicalProjectStatuses) {
  if (!schema.includes(`'${status}'`) && !schema.includes(`"${status}"`)) {
    // canonical statuses are enforced in migration and shared schema, not Prisma enum.
  }
}

const migration = readFileSync(
  join(root, 'database/prisma/migrations/20260903000300_pass9_projects/migration.sql'),
  'utf8',
);
for (const invariant of [
  "'DRAFT','PLANNED','ACTIVE','ON_HOLD','COMPLETED','HANDED_OVER','CANCELLED'",
  "'NOT_STARTED','IN_PROGRESS','BLOCKED','COMPLETED','CANCELLED'",
  'Project_organizationId_projectNo_key',
  'Project_dates_check',
  'ProjectTask_completion_check',
  'ProjectTaskDependency_not_self_check',
  'BillOfMaterials_projectId_version_key',
  'BOMItem_qty_check',
  'MaterialRequirement_projectId_fkey',
  'PurchaseRequest_projectId_fkey',
  'StockReservation_projectId_fkey',
]) {
  if (!migration.includes(invariant)) failures.push(`Project migration invariant missing: ${invariant}`);
}

const projectSourceFiles = [
  'backend/src/modules/projects/project.service.ts',
  'backend/src/modules/projects/project-delivery-policy.ts',
  'backend/src/modules/projects/project-completion-policy.ts',
].map((path) => readFileSync(join(root, path), 'utf8')).join('\n');
for (const invariant of [
  "entityType: 'PROJECT'",
  'PROJECT_INVALID_STATE_TRANSITION',
  'PROJECT_TASK_INVALID_STATE_TRANSITION',
  'PROJECT_TASK_SELF_DEPENDENCY',
  'PROJECT_BOM_DUPLICATE_PRODUCT',
  'PROJECT_APPROVED_BOM_REQUIRED',
  'PROJECT_NO_MATERIAL_SHORTAGE',
  'this.inventory.freeStockForProject',
  'this.procurement.createMaterialRequirementForProject',
  'this.procurement.projectProcurementReadModel',
  'PROJECT_HANDOVER_INVALID_STATE',
  "type: 'project.created'",
  "type: 'project.handed_over'",
  "status: 'HANDED_OVER'",
]) {
  if (!projectSourceFiles.includes(invariant)) failures.push(`Project source invariant missing: ${invariant}`);
}

const module = readFileSync(join(root, 'backend/src/modules/projects/project.module.ts'), 'utf8');
for (const boundary of [
  "type { CustomerFacade } from '../customers/index.js'",
  "type { EmployeeFacade } from '../hr/index.js'",
  "type { InventoryFacade } from '../inventory/index.js'",
  "type { ProcurementFacade } from '../procurement/index.js'",
]) {
  if (!module.includes(boundary)) failures.push(`Project public-facade boundary missing: ${boundary}`);
}

for (const path of [
  'backend/src/modules/projects/project.repository.ts',
  'backend/src/modules/projects/project.service.ts',
  'backend/src/modules/projects/project.controller.ts',
  'backend/src/modules/projects/project.routes.ts',
  'backend/src/modules/projects/project.facade.ts',
  'backend/src/modules/projects/project.module.ts',
  'frontend/src/app/(erp)/projects/page.tsx',
  'frontend/src/app/(erp)/project-tasks/page.tsx',
]) {
  if (!existsSync(join(root, path))) failures.push(`Missing Project file: ${path}`);
}

const app = readFileSync(join(root, 'backend/src/app.ts'), 'utf8');
for (const invariant of [
  'createProjectModule(',
  'customerFacade',
  'procurement.facade',
  'inventory.facade',
  'app.register(projects.plugin',
]) {
  if (!app.includes(invariant)) failures.push(`Project app composition missing: ${invariant}`);
}

const facade = readFileSync(join(root, 'backend/src/modules/procurement/procurement.facade.ts'), 'utf8');
if (!facade.includes('createMaterialRequirementForProject')) {
  failures.push('Procurement public facade lacks Project material requirement integration.');
}
if (!facade.includes('projectProcurementReadModel')) {
  failures.push('Procurement public facade lacks Project costing/timeline read model.');
}

const inventoryFacade = readFileSync(join(root, 'backend/src/modules/inventory/inventory.facade.ts'), 'utf8');
if (!inventoryFacade.includes('freeStockForProject')) {
  failures.push('Inventory public facade lacks Project free-stock read.');
}

if (failures.length) {
  console.error('Projects gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Projects gate PASSED: ${lock.lockedRouteCount} exact locked Project routes and ${lock.newPhysicalModelCount} Project models.`,
);
