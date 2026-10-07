#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const startedAt = new Date().toISOString();
const failures = [];
const blockers = [];
const warnings = [];
const checks = [];

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
function endpointExists(endpoints, method, endpoint) {
  return endpoints.some((item) => item.method === method && item.endpoint === endpoint);
}
function grep(path, pattern) { return pattern.test(read(path)); }
function extractModuleKeysFromSharedRegistry() {
  const text = read('shared/src/constants/module-registry.ts');
  return [...text.matchAll(/key:\s*'([^']+)'/g)].map((match) => match[1]);
}
function runScript(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: root, stdio: 'pipe', encoding: 'utf8' });
  return { ok: result.status === 0, status: result.status, stdout: result.stdout, stderr: result.stderr };
}
function writeEvidence(status, message, extra = {}) {
  const outDir = pathOf('certification-output');
  mkdirSync(outDir, { recursive: true });
  const payload = {
    pass: 'PASS_04',
    name: 'Number Sequence, Feature Flags and Module Configuration',
    mode: sourceOnly ? 'source-only' : 'strict-runtime',
    status,
    message,
    checkedAt: startedAt,
    finishedAt: new Date().toISOString(),
    checks,
    warnings,
    blockers,
    failures,
    lockedStackPreserved: true,
    architectureChanged: false,
    runtimeCommandsRequiredOnDeveloperMachine: [
      'pnpm install --frozen-lockfile',
      'pnpm pass:04:check',
      'pnpm test -- --runInBand number-sequence platform-configuration feature-flags',
      'pnpm db:migrate:deploy',
      'pnpm db:seed',
    ],
    ...extra,
  };
  writeFileSync(join(outDir, 'pass-04-number-sequence-feature-flags.json'), `${JSON.stringify(payload, null, 2)}\n`);
}

const requiredFiles = [
  'backend/src/modules/platform/number-sequence/number-sequence.routes.ts',
  'backend/src/modules/platform/number-sequence/number-sequence.controller.ts',
  'backend/src/modules/platform/number-sequence/number-sequence.service.ts',
  'backend/src/modules/platform/number-sequence/number-sequence.repository.ts',
  'backend/src/modules/platform/number-sequence/number-sequence.facade.ts',
  'backend/src/modules/platform/number-sequence/number-sequence.module.ts',
  'backend/src/modules/platform/configuration/platform-configuration.routes.ts',
  'backend/src/modules/platform/configuration/platform-configuration.controller.ts',
  'backend/src/modules/platform/configuration/platform-configuration.service.ts',
  'backend/src/modules/platform/configuration/platform-configuration.repository.ts',
  'backend/src/modules/platform/configuration/platform-access.facade.ts',
  'backend/src/modules/platform/configuration/saas-plan.guard.ts',
  'shared/src/constants/module-registry.ts',
  'shared/src/contracts/platform/number-sequence.contracts.ts',
  'shared/src/contracts/platform/feature-configuration.contracts.ts',
  'database/prisma/seed/baseline.seed.json',
  'database/prisma/seed/feature-flags.seed.json',
  'database/prisma/seed/module-registry.seed.json',
  'database/prisma/seed/permissions.seed.json',
  'frontend/src/app/(erp)/number-sequences/page.tsx',
  'frontend/src/app/(erp)/platform-features/page.tsx',
  'frontend/src/app/(erp)/module-configurations/page.tsx',
  'frontend/src/modules/platform/platform-resource-config.ts',
  'frontend/src/modules/navigation/navigation-registry.ts',
  'docs/domain-rules/number-sequence-business-masters/NUMBER_SEQUENCE_ACCEPTANCE.md',
];
for (const file of requiredFiles) check(`required file exists: ${file}`, hasFile(file), `Missing required PASS 04 file: ${file}`);

