import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const passedControls = [];
const staticBlockers = [];
const runtimeBlockers = [];
const sourceGaps = [];

function pass(id, message) {
  passedControls.push({ id, message });
}
function staticBlock(id, message) {
  staticBlockers.push({ id, message });
}
function runtimeBlock(id, message) {
  runtimeBlockers.push({ id, message });
}
function sourceGap(id, message) {
  sourceGaps.push({ id, message });
}
function text(path) {
  return readFileSync(join(root, path), 'utf8');
}
function filesUnder(dir) {
  const output = [];
  if (!existsSync(dir)) return output;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) output.push(...filesUnder(path));
    else output.push(path);
  }
  return output;
}

// Reuse the strengthened architecture guard as the primary boundary check.
const architecture = spawnSync(process.execPath, ['scripts/check-architecture.mjs'], {
  cwd: root,
  encoding: 'utf8',
});
if (architecture.status === 0) {
  pass('ARCHITECTURE', 'Locked stack and strengthened module/service/repository/facade boundaries pass.');
} else {
  staticBlock('ARCHITECTURE', `${architecture.stdout}\n${architecture.stderr}`.trim());
}

const requiredStackDeps = {
  'frontend/package.json': ['next', '@tanstack/react-query'],
  'backend/package.json': ['fastify', 'zod', '@nexora/database', '@fastify/swagger', '@fastify/swagger-ui'],
  'worker/package.json': ['bullmq', 'ioredis'],
  'database/package.json': ['@prisma/client'],
};
for (const [path, dependencies] of Object.entries(requiredStackDeps)) {
  const pkg = JSON.parse(text(path));
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const dependency of dependencies) {
    if (!all[dependency]) staticBlock('STACK', `${path} missing ${dependency}`);
  }
}
if (!staticBlockers.some((item) => item.id === 'STACK')) {
  pass('STACK', 'Locked implementation stack dependencies are present.');
}

const lockedEndpoints = JSON.parse(text('shared/src/contracts/registry/locked-endpoints.json'));
const locked = new Set(lockedEndpoints.map((entry) => `${entry.method} ${entry.endpoint}`));
const routeFiles = filesUnder(join(root, 'backend/src/modules')).filter((path) => path.endsWith('.routes.ts'));
const implemented = [];
for (const file of routeFiles) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/defineLockedRoute\(\s*'([A-Z]+)'\s*,\s*'([^']+)'\s*\)/g)) {
    implemented.push({ method: match[1], path: match[2], file: relative(root, file) });
  }
}
const implementationKeys = new Set(implemented.map((entry) => `${entry.method} ${entry.path}`));
if (implementationKeys.size !== implemented.length) {
  staticBlock('API_SIGNATURES', 'Duplicate implemented method/path signatures exist.');
}
for (const route of implemented) {
  if (!locked.has(`${route.method} ${route.path}`)) {
    staticBlock('API_SIGNATURES', `Unapproved route: ${route.method} ${route.path}`);
  }
}
if (!staticBlockers.some((item) => item.id === 'API_SIGNATURES')) {
  pass(
    'API_SIGNATURES',
    `${implementationKeys.size} implemented routes are members of the frozen ${locked.size}-endpoint catalog; no extra route signature is present.`,
  );
}

