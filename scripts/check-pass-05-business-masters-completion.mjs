#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const startedAt = new Date().toISOString();
const checks = [];
const failures = [];
const blockers = [];
const warnings = [];

function pathOf(path) { return join(root, path); }
function hasFile(path) { return existsSync(pathOf(path)) && statSync(pathOf(path)).isFile(); }
function read(path) { return readFileSync(pathOf(path), 'utf8'); }
function readJson(path) { return JSON.parse(read(path)); }
function check(name, ok, message, options = {}) {
  checks.push({ name, ok, severity: options.blocker ? 'blocker' : options.warning ? 'warning' : 'failure' });
  if (ok) return;
  if (options.warning) warnings.push(message);
  else if (options.blocker) blockers.push(message);
  else failures.push(message);
}
function runNodeGate(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: root, stdio: 'pipe', encoding: 'utf8' });
  return { ok: result.status === 0, status: result.status, stdout: result.stdout, stderr: result.stderr };
}
function findFiles(dir, predicate) {
  const output = [];
  function walk(current) {
    if (!existsSync(current)) return;
    for (const entry of readdirSync(current)) {
      const p = join(current, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (predicate(p)) output.push(p);
    }
  }
  walk(pathOf(dir));
  return output;
}
function rel(path) { return path.startsWith(root) ? path.slice(root.length + 1) : path; }
function routeRegistered(source, method, route) {
  return source.includes(`defineLockedRoute('${method}', '${route}')`) || source.includes(`defineLockedRoute('${method}','${route}')`);
}
function modelBlock(schema, model) {
  return schema.match(new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
}
function countMatches(source, regex) {
  return (source.match(regex) ?? []).length;
}
function writeEvidence(status, message, extra = {}) {
  mkdirSync(pathOf('certification-output'), { recursive: true });
  const payload = {
    pass: 'PASS_05',
    name: 'Business Masters Completion',
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
    runtimeCommandsRequiredOnDeveloperMachine: [
      'pnpm install --frozen-lockfile',
      'pnpm pass:05:check',
      'pnpm typecheck',
      'pnpm test',
      'pnpm db:migrate:deploy',
      'pnpm db:seed',
      'pnpm test -- --runInBand business-master customer vendor product warehouse employee',
    ],
    ...extra,
  };
  writeFileSync(pathOf('certification-output/pass-05-business-masters-completion.json'), `${JSON.stringify(payload, null, 2)}\n`);
}

const previousPasses = [
  'scripts/check-pass-00-baseline-certification.mjs',
  'scripts/check-pass-01-architecture-boundary-audit.mjs',
  'scripts/check-pass-02-database-migration-seed-certification.mjs',
  'scripts/check-pass-03-core-platform-security.mjs',
  'scripts/check-pass-04-number-sequence-feature-flags.mjs',
];
for (const script of previousPasses) {
  check(`previous pass script exists: ${script}`, hasFile(script), `${script} is missing.`);
  if (hasFile(script)) {
    const result = runNodeGate(script, ['--source-only']);
    check(`previous source gate passes: ${script}`, result.ok, `${script} failed.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
}

const businessMasterGate = runNodeGate('scripts/check-business-masters.mjs');
check('existing business-master source gate passes', businessMasterGate.ok, `scripts/check-business-masters.mjs failed.\nSTDOUT:\n${businessMasterGate.stdout}\nSTDERR:\n${businessMasterGate.stderr}`);

const lock = readJson('docs/contracts/capability-locks/number-sequence-business-masters.json');
const schema = read('database/prisma/schema.prisma');
const packageJson = readJson('package.json');
const requiredSubjects = [
  {
    key: 'employees', subject: 'EMPLOYEE', owner: 'hr', moduleKey: 'hr', endpoint: '/api/v1/employees', frontendEndpoint: '/employees', routeBase: '/employees',
    permission: { view: 'employee.view', create: 'employee.create', update: 'employee.update' },
    backend: {
      route: 'backend/src/modules/hr/employee/employee.routes.ts', controller: 'backend/src/modules/hr/employee/employee.controller.ts', service: 'backend/src/modules/hr/employee/employee.service.ts', repository: 'backend/src/modules/hr/employee/employee.repository.ts',
    },
    contractNames: ['CreateEmployeeSchema', 'UpdateEmployeeSchema', 'EmployeeListQuerySchema'],
    model: 'Employee', unique: '@@unique([organizationId, employeeNo])', audit: ['EMPLOYEE_CREATED', 'EMPLOYEE_UPDATED'], branchScoped: true,
  },
  {
    key: 'customers', subject: 'CUSTOMER', owner: 'customers', moduleKey: 'customers', endpoint: '/api/v1/customers', frontendEndpoint: '/customers', routeBase: '/customers',
    permission: { view: 'customer.view', create: 'customer.create', update: 'customer.update' },
    backend: {
      route: 'backend/src/modules/customers/customer.routes.ts', controller: 'backend/src/modules/customers/customer.controller.ts', service: 'backend/src/modules/customers/customer.service.ts', repository: 'backend/src/modules/customers/customer.repository.ts',
    },
    contractNames: ['CreateCustomerSchema', 'UpdateCustomerSchema', 'CustomerListQuerySchema'],
    model: 'Customer', unique: '@@unique([organizationId, code])', audit: ['CUSTOMER_CREATED', 'CUSTOMER_UPDATED'], branchScoped: false,
  },
  {
    key: 'customer-sites', subject: 'CUSTOMER_SITE', owner: 'customers', moduleKey: 'customers', endpoint: '/api/v1/customer-sites', frontendEndpoint: '/customer-sites', routeBase: '/customer-sites',
    permission: { view: 'customer_site.view', create: 'customer_site.create', update: 'customer_site.update' },
    backend: {
      route: 'backend/src/modules/customers/customer-site.routes.ts', controller: 'backend/src/modules/customers/customer-site.controller.ts', service: 'backend/src/modules/customers/customer-site.service.ts', repository: 'backend/src/modules/customers/customer-site.repository.ts',
    },
    contractNames: ['CreateCustomerSiteSchema', 'UpdateCustomerSiteSchema', 'CustomerSiteListQuerySchema'],
    model: 'CustomerSite', unique: '@@unique([organizationId, code])', audit: ['CUSTOMER_SITE_CREATED', 'CUSTOMER_SITE_UPDATED'], branchScoped: false,
  },
  {
    key: 'vendors', subject: 'VENDOR', owner: 'vendors', moduleKey: 'vendors', endpoint: '/api/v1/vendors', frontendEndpoint: '/vendors', routeBase: '/vendors',
    permission: { view: 'vendor.view', create: 'vendor.create', update: 'vendor.update' },
    backend: {
      route: 'backend/src/modules/vendors/vendor.routes.ts', controller: 'backend/src/modules/vendors/vendor.controller.ts', service: 'backend/src/modules/vendors/vendor.service.ts', repository: 'backend/src/modules/vendors/vendor.repository.ts',
    },
    contractNames: ['CreateVendorSchema', 'UpdateVendorSchema', 'VendorListQuerySchema'],
    model: 'Vendor', unique: '@@unique([organizationId, code])', audit: ['VENDOR_CREATED', 'VENDOR_UPDATED'], branchScoped: false,
  },
  {
    key: 'products', subject: 'PRODUCT', owner: 'inventory', moduleKey: 'inventory', endpoint: '/api/v1/products', frontendEndpoint: '/products', routeBase: '/products',
    permission: { view: 'product.view', create: 'product.create', update: 'product.update' },
    backend: {
      route: 'backend/src/modules/inventory/product.routes.ts', controller: 'backend/src/modules/inventory/product.controller.ts', service: 'backend/src/modules/inventory/product.service.ts', repository: 'backend/src/modules/inventory/product.repository.ts',
    },
    contractNames: ['CreateProductSchema', 'UpdateProductSchema', 'ProductListQuerySchema'],
    model: 'Product', unique: '@@unique([organizationId, sku])', audit: ['PRODUCT_CREATED', 'PRODUCT_UPDATED'], branchScoped: false,
  },
  {
    key: 'warehouses', subject: 'WAREHOUSE', owner: 'inventory', moduleKey: 'inventory', endpoint: '/api/v1/warehouses', frontendEndpoint: '/warehouses', routeBase: '/warehouses',
    permission: { view: 'warehouse.view', create: 'warehouse.create', update: 'warehouse.update' },
    backend: {
      route: 'backend/src/modules/inventory/warehouse.routes.ts', controller: 'backend/src/modules/inventory/warehouse.controller.ts', service: 'backend/src/modules/inventory/warehouse.service.ts', repository: 'backend/src/modules/inventory/warehouse.repository.ts',
    },
    contractNames: ['CreateWarehouseSchema', 'UpdateWarehouseSchema', 'WarehouseListQuerySchema'],
    model: 'Warehouse', unique: '@@unique([organizationId, code])', audit: ['WAREHOUSE_CREATED', 'WAREHOUSE_UPDATED'], branchScoped: true,
  },
];

check('PASS 05 package script exists', packageJson.scripts?.['pass:05:check'] === 'node scripts/check-pass-05-business-masters-completion.mjs', 'package.json must expose pass:05:check.');
check('PASS 05 source-only package script exists', packageJson.scripts?.['pass:05:source-check'] === 'node scripts/check-pass-05-business-masters-completion.mjs --source-only', 'package.json must expose pass:05:source-check.');

for (const row of lock.implementedRoutes) {
  const files = findFiles('backend/src/modules', (p) => p.endsWith('.routes.ts'));
  const allRouteText = files.map((p) => read(rel(p))).join('\n');
  check(`locked route still registered: ${row.method} ${row.path}`, routeRegistered(allRouteText, row.method, row.path), `Locked business-master route missing: ${row.method} ${row.path}.`);
}

for (const model of lock.newPhysicalModels) {
  check(`business-master logical model exists: ${model}`, schema.includes(`model ${model} {`), `Prisma model missing: ${model}.`);
}
check('no Float in Prisma schema', !/\bFloat\b/.test(schema), 'Float is forbidden by the blueprint money/quantity rule.');
for (const subject of requiredSubjects) {
  const block = modelBlock(schema, subject.model);
  check(`${subject.model} carries organizationId`, /\borganizationId\s+String\b/.test(block), `${subject.model} must be tenant-owned with organizationId.`);
  check(`${subject.model} has tenant-local business key uniqueness`, schema.includes(subject.unique), `${subject.model} missing uniqueness invariant ${subject.unique}.`);
  if (subject.branchScoped) check(`${subject.model} carries branchId for branch scope`, /\bbranchId\s+String\b/.test(block), `${subject.model} must include branchId for branch scoped operations.`);
}

for (const subject of requiredSubjects) {
  for (const [kind, path] of Object.entries(subject.backend)) check(`${subject.key} backend ${kind} exists`, hasFile(path), `${subject.key} missing ${kind} file ${path}.`);
  if (!hasFile(subject.backend.route)) continue;
  const route = read(subject.backend.route);
  check(`${subject.key} route registers list`, routeRegistered(route, 'GET', subject.endpoint), `${subject.key} list route missing.`);
  check(`${subject.key} route registers detail`, routeRegistered(route, 'GET', `${subject.endpoint}/:id`), `${subject.key} detail route missing.`);
  check(`${subject.key} route registers create`, routeRegistered(route, 'POST', subject.endpoint), `${subject.key} create route missing.`);
  check(`${subject.key} route registers edit`, routeRegistered(route, 'PATCH', `${subject.endpoint}/:id`), `${subject.key} edit route missing.`);
  check(`${subject.key} route authenticates`, route.includes('authenticateRequest'), `${subject.key} route must authenticate.`);
  check(`${subject.key} route resolves tenant`, route.includes('resolveTenantRequest'), `${subject.key} route must resolve tenant.`);
  check(`${subject.key} route uses view permission`, route.includes(subject.permission.view), `${subject.key} route missing view permission ${subject.permission.view}.`);
  check(`${subject.key} route uses create permission`, route.includes(subject.permission.create), `${subject.key} route missing create permission ${subject.permission.create}.`);
  check(`${subject.key} route uses update permission`, route.includes(subject.permission.update), `${subject.key} route missing update permission ${subject.permission.update}.`);
  check(`${subject.key} route blocks disabled module`, route.includes(`assertModuleEnabled(request.tenant!.organizationId, '${subject.moduleKey}')`), `${subject.key} route must use PlatformAccessFacade.assertModuleEnabled for ${subject.moduleKey}.`);

  const controller = read(subject.backend.controller);
  for (const contractName of subject.contractNames) check(`${subject.key} controller parses ${contractName}`, controller.includes(contractName) && controller.includes(`${contractName}.parse`), `${subject.key} controller must parse ${contractName}.`);
  check(`${subject.key} controller has no Prisma direct access`, !/\bprisma\b|@nexora\/database/.test(controller), `${subject.key} controller must not import/use Prisma/database directly.`);

  const service = read(subject.backend.service);
  check(`${subject.key} service audits create/update`, subject.audit.every((a) => service.includes(a)) && service.includes('AuditWriter'), `${subject.key} service must write audit actions ${subject.audit.join(', ')}.`);
  check(`${subject.key} service uses transaction for mutation`, service.includes('withTransaction'), `${subject.key} create/update mutations should use withTransaction.`);
  check(`${subject.key} service has AppError validation`, service.includes('AppError'), `${subject.key} service must reject invalid tenant/reference/scope cases.`);
  check(`${subject.key} service does not use queues for master mutations`, !/BullMQ|queue|Queue/.test(service), `${subject.key} master data mutation must not be deferred to queues.`);

  const repo = read(subject.backend.repository);
  check(`${subject.key} repository owns Prisma/database access`, /@nexora\/database/.test(repo), `${subject.key} repository must own persistence access.`);
  check(`${subject.key} repository scopes reads by organizationId`, countMatches(repo, /organizationId/g) >= 3, `${subject.key} repository must include organizationId in list/get/update queries.`);
}

const businessMasterConfig = read('frontend/src/modules/masters/business-master-config.ts');
const entityList = read('frontend/src/modules/masters/entity-list.tsx');
const detail = read('frontend/src/modules/masters/business-master-detail.tsx');
const formPage = read('frontend/src/components/forms/resource-form-page.tsx');
const formRegistry = read('frontend/src/modules/forms/resource-form-registry.ts');
const mastersApi = read('frontend/src/modules/masters/api.ts');

check('EntityList uses PermissionGate for create action', entityList.includes('PermissionGate') && entityList.includes('createPermission'), 'Business-master list create action must be permission-gated.');
check('BusinessMasterDetail uses update permission for edit action', detail.includes('PermissionGate') && detail.includes('resource.updatePermission'), 'Business-master detail edit action must be update-permission gated.');
check('ResourceFormPage supports direct URL permission denial', formPage.includes('requiredPermission') && formPage.includes('ForbiddenState') && formPage.includes('PermissionGate'), 'Direct create/edit form pages must have a frontend permission gate.');
check('ResourceFormPage uses React Hook Form', formPage.includes('useForm') && formPage.includes('zodResolver'), 'ResourceFormPage must use React Hook Form and Zod resolver.');
check('EntityList uses TanStack Query and TanStack Table-backed DataTable', entityList.includes('useQuery') && entityList.includes('DataTable') && entityList.includes('createEntityColumns'), 'EntityList must use centralized query + TanStack table foundation.');
check('Masters API uses centralized API client', mastersApi.includes("@/lib/api-client") && !/fetch\(/.test(mastersApi), 'Masters API functions must use centralized API client, not raw fetch.');

for (const subject of requiredSubjects) {
  check(`frontend config includes ${subject.key}`, businessMasterConfig.includes(`key: '${subject.key}'`) && businessMasterConfig.includes(`endpoint: '${subject.frontendEndpoint}'`), `${subject.key} missing from BusinessMasterConfigs.`);
  check(`frontend config view/create/update permissions for ${subject.key}`, businessMasterConfig.includes(`viewPermission: '${subject.permission.view}'`) && businessMasterConfig.includes(`createPermission: '${subject.permission.create}'`) && businessMasterConfig.includes(`updatePermission: '${subject.permission.update}'`), `${subject.key} config missing expected permission keys.`);
  check(`${subject.key} form registry defines shared Zod-backed form`, formRegistry.includes(`'${subject.frontendEndpoint}': createResourceDefinition`) && subject.contractNames.slice(0, 1).every((n) => formRegistry.includes(n)), `${subject.key} missing shared Zod ResourceFormDefinition.`);
  check(`${subject.key} list route page exists`, hasFile(`frontend/src/app/(erp)/${subject.key}/page.tsx`), `${subject.key} list page missing.`);
  check(`${subject.key} create route page exists`, hasFile(`frontend/src/app/(erp)/${subject.key}/create/page.tsx`), `${subject.key} create page missing.`);
  check(`${subject.key} detail route page exists`, hasFile(`frontend/src/app/(erp)/${subject.key}/[id]/page.tsx`), `${subject.key} detail page missing.`);
  check(`${subject.key} edit route page exists`, hasFile(`frontend/src/app/(erp)/${subject.key}/[id]/edit/page.tsx`), `${subject.key} edit page missing.`);
  const createPath = `frontend/src/app/(erp)/${subject.key}/create/page.tsx`;
  const editPath = `frontend/src/app/(erp)/${subject.key}/[id]/edit/page.tsx`;
  if (hasFile(createPath)) check(`${subject.key} create page passes create permission`, read(createPath).includes('requiredPermission={resource.createPermission}'), `${subject.key} create page must pass resource.createPermission.`);
  if (hasFile(editPath)) check(`${subject.key} edit page passes update permission`, read(editPath).includes('requiredPermission={resource.updatePermission}'), `${subject.key} edit page must pass resource.updatePermission.`);
}

const importService = read('backend/src/modules/import/import-template/import-template.service.ts');
for (const importSubject of ['EMPLOYEE', 'CUSTOMER', 'VENDOR', 'PRODUCT', 'WAREHOUSE']) {
  check(`import template baseline includes ${importSubject}`, importService.includes(`subjectType:'${importSubject}'`) || importService.includes(`subjectType: '${importSubject}'`), `Import baseline missing ${importSubject}.`);
}

const app = read('backend/src/app.ts');
for (const factory of ['createHrModule', 'createCustomersModule', 'createVendorsModule', 'createInventoryModule']) {
  check(`app composition registers ${factory}`, app.includes(factory), `App composition missing ${factory}.`);
}

const hasLockfile = hasFile('pnpm-lock.yaml');
if (!sourceOnly) {
  check('pnpm-lock.yaml exists for strict runtime install', hasLockfile, 'pnpm-lock.yaml is missing; strict runtime certification must be run after PASS 00 lockfile generation.', { blocker: true });
}

if (blockers.length || failures.length) {
  writeEvidence('FAIL', 'PASS 05 business-master completion gates failed. Fix blockers/failures before taking the next pass.');
  console.error('PASS 05 FAILED');
  for (const blocker of blockers) console.error(`BLOCKER: ${blocker}`);
  for (const failure of failures) console.error(`FAILURE: ${failure}`);
  process.exit(1);
}

const status = sourceOnly || !hasLockfile ? 'PASS_SOURCE_LEVEL' : 'PASS_STRICT_RUNTIME_PREFLIGHT';
const message = sourceOnly || !hasLockfile
  ? 'Business master source gates passed. Strict runtime proof remains HOLD until PASS 00 lockfile/install/build and DB checks run locally.'
  : 'Business master source gates passed with lockfile present; run full local runtime commands for GO.';
writeEvidence(status, message, { subjectsCertified: requiredSubjects.map((s) => s.subject) });
console.log(`PASS 05 ${status}: business masters source gates passed for ${requiredSubjects.length} core master surfaces.`);
if (!hasLockfile) console.log('PASS 00 runtime blocker remains: pnpm-lock.yaml is still missing until generated on a connected machine.');