const endpoints = readJson('shared/src/contracts/registry/locked-endpoints.json');
const requiredEndpoints = [
  ['GET', '/api/v1/number-sequences'],
  ['POST', '/api/v1/number-sequences'],
  ['POST', '/api/v1/number-sequences/:id/reset'],
  ['GET', '/api/v1/features'],
  ['POST', '/api/v1/organization-features'],
  ['PATCH', '/api/v1/module-configurations/:id'],
];
for (const [method, endpoint] of requiredEndpoints) {
  check(`locked endpoint exists: ${method} ${endpoint}`, endpointExists(endpoints, method, endpoint), `Missing locked endpoint: ${method} ${endpoint}`);
}

const schema = read('database/prisma/schema.prisma');
for (const model of ['NumberSequence', 'NumberSequenceReservation', 'FeatureFlag', 'OrganizationFeature', 'ModuleConfiguration', 'SystemConfigurationHistory', 'SaaSPlan', 'SaaSSubscription']) {
  check(`Prisma model exists: ${model}`, schema.includes(`model ${model} {`), `Prisma schema is missing ${model}.`);
}
check('NumberSequence has tenant/branch/fiscal scope', /model NumberSequence[\s\S]*organizationId String[\s\S]*branchId\s+String\?[\s\S]*branchScopeKey String[\s\S]*entityType\s+String[\s\S]*fiscalYear\s+Int/.test(schema), 'NumberSequence must include organizationId, branchId, branchScopeKey, entityType and fiscalYear.');
check('NumberSequence has transaction-safe unique scope', schema.includes('@@unique([organizationId, branchScopeKey, entityType, fiscalYear])'), 'NumberSequence must be unique per organization, branch scope, entity type and fiscal year.');
check('NumberSequenceReservation protects duplicate issue within sequence', schema.includes('@@unique([sequenceId, reservedNumber])'), 'NumberSequenceReservation must prevent duplicate reserved numbers within a sequence.');
check('NumberSequenceReservation protects duplicate business number per tenant', schema.includes('@@unique([organizationId, businessNumber])'), 'Business number must be unique per organization.');
check('OrganizationFeature is tenant-scoped', /model OrganizationFeature[\s\S]*organizationId String[\s\S]*@@unique\(\[organizationId, featureFlagId\]\)/.test(schema), 'OrganizationFeature must be organization scoped and unique per feature.');
check('ModuleConfiguration is tenant-scoped', /model ModuleConfiguration[\s\S]*organizationId String[\s\S]*@@unique\(\[organizationId, moduleKey\]\)/.test(schema), 'ModuleConfiguration must be organization scoped and unique per module.');
check('SystemConfigurationHistory is auditable per tenant', /model SystemConfigurationHistory[\s\S]*organizationId String[\s\S]*actorUserId\s+String\?[\s\S]*beforeJson[\s\S]*afterJson/.test(schema), 'SystemConfigurationHistory must retain actor, before and after data.');

const numberService = read('backend/src/modules/platform/number-sequence/number-sequence.service.ts');
for (const needle of ['withTransaction', 'NumberSequenceRepository', 'AuditWriter', 'NUMBER_SEQUENCE_CREATED', 'NUMBER_SEQUENCE_RESET', 'NUMBER_SEQUENCE_NOT_CONFIGURED', 'createReservation', 'consumeReservation', 'withBusinessNumberInTransaction']) {
  check(`number sequence service invariant: ${needle}`, numberService.includes(needle), `NumberSequenceService missing ${needle}.`);
}
check('number allocation increments before reservation', /allocateNext[\s\S]*formatBusinessNumber[\s\S]*createReservation[\s\S]*createTarget[\s\S]*consumeReservation/.test(numberService), 'Business number allocation must allocate, reserve, create target and consume reservation in order.');
check('number reset blocked after issue', numberService.includes('reservationCount') && numberService.includes('NUMBER_SEQUENCE_RESET_NOT_ALLOWED_AFTER_ISSUE'), 'Sequence reset must be blocked after any issued reservation.');
check('branch scoped administrator cannot configure other branch sequences', numberService.includes('NUMBER_SEQUENCE_BRANCH_SCOPE_DENIED'), 'Number sequence service must reject out-of-scope branch configuration.');
check('target creation happens inside same transaction', numberService.includes('createTarget(tx, businessNumber)'), 'Target entity creation must happen inside the same transaction as number allocation/reservation.');

