#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const failures = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    failures.push(`Missing required file: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}
function assertContains(rel, marker, label = marker) {
  const text = read(rel);
  if (!text.includes(marker)) failures.push(`${rel} missing ${label}`);
}
function exists(rel) {
  if (!fs.existsSync(path.join(root, rel))) failures.push(`Missing required file: ${rel}`);
}
function walk(dir) {
  const full = path.join(root, dir);
  const results = [];
  if (!fs.existsSync(full)) return results;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(rel));
    else results.push(rel.split(path.sep).join('/'));
  }
  return results;
}

const resources = ['employees', 'customers', 'customer-sites', 'vendors', 'products', 'warehouses'];

for (const file of [
  'frontend/src/modules/masters/business-master-config.ts',
  'frontend/src/modules/masters/business-master-detail.tsx',
  'frontend/src/modules/masters/data-import-wizard.tsx',
  'frontend/src/components/forms/resource-form-page.tsx',
]) exists(file);

const config = read('frontend/src/modules/masters/business-master-config.ts');
for (const resource of resources) {
  if (!config.includes(`${resource}:`) && !config.includes(`'${resource}':`)) failures.push(`BusinessMasterConfigs missing ${resource}`);
  for (const suffix of ['page.tsx', 'create/page.tsx', '[id]/page.tsx', '[id]/edit/page.tsx']) {
    exists(`frontend/src/app/(erp)/${resource}/${suffix}`);
  }
}

assertContains('frontend/src/modules/masters/entity-list.tsx', 'detailRouteBase', 'detail route support');
assertContains('frontend/src/modules/masters/entity-list.tsx', 'editRouteBase', 'edit route support');
assertContains('frontend/src/modules/masters/entity-list.tsx', 'createRoute', 'create route support');
assertContains('frontend/src/components/data/row-actions-menu.tsx', 'href?: string', 'link row-action support');
assertContains('frontend/src/components/forms/resource-form-page.tsx', 'useForm<', 'RHF route form');
assertContains('frontend/src/components/forms/resource-form-page.tsx', 'zodResolver', 'Zod route form resolver');
assertContains('frontend/src/components/forms/resource-form-page.tsx', 'apiPost', 'central API create submit');
assertContains('frontend/src/components/forms/resource-form-page.tsx', 'apiPatch', 'central API edit submit');
assertContains('frontend/src/components/forms/resource-form-page.tsx', 'queryClient.invalidateQueries', 'success invalidation');
assertContains('frontend/src/modules/masters/business-master-detail.tsx', 'Tabs', 'detail tabbed profile/related/audit surface');
assertContains('frontend/src/modules/masters/business-master-detail.tsx', 'apiGet', 'central API detail reads');
assertContains('frontend/src/modules/masters/business-master-detail.tsx', 'Documents', 'document panel');
assertContains('frontend/src/modules/masters/business-master-detail.tsx', 'Audit trail', 'audit panel');
assertContains('frontend/src/app/(erp)/imports/page.tsx', 'DataImportWizard', 'import wizard page');
assertContains('frontend/src/modules/masters/data-import-wizard.tsx', 'ImportUploadSchema', 'shared import upload schema');
assertContains('frontend/src/modules/masters/data-import-wizard.tsx', 'ValidateImportSchema', 'shared import validate schema');
assertContains('frontend/src/modules/masters/data-import-wizard.tsx', 'CommitImportSchema', 'shared import commit schema');
assertContains('frontend/src/modules/masters/data-import-wizard.tsx', 'RollbackImportSchema', 'shared import rollback schema');

const appPages = walk('frontend/src/app').filter((file) => file.endsWith('/page.tsx'));
for (const resource of resources) {
  for (const contract of [`erp-${resource}--create.md`, `erp-${resource}--id.md`, `erp-${resource}--id--edit.md`]) {
    exists(`docs/frontend-screens/${contract}`);
  }
}

const routeMap = read('frontend/src/lib/route-map.ts');
for (const required of ['/customers/[id]', '/employees/[id]/edit', '/vendors/[id]', '/products/create', '/warehouses/[id]/edit']) {
  if (!routeMap.includes(`route: '${required}'`)) failures.push(`FRONTEND_ROUTE_MAP missing ${required}`);
}

const pkg = JSON.parse(read('package.json') || '{}');
for (const script of ['frontend:business-masters:check', 'pass:r10:source-check', 'pass:r10:certify']) {
  if (!pkg.scripts?.[script]) failures.push(`package.json missing script ${script}`);
}

if (!sourceOnly && !fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) {
  failures.push('Runtime certification requires pnpm-lock.yaml. Run pass R1 locally and commit the generated lockfile.');
}

if (failures.length) {
  console.error(JSON.stringify({ pass: 'R10', status: 'FAIL', sourceOnly, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  pass: 'R10',
  status: sourceOnly ? 'PASS_SOURCE_LEVEL' : 'PASS_PENDING_RUNTIME_INSTALL',
  sourceOnly,
  resources,
  createdSurfacesPerResource: ['list', 'create', 'detail', 'edit'],
  importWizard: ['upload', 'validate', 'commit', 'rollback'],
  checkedRoutes: appPages.length,
  remainingLimits: [
    'This pass completes business-master frontend source surfaces; full runtime typecheck/build still requires local pnpm install.',
    'Inventory, procurement, projects/assets, service/maintenance, finance and platform workflows remain for R11-R16.',
  ],
}, null, 2));