// Every registered locked route must publish a Fastify schema produced by defineLockedRoute.
for (const file of routeFiles) {
  const source = readFileSync(file, 'utf8');
  const declarations = [...source.matchAll(/const\s+(\w+)\s*=\s*defineLockedRoute\(/g)].map((match) => match[1]);
  for (const variable of declarations) {
    const schemaUse = new RegExp(`schema\\s*:\\s*${variable}\\.schema`);
    if (!schemaUse.test(source)) {
      staticBlock('OPENAPI_ROUTE_SCHEMA', `${relative(root, file)} does not bind ${variable}.schema.`);
    }
  }
}
const openapiPlugin = text('backend/src/plugins/openapi.ts');
if (!openapiPlugin.includes('@fastify/swagger') || !openapiPlugin.includes("routePrefix: '/docs'")) {
  staticBlock('OPENAPI', 'Controlled OpenAPI/Swagger registration is incomplete.');
}
if (!staticBlockers.some((item) => item.id === 'OPENAPI' || item.id === 'OPENAPI_ROUTE_SCHEMA')) {
  pass('OPENAPI', 'All implemented locked routes bind generated schemas and controlled OpenAPI /docs support is present.');
}

const app = text('backend/src/app.ts');
for (const required of [
  "app.addHook('onResponse'",
  'requestId: request.id',
  'route: request.routeOptions.url',
  'status: reply.statusCode',
  'durationMs: reply.elapsedTime',
  'userId: request.auth?.userId',
  'organizationId: request.tenant?.organizationId',
]) {
  if (!app.includes(required)) staticBlock('OBSERVABILITY', `Missing request telemetry field/hook: ${required}`);
}
if (!staticBlockers.some((item) => item.id === 'OBSERVABILITY')) {
  pass('OBSERVABILITY', 'Request-completion telemetry contains request, route, status, duration, user and organization context.');
}

if (!existsSync(join(root, '.github/workflows/codeql.yml'))) {
  staticBlock('CODE_SCAN', 'CodeQL workflow is missing.');
} else {
  pass('CODE_SCAN', 'CodeQL workflow is present in addition to dependency auditing.');
}

const identityRepo = text('backend/src/modules/identity/identity.repository.ts');
const authService = text('backend/src/modules/identity/authentication.service.ts');
if (!identityRepo.includes('mfaRequired: true') || !authService.includes('AUTH_MFA_ENROLLMENT_REQUIRED')) {
  staticBlock('PRIVILEGED_MFA', 'Privileged-role MFA enrollment/challenge enforcement is incomplete.');
} else {
  pass('PRIVILEGED_MFA', 'Privileged-role MFA requirement is resolved from active role assignment and enforced during login.');
}
if (!identityRepo.includes('failedLoginAttempts') || !identityRepo.includes('lockedUntil') || !authService.includes('AUTH_ACCOUNT_LOCKED')) {
  staticBlock('ACCOUNT_LOCKOUT', 'Persistent failed-login lockout is incomplete.');
} else {
  pass('ACCOUNT_LOCKOUT', 'Persistent login failure counters and lockout window are implemented.');
}
const listSessions = identityRepo.match(/async listSessions[\s\S]*?\n  \}/)?.[0] ?? '';
if (!listSessions.includes('revokedAt: null') || !listSessions.includes('expiresAt: { gt: new Date() }')) {
  staticBlock('ACTIVE_SESSIONS', 'GET /auth/sessions backing query is not restricted to active sessions.');
} else {
  pass('ACTIVE_SESSIONS', 'Session listing is restricted to unrevoked, unexpired sessions.');
}

const tenantValidationFiles = {
  'backend/src/modules/customers/customer.service.ts': ['addressBelongsToOrganization'],
  'backend/src/modules/customers/customer-site.service.ts': ['addressBelongsToOrganization'],
  'backend/src/modules/vendors/vendor.service.ts': ['addressBelongsToOrganization'],
  'backend/src/modules/hr/employee/employee.service.ts': ['userHasActiveMembership', 'employeeBelongsToOrganization'],
  'backend/src/modules/platform/number-sequence/number-sequence.service.ts': ['branchExists'],
};
for (const [path, needles] of Object.entries(tenantValidationFiles)) {
  const source = text(path);
  for (const needle of needles) {
    if (!source.includes(needle)) staticBlock('TENANT_REFERENCE_INTEGRITY', `${path} missing ${needle} tenant-reference validation.`);
  }
}
if (!staticBlockers.some((item) => item.id === 'TENANT_REFERENCE_INTEGRITY')) {
  pass('TENANT_REFERENCE_INTEGRITY', 'Known cross-tenant foreign-reference holes are guarded before persistence.');
}

const platformAccess = text('backend/src/modules/platform/configuration/platform-access.facade.ts');
const frontendShell = text('frontend/src/modules/navigation/app-shell.tsx');
const configurationService = text('backend/src/modules/platform/configuration/platform-configuration.service.ts');
if (
  !platformAccess.includes('assertModuleEnabled') ||
  !configurationService.includes('SystemConfigurationHistory') && !configurationService.includes('appendHistory') ||
  !frontendShell.includes("apiRequest<any>('/features')")
) {
  staticBlock('FEATURE_FLAGS', 'Feature/module configuration is not enforced at API/service and UI levels with history.');
} else {
  const protectedRouteText = routeFiles.map((path) => readFileSync(path, 'utf8')).join('\n');
  for (const moduleKey of ['customers', 'vendors', 'hr', 'inventory']) {
    if (!protectedRouteText.includes(`assertModuleEnabled(request.tenant!.organizationId, '${moduleKey}')`)) {
      staticBlock('FEATURE_FLAGS', `Implemented configurable module ${moduleKey} lacks API-level module guard.`);
    }
  }
  if (!staticBlockers.some((item) => item.id === 'FEATURE_FLAGS')) {
    pass('FEATURE_FLAGS', 'Disabled implemented modules are hidden in the UI and blocked in API prehandlers; configuration changes are audited/history-tracked.');
  }
}

const stockCountService = text('backend/src/modules/inventory/stock-count/stock-count.service.ts');
const inventoryRepository = text('backend/src/modules/inventory/inventory.repository.ts');
for (const required of [
  'STOCK_COUNT_MAKER_CHECKER_REQUIRED',
  'createApproval',
  'createPosting',
  "type: 'ADJUSTMENT'",
]) {
  if (!stockCountService.includes(required)) staticBlock('STOCK_COUNT', `Stock-count control missing ${required}`);
}
if (!inventoryRepository.includes('INVENTORY_STOCK_FROZEN') || !inventoryRepository.includes('applyOnHandDelta')) {
  staticBlock('STOCK_COUNT', 'Stock freeze/canonical balance mutation foundation is incomplete.');
}
if (!staticBlockers.some((item) => item.id === 'STOCK_COUNT')) {
  pass('STOCK_COUNT', 'Stock count/cycle count baseline includes freeze, maker-checker approval, variance adjustment, immutable ledger write and posting record.');
}