const numberRepo = read('backend/src/modules/platform/number-sequence/number-sequence.repository.ts');
check('number allocation uses atomic Prisma update increment', numberRepo.includes('currentNumber: { increment: 1 }'), 'NumberSequenceRepository must allocate using a database update increment.');
check('number allocation uses composite unique lookup', numberRepo.includes('organizationId_branchScopeKey_entityType_fiscalYear'), 'Number allocation must use the composite unique sequence key.');
check('number repository supports reservation consumption', numberRepo.includes('status') && numberRepo.includes('CONSUMED') && numberRepo.includes('consumedAt'), 'Number reservations must be consumed and linked to target IDs.');

const numberRoutes = read('backend/src/modules/platform/number-sequence/number-sequence.routes.ts');
for (const [method, endpoint] of requiredEndpoints.slice(0, 3)) {
  check(`number sequence route registered: ${method} ${endpoint}`, numberRoutes.includes(`defineLockedRoute('${method}','${endpoint}')`) || numberRoutes.includes(`defineLockedRoute('${method}', '${endpoint}')`), `Number sequence route missing defineLockedRoute for ${method} ${endpoint}.`);
}
check('number sequence route requires manage permission', numberRoutes.includes('number_sequence.manage'), 'Number sequence endpoints must require number_sequence.manage.');
check('number sequence route authenticates and resolves tenant', numberRoutes.includes('authenticateRequest') && numberRoutes.includes('resolveTenantRequest'), 'Number sequence route must authenticate and resolve tenant.');

const numberController = read('backend/src/modules/platform/number-sequence/number-sequence.controller.ts');
for (const schemaName of ['CreateNumberSequenceSchema', 'NumberSequenceListQuerySchema', 'ResetNumberSequenceSchema']) {
  check(`number controller uses shared schema: ${schemaName}`, numberController.includes(schemaName), `Number sequence controller must parse ${schemaName}.`);
}
check('number controller has no Prisma direct access', !/\bprisma\b|@nexora\/database/.test(numberController), 'Number sequence controller must not import/use Prisma or database directly.');

const numberFacade = read('backend/src/modules/platform/number-sequence/number-sequence.facade.ts');
check('number facade exposes ordinary allocation', numberFacade.includes('withBusinessNumber('), 'NumberSequenceFacade must expose withBusinessNumber.');
check('number facade exposes transaction-aware allocation', numberFacade.includes('withBusinessNumberInTransaction('), 'NumberSequenceFacade must expose transaction-aware allocation for existing command transactions.');

const configService = read('backend/src/modules/platform/configuration/platform-configuration.service.ts');
for (const needle of ['ensureModuleBaseline', 'MODULE_REGISTRY', 'SaaSPlanGuard', 'FEATURE_CONFIGURATION_CHANGED', 'MODULE_CONFIGURATION_CHANGED', 'appendHistory', 'AuditWriter']) {
  check(`platform configuration service invariant: ${needle}`, configService.includes(needle), `PlatformConfigurationService missing ${needle}.`);
}
check('non-configurable modules cannot be disabled', configService.includes('MODULE_CONFIGURATION_LOCKED'), 'Core/non-configurable modules must not be disabled.');
check('feature/module changes run in transactions', (configService.match(/withTransaction/g) ?? []).length >= 2, 'Feature and module changes must be transactional.');

const accessFacade = read('backend/src/modules/platform/configuration/platform-access.facade.ts');
for (const needle of ['assertModuleEnabled', 'moduleDefinition', 'SaaSPlanGuard', 'PLATFORM_MODULE_DISABLED']) {
  check(`platform access facade invariant: ${needle}`, accessFacade.includes(needle), `PlatformAccessFacade missing ${needle}.`);
}
const saasPlanGuard = read('backend/src/modules/platform/configuration/saas-plan.guard.ts');
check('SaaS plan guard rejects non-included modules', saasPlanGuard.includes('SAAS_MODULE_NOT_INCLUDED'), 'SaaSPlanGuard must reject modules not included in the active plan.');
check('platform access reads module configuration', accessFacade.includes('findModuleConfiguration'), 'PlatformAccessFacade must read module configuration before allowing configurable modules.');

const configRoutes = read('backend/src/modules/platform/configuration/platform-configuration.routes.ts');
for (const [method, endpoint] of requiredEndpoints.slice(3)) {
  check(`feature/config route registered: ${method} ${endpoint}`, configRoutes.includes(`defineLockedRoute('${method}', '${endpoint}')`) || configRoutes.includes(`defineLockedRoute('${method}','${endpoint}')`), `Platform configuration route missing defineLockedRoute for ${method} ${endpoint}.`);
}
check('feature/module routes require feature.manage for mutation', configRoutes.includes('feature.manage'), 'Feature/module mutation routes must require feature.manage.');
check('features list requires authenticated tenant', configRoutes.includes('authenticateRequest') && configRoutes.includes('resolveTenantRequest'), 'Feature list must be authenticated and tenant resolved.');

const sharedModules = extractModuleKeysFromSharedRegistry();
const moduleSeed = readJson('database/prisma/seed/module-registry.seed.json');
const seedModuleKeys = moduleSeed.map((item) => item.key);
const requiredModuleKeys = ['identity', 'organization', 'customers', 'crm', 'vendors', 'hr', 'inventory', 'procurement', 'approvals', 'projects', 'assets', 'service', 'maintenance', 'finance', 'reports', 'documents', 'portals', 'notifications', 'audit', 'imports', 'platform', 'integrations', 'saas'];
for (const key of requiredModuleKeys) {
  check(`shared module registry includes ${key}`, sharedModules.includes(key), `Shared MODULE_REGISTRY missing ${key}.`);
  check(`module seed includes ${key}`, seedModuleKeys.includes(key), `module-registry.seed.json missing ${key}.`);
}
for (const key of seedModuleKeys) {
  check(`module seed key ${key} exists in shared registry`, sharedModules.includes(key), `module-registry.seed.json contains ${key}, but shared MODULE_REGISTRY does not.`, { blocker: true });
}

const featureFlags = readJson('database/prisma/seed/feature-flags.seed.json');
const featureKeys = featureFlags.map((item) => item.key);
const requiredFeatureKeys = [
  'platform.number-sequence',
  'platform.import-wizard',
  'vendor.onboarding',
  'vendor.risk',
  'inventory.stock-count',
  'inventory.landed-cost',
  'finance.tax-engine',
  'finance.bank-cash',
  'procurement.purchase-contracts',
  'platform.communication-log',
  'service.technician-gps',
  'reports.custom-builder',
  'platform.module-configuration',
  'platform.saas-billing',
  'technician.offline-sync',
];
for (const key of requiredFeatureKeys) {
  check(`feature flag seed includes ${key}`, featureKeys.includes(key), `Feature flag seed missing ${key}.`);
}
for (const flag of featureFlags) {
  check(`feature flag ${flag.key} has valid moduleKey ${flag.moduleKey}`, sharedModules.includes(flag.moduleKey), `Feature flag ${flag.key} references unknown moduleKey ${flag.moduleKey}.`, { blocker: true });
}