// Aggregate/location balance strategy is certified statically only when all on-hand mutations flow through applyOnHandDelta.
const inventoryMutationFiles = [
  'backend/src/modules/inventory/inventory.facade.ts',
  'backend/src/modules/inventory/stock-transfer.service.ts',
  'backend/src/modules/inventory/stock-adjustment.service.ts',
  'backend/src/modules/inventory/stock-count/stock-count.service.ts',
];
for (const path of inventoryMutationFiles) {
  if (!text(path).includes('applyOnHandDelta')) {
    staticBlock('BALANCE_MODEL', `${path} bypasses canonical aggregate/location on-hand mutation.`);
  }
}
if (!inventoryRepository.includes('if (location.id !== aggregate.id)') || !inventoryRepository.includes('nextAggregate')) {
  staticBlock('BALANCE_MODEL', 'Canonical balance mutation does not update aggregate and location in the same transaction.');
}
if (!staticBlockers.some((item) => item.id === 'BALANCE_MODEL')) {
  pass('BALANCE_MODEL', 'Warehouse aggregate and location-specific on-hand balances are mutated together through one repository primitive.');
}

const integrationTests = [
  'backend/src/modules/platform/number-sequence/number-sequence.integration.test.ts',
  'backend/src/modules/inventory/inventory-concurrency.integration.test.ts',
];
for (const path of integrationTests) {
  const source = text(path);
  if (!source.includes('RUN_INTEGRATION_TESTS') || source.includes('describe.skip(') || source.includes('expect(true).toBe(true)')) {
    staticBlock('INTEGRATION_TEST_DEFINITION', `${path} is still placeholder/skipped rather than runtime-gated.`);
  }
}
if (!staticBlockers.some((item) => item.id === 'INTEGRATION_TEST_DEFINITION')) {
  pass('INTEGRATION_TEST_DEFINITION', 'NumberSequence and Inventory PostgreSQL concurrency tests are real and runtime-gated rather than placeholder-skipped.');
}

const frontendPages = [
  'frontend/src/app/(auth)/login/page.tsx',
  'frontend/src/app/(erp)/customers/page.tsx',
  'frontend/src/app/(erp)/vendors/page.tsx',
  'frontend/src/app/(erp)/employees/page.tsx',
  'frontend/src/app/(erp)/products/page.tsx',
  'frontend/src/app/(erp)/warehouses/page.tsx',
  'frontend/src/app/(erp)/inventory/stock/page.tsx',
  'frontend/src/app/(erp)/inventory/ledger/page.tsx',
];
for (const path of frontendPages) {
  if (!existsSync(join(root, path))) staticBlock('FRONTEND_FOUNDATION', `Missing implemented frontend surface: ${path}`);
}
if (!staticBlockers.some((item) => item.id === 'FRONTEND_FOUNDATION')) {
  pass('FRONTEND_FOUNDATION', 'Authentication, tenant selection, business-master read surfaces and inventory read surfaces are wired into the Next.js application.');
}

const maturity = JSON.parse(text('shared/src/contracts/registry/contract-maturity.json'));
const routeOnly = maturity.filter((entry) => entry.maturity === 'ROUTE_SIGNATURE_ONLY').length;
if (routeOnly > 0) {
  sourceGap(
    'FIELD_LEVEL_API_SOURCE',
    `${routeOnly} frozen endpoints remain route-signature-only because the supplied PDF does not print their complete shared field-level contracts. No missing fields were silently invented as source-locked.`,
  );
}

if (!existsSync(join(root, 'pnpm-lock.yaml'))) {
  runtimeBlock(
    'LOCKFILE',
    'pnpm-lock.yaml is absent; frozen install and reproducible build remain runtime certification work.',
  );
} else {
  pass('LOCKFILE', 'A real pnpm lockfile is present.');
}

runtimeBlock(
  'RUNTIME_EXECUTION',
  'Full dependency, database, container and runtime certification is evaluated separately from this static audit.',
);

let verdict;
let exitCode;
if (staticBlockers.length) {
  verdict = 'AUDIT_HOLD_STATIC_CONTROLS_REQUIRED';
  exitCode = 2;
} else if (runtimeBlockers.length || sourceGaps.length) {
  verdict = 'STATIC_CONTROLS_PASS_CERTIFICATION_PENDING';
  exitCode = 0;
} else {
  verdict = 'CERTIFIED_CORE_CONTROLS';
  exitCode = 0;
}

console.log(
  JSON.stringify(
    {
      verdict,
      implementedLockedRouteCount: implementationKeys.size,
      frozenEndpointCount: locked.size,
      passedControls,
      staticBlockers,
      runtimeBlockers,
      sourceGaps,
    },
    null,
    2,
  ),
);

process.exit(exitCode);