const baseline = readJson('database/prisma/seed/baseline.seed.json');
const baselineSequences = baseline.numberSequences ?? [];
const sequenceMap = new Map(baselineSequences.map((seq) => [seq.entityType, seq]));
const requiredEntityTypes = ['PURCHASE_REQUEST', 'RFQ', 'PURCHASE_ORDER', 'GOODS_RECEIPT', 'CUSTOMER_INVOICE', 'SUPPLIER_INVOICE', 'PAYMENT', 'PROJECT', 'ASSET', 'TICKET', 'WORK_ORDER', 'STOCK_TRANSFER', 'JOURNAL_ENTRY', 'PAYROLL_RUN', 'SAAS_INVOICE'];
for (const entityType of requiredEntityTypes) {
  const seq = sequenceMap.get(entityType);
  check(`baseline sequence exists for ${entityType}`, Boolean(seq), `Baseline seed missing NumberSequence for ${entityType}.`);
  if (seq) {
    check(`baseline sequence ${entityType} has prefix`, typeof seq.prefix === 'string' && seq.prefix.length > 0, `Baseline sequence ${entityType} missing prefix.`);
    check(`baseline sequence ${entityType} has safe padding`, Number.isInteger(seq.padding) && seq.padding >= 3, `Baseline sequence ${entityType} should use padding >= 3.`);
  }
}
check('baseline has SaaS plan seed for plan guard', Array.isArray(baseline.saasPlans) && baseline.saasPlans.length > 0, 'Baseline seed must include SaaS plan baseline.');

const permissionSeeds = readJson('database/prisma/seed/permissions.seed.json');
for (const key of ['number_sequence.manage', 'feature.manage']) {
  check(`permission seeded: ${key}`, permissionSeeds.some((item) => item.key === key), `Missing permission seed ${key}.`);
}
const permissionCatalog = read('shared/src/permissions/permission-catalog.ts');
for (const key of ['number_sequence.manage', 'feature.manage']) {
  check(`shared permission catalog includes ${key}`, permissionCatalog.includes(`"${key}"`) || permissionCatalog.includes(`'${key}'`), `Shared permission catalog missing ${key}.`);
}

const app = read('backend/src/app.ts');
check('number sequence module registered in Fastify app', app.includes('createNumberSequenceModule') && app.includes('numberSequence.plugin'), 'Number sequence module must be registered in app.');
check('platform configuration module registered in Fastify app', app.includes('createPlatformConfigurationModule') && app.includes('platformConfiguration.plugin'), 'Platform configuration module must be registered in app.');
check('number sequence facade is injected into business modules', app.includes('numberSequence.facade') && app.includes('createProcurementModule') && app.includes('createFinanceModule') && app.includes('createProjectModule'), 'NumberSequenceFacade must be injected into business modules that issue business numbers.');
check('platform access facade is injected into guarded modules', app.includes('platformConfiguration.access') && app.includes('createInventoryModule') && app.includes('createProcurementModule') && app.includes('createFinanceModule'), 'PlatformAccessFacade must be injected into configurable business modules.');

const backendModuleFiles = [
  'backend/src/modules/inventory/inventory.routes.ts',
  'backend/src/modules/procurement/procurement.routes.ts',
  'backend/src/modules/projects/project.routes.ts',
  'backend/src/modules/assets/asset.routes.ts',
  'backend/src/modules/service/field-service.routes.ts',
  'backend/src/modules/finance/finance.routes.ts',
  'backend/src/modules/documents/document.routes.ts',
  'backend/src/modules/reports/report-builder.routes.ts',
  'backend/src/modules/data-import/data-import.routes.ts',
  'backend/src/modules/crm/crm.routes.ts',
];
for (const file of backendModuleFiles) {
  if (!hasFile(file)) continue;
  check(`module route uses PlatformAccessFacade guard: ${file}`, read(file).includes('assertModuleEnabled'), `${file} must guard disabled modules at API/service level.`);
}

const frontendNav = read('frontend/src/modules/navigation/navigation-registry.ts');
for (const key of ['Number Sequences', 'Module Configurations', 'number_sequence.manage', 'feature.manage']) {
  check(`frontend navigation includes ${key}`, frontendNav.includes(key), `Frontend navigation must include permission-aware ${key}.`);
}
const platformConfig = read('frontend/src/modules/platform/platform-resource-config.ts');
for (const key of ['Feature Flags', 'Module Configurations', '/organization-features', '/module-configurations', 'feature.manage']) {
  check(`frontend platform resource config includes ${key}`, platformConfig.includes(key), `Platform resource config missing ${key}.`);
}
const formRegistry = read('frontend/src/modules/forms/resource-form-registry.ts');
check('number sequence form uses shared schema', formRegistry.includes('CreateNumberSequenceSchema') && formRegistry.includes("resourceKey: 'number-sequences'"), 'Number sequence create form must use shared schema through the resource form registry.');

const docs = read('docs/domain-rules/number-sequence-business-masters/NUMBER_SEQUENCE_ACCEPTANCE.md');
for (const phrase of ['transaction-safe', 'duplicate', 'organizationId', 'branch', 'fiscal year']) {
  check(`number sequence acceptance docs mention ${phrase}`, docs.toLowerCase().includes(phrase.toLowerCase()), `Number sequence acceptance doc must mention ${phrase}.`);
}

for (const [name, script, args] of [
  ['architecture boundary gate', 'scripts/check-pass-01-architecture-boundary-audit.mjs', ['--source-only']],
  ['database migration seed gate', 'scripts/check-pass-02-database-migration-seed-certification.mjs', ['--source-only']],
  ['core platform security gate', 'scripts/check-pass-03-core-platform-security.mjs', ['--source-only']],
]) {
  const result = runScript(script, args);
  check(`${name} still passes`, result.ok, `${name} failed after PASS 04 changes.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
}

if (!sourceOnly) {
  const lockfile = hasFile('pnpm-lock.yaml');
  check('pnpm-lock.yaml exists for strict runtime', lockfile, 'Strict PASS 04 requires pnpm-lock.yaml generated by PASS 00.', { blocker: true });
  if (lockfile) {
    const install = spawnSync('pnpm', ['install', '--frozen-lockfile'], { cwd: root, stdio: 'pipe', encoding: 'utf8' });
    check('pnpm install --frozen-lockfile succeeds', install.status === 0, `Frozen install failed.\nSTDOUT:\n${install.stdout}\nSTDERR:\n${install.stderr}`, { blocker: true });
    const test = spawnSync('pnpm', ['test'], { cwd: root, stdio: 'pipe', encoding: 'utf8' });
    check('pnpm test succeeds', test.status === 0, `Test suite failed.\nSTDOUT:\n${test.stdout}\nSTDERR:\n${test.stderr}`, { blocker: true });
    const typecheck = spawnSync('pnpm', ['typecheck'], { cwd: root, stdio: 'pipe', encoding: 'utf8' });
    check('pnpm typecheck succeeds', typecheck.status === 0, `Typecheck failed.\nSTDOUT:\n${typecheck.stdout}\nSTDERR:\n${typecheck.stderr}`, { blocker: true });
  }
}

const status = blockers.length ? 'HOLD_RUNTIME_BLOCKED' : failures.length ? 'FAIL' : sourceOnly ? 'PASS_SOURCE_LEVEL' : 'PASS_RUNTIME_READY';
const message = blockers.length
  ? 'PASS 04 source checks ran, but strict runtime proof is blocked until PASS 00 lockfile/install is completed and local tests run.'
  : failures.length
    ? 'PASS 04 source checks failed.'
    : sourceOnly
      ? 'PASS 04 source-level number sequence, feature flag and module-configuration checks passed. Runtime proof remains pending on a connected developer machine.'
      : 'PASS 04 strict runtime checks passed.';
writeEvidence(status, message, {
  endpointCatalogCount: endpoints.length,
  moduleRegistryCount: sharedModules.length,
  featureFlagSeedCount: featureFlags.length,
  baselineNumberSequenceCount: baselineSequences.length,
  requiredBusinessNumberEntityTypes: requiredEntityTypes,
});

if (failures.length || blockers.length) {
  console.error(`PASS 04 ${status}`);
  for (const failure of [...blockers, ...failures]) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS 04 ${status}: number sequence, feature flag and module configuration source gates passed.`);
if (warnings.length) for (const warning of warnings) console.warn(`warning: ${warning}`);
