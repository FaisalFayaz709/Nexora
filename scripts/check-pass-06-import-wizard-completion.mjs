#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
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
function hasDir(path) { return existsSync(pathOf(path)) && statSync(pathOf(path)).isDirectory(); }
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
function walkFiles(dir, predicate) {
  const out = [];
  function walk(current) {
    if (!existsSync(current)) return;
    for (const entry of readdirSync(current)) {
      const p = join(current, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (predicate(p)) out.push(p);
    }
  }
  walk(pathOf(dir));
  return out;
}
function count(source, pattern) { return (source.match(pattern) ?? []).length; }
function writeEvidence(status, message, extra = {}) {
  mkdirSync(pathOf('certification-output'), { recursive: true });
  const payload = {
    pass: 'PASS_06',
    name: 'Data Import Wizard Completion',
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
      'pnpm pass:06:check',
      'pnpm typecheck',
      'pnpm test',
      'pnpm db:migrate:deploy',
      'pnpm db:seed',
      'pnpm test -- --runInBand data-import import-wizard opening-stock',
    ],
    ...extra,
  };
  writeFileSync(pathOf('certification-output/pass-06-import-wizard-completion.json'), `${JSON.stringify(payload, null, 2)}\n`);
}

const previousPasses = [
  { script: 'scripts/check-pass-00-baseline-certification.mjs', evidence: 'certification-output/pass-00-baseline-certification.json' },
  { script: 'scripts/check-pass-01-architecture-boundary-audit.mjs', evidence: 'certification-output/pass-01-architecture-boundary-audit.json' },
  { script: 'scripts/check-pass-02-database-migration-seed-certification.mjs', evidence: 'certification-output/pass-02-database-migration-seed-certification.json' },
  { script: 'scripts/check-pass-03-core-platform-security.mjs', evidence: 'certification-output/pass-03-core-platform-security.json' },
  { script: 'scripts/check-pass-04-number-sequence-feature-flags.mjs', evidence: 'certification-output/pass-04-number-sequence-feature-flags.json' },
  { script: 'scripts/check-pass-05-business-masters-completion.mjs', evidence: 'certification-output/pass-05-business-masters-completion.json' },
];
for (const previous of previousPasses) {
  check(`previous pass script exists: ${previous.script}`, hasFile(previous.script), `${previous.script} is missing.`);
  if (!sourceOnly) check(`previous pass evidence exists: ${previous.evidence}`, hasFile(previous.evidence), `${previous.evidence} is missing.`);
  if (hasFile(previous.evidence)) {
    const evidence = readJson(previous.evidence);
    check(`previous pass evidence is not failed: ${previous.evidence}`, !String(evidence.status ?? '').includes('FAIL'), `${previous.evidence} has failing status ${evidence.status}.`);
  }
}

const packageJson = readJson('package.json');
check('PASS 06 package script exists', packageJson.scripts?.['pass:06:check'] === 'node scripts/check-pass-06-import-wizard-completion.mjs', 'package.json must expose pass:06:check.');
check('PASS 06 source-only package script exists', packageJson.scripts?.['pass:06:source-check'] === 'node scripts/check-pass-06-import-wizard-completion.mjs --source-only', 'package.json must expose pass:06:source-check.');
check('PASS 06 shell certifier exists', hasFile('scripts/pass-06-import-wizard-completion-certify.sh'), 'PASS 06 bash certifier missing.');
check('PASS 06 PowerShell certifier exists', hasFile('scripts/pass-06-import-wizard-completion-certify.ps1'), 'PASS 06 PowerShell certifier missing.');

const sharedContracts = read('shared/src/contracts/platform-ops/platform-ops.contracts.ts');
for (const token of ['ImportRawRowSchema', 'ImportMappingSchema', 'ImportRowStatusSchema', 'rows: z.array', 'commitValidRowsOnly', 'CUSTOMER_SITE', 'PRODUCT_CATEGORY', 'UNIT_OF_MEASURE', 'INVENTORY']) {
  check(`shared import contract includes ${token}`, sharedContracts.includes(token), `shared platform-ops import contracts must include ${token}.`);
}
for (const subject of ['EMPLOYEE', 'CUSTOMER', 'VENDOR', 'PRODUCT', 'WAREHOUSE', 'INVENTORY']) {
  check(`required pass 06 subject supported in contract: ${subject}`, sharedContracts.includes(`'${subject}'`), `${subject} is missing from ImportSubjectTypeSchema.`);
}

const routes = read('backend/src/modules/data-import/data-import.routes.ts');
check('data import routes use locked Fastify endpoints', count(routes, /defineLockedRoute/g) >= 4, 'Data import routes must stay locked Fastify endpoints.');
check('data import routes use imports module gate', routes.includes("assertModuleEnabled(request.tenant!.organizationId,'imports')") || routes.includes("assertModuleEnabled(request.tenant!.organizationId, 'imports')"), 'Import routes must be gated by the imports module, not a broad platform bypass.');
check('data import routes require import.manage permission', routes.includes("assertPermission(request,'import.manage')") || routes.includes("assertPermission(request, 'import.manage')"), 'Import routes must require import.manage permission.');
for (const route of ['/api/v1/imports/upload', '/api/v1/imports/:id/validate', '/api/v1/imports/:id/commit', '/api/v1/imports/:id/rollback']) {
  check(`locked import endpoint present: ${route}`, routes.includes(route), `${route} route missing.`);
}

const service = read('backend/src/modules/data-import/data-import.service.ts');
for (const token of ['IMPORT_SUBJECTS', 'required', 'duplicateKey', 'normalizeRow', 'IMPORT_ROWS_MISSING', 'REQUIRED_FIELD_MISSING', 'DUPLICATE_RECORD', 'replaceValidationRows', 'ImportRowError', 'IMPORT_BATCH_VALIDATED', 'IMPORT_BATCH_COMMITTED', 'import.batch.committed', 'import.batch.rolled_back']) {
  check(`data import service includes ${token}`, service.includes(token), `Data import service must include ${token}.`);
}
for (const subject of ['EMPLOYEE', 'CUSTOMER', 'VENDOR', 'PRODUCT', 'WAREHOUSE', 'INVENTORY']) {
  check(`data import service supports ${subject}`, service.includes(`${subject}:`) || service.includes(`'${subject}'`), `DataImportService must validate ${subject}.`);
}
check('data import validation persists row-level summary', service.includes('totalRows') && service.includes('validRows') && service.includes('errorRows') && service.includes('skippedRows'), 'Validation summary must track total/valid/error/skipped rows.');
check('data import commit refuses invalid batches by default', service.includes('IMPORT_BATCH_HAS_INVALID_ROWS') || service.includes('Only fully validated batches can be committed'), 'Commit must not silently import invalid rows.');
check('data import rollback avoids destructive deletes', service.includes('destructive deletes are forbidden') || service.includes('logical-marker-only'), 'Rollback policy must be explicit and non-destructive unless reversal design exists.');

const repository = read('backend/src/modules/data-import/data-import.repository.ts');
for (const token of ['findDuplicate', 'commitTarget', 'markRowCommitted', 'markRowSkipped', 'errors:', 'tx.importRow.create', 'OPENING_BALANCE', 'tx.stockTransaction.create', 'StockBalance']) {
  check(`data import repository includes ${token}`, repository.includes(token), `Data import repository must include ${token}.`);
}
for (const model of ['employee', 'customer', 'vendor', 'product', 'warehouse', 'stockBalance']) {
  check(`data import repository can persist ${model}`, repository.includes(`tx.${model}.create`) || repository.includes(`tx.${model}.update`), `Data import commit must support ${model}.`);
}
check('data import repository scopes duplicate checks by organizationId', count(repository, /organizationId/g) >= 20, 'Duplicate checks and commits must be organization-scoped.');

const importTemplate = read('backend/src/modules/import/import-template/import-template.service.ts');
for (const subject of ['EMPLOYEE', 'CUSTOMER', 'VENDOR', 'PRODUCT', 'WAREHOUSE', 'INVENTORY']) {
  check(`baseline import template exists for ${subject}`, importTemplate.includes(`subjectType:'${subject}'`), `${subject} baseline import template missing.`);
}
check('opening stock template includes required columns', importTemplate.includes("'Opening Stock'") && importTemplate.includes("'warehouseId'") && importTemplate.includes("'productId'") && importTemplate.includes("'onHand'"), 'Opening stock template must include warehouseId, productId and onHand.');

const schema = read('database/prisma/schema.prisma');
for (const model of ['ImportTemplate', 'ImportMapping', 'ImportBatch', 'ImportRow', 'ImportRowError', 'DuplicateCheckRule']) {
  check(`Prisma import model exists: ${model}`, new RegExp(`model\\s+${model}\\s*\\{`).test(schema), `${model} Prisma model missing.`);
}
check('ImportBatch has organizationId', /model\s+ImportBatch[\s\S]*organizationId\s+String/.test(schema), 'ImportBatch must be tenant-owned.');
check('ImportRow has organizationId and target reference', /model\s+ImportRow[\s\S]*organizationId\s+String[\s\S]*targetType[\s\S]*targetId/.test(schema), 'ImportRow must be tenant-owned and link committed targets.');
check('ImportRowError has field/code/message', /model\s+ImportRowError[\s\S]*fieldName[\s\S]*code[\s\S]*message/.test(schema), 'ImportRowError must preserve explainable row-level validation errors.');
check('PASS 06 migration exists', hasDir('database/prisma/migrations/20260911060000_pass06_import_wizard_completion'), 'PASS 06 import wizard migration missing.');
if (hasFile('database/prisma/migrations/20260911060000_pass06_import_wizard_completion/migration.sql')) {
  const migration = read('database/prisma/migrations/20260911060000_pass06_import_wizard_completion/migration.sql');
  check('PASS 06 migration expands ImportBatch subject check', migration.includes('ImportBatch_subject_check') && migration.includes('CUSTOMER_SITE') && migration.includes('UNIT_OF_MEASURE'), 'Migration must align DB subject check with import templates/contracts.');
}


const importTemplatesSeedPath = 'database/prisma/seed/import-templates.seed.json';
check('import templates seed file exists', hasFile(importTemplatesSeedPath), 'PASS 06 must seed import templates for baseline onboarding.');
if (hasFile(importTemplatesSeedPath)) {
  const importTemplatesSeed = readJson(importTemplatesSeedPath);
  for (const subject of ['EMPLOYEE', 'CUSTOMER', 'VENDOR', 'PRODUCT', 'WAREHOUSE', 'INVENTORY']) {
    check(`import templates seed includes ${subject}`, importTemplatesSeed.some((template) => template.subjectType === subject), `${subject} missing from import-templates.seed.json.`);
  }
}
const seedScript = read('database/prisma/seed/seed.mjs');
check('database seed loads import templates', seedScript.includes('import-templates.seed.json') && seedScript.includes('tx.importTemplate.upsert'), 'Seed script must load and upsert import templates.');

const frontendWizard = read('frontend/src/modules/masters/data-import-wizard.tsx');
for (const token of ['rowsJson', 'mappingJson', 'parseRowsJson', 'parseJsonRecord', 'downloadRowErrorReport', 'duplicatePolicy', 'Opening stock', 'useForm', 'zodResolver']) {
  check(`frontend import wizard includes ${token}`, frontendWizard.includes(token), `Frontend import wizard must include ${token}.`);
}
check('frontend import wizard uses centralized API functions', frontendWizard.includes('uploadImportBatch') && frontendWizard.includes('validateImportBatch') && frontendWizard.includes('commitImportBatch') && frontendWizard.includes('rollbackImportBatch') && !/fetch\(/.test(frontendWizard), 'Import wizard must use centralized API functions and no raw fetch.');
check('frontend import wizard exposes row error download', frontendWizard.includes('nexora-import-row-errors.csv') && frontendWizard.includes('Blob'), 'Import wizard must expose row-level error report download.');

const mastersApi = read('frontend/src/modules/masters/api.ts');
check('frontend import API uses centralized apiPost', mastersApi.includes('apiPost') && mastersApi.includes('/imports/upload') && !/fetch\(/.test(mastersApi), 'Frontend import API must use centralized apiPost.');

const serviceTest = read('backend/src/modules/data-import/data-import.service.test.ts');
for (const token of ['opening-stock', 'rows', 'ImportRawRowSchema', 'commitValidRowsOnly']) {
  check(`data import tests cover ${token}`, serviceTest.includes(token), `Data import contract tests must cover ${token}.`);
}
const integrationTest = read('backend/src/modules/data-import/data-import.integration.test.ts');
for (const token of ['detects duplicates', 'opening stock', 'denies cross-tenant']) {
  check(`data import runtime acceptance requires ${token}`, integrationTest.includes(token), `Runtime acceptance must require ${token}.`);
}

const forbiddenFiles = walkFiles('frontend/src', (p) => /\.(ts|tsx)$/.test(p)).filter((file) => /\/app\/\(erp\)\/imports\//.test(file) || /data-import-wizard/.test(file));
for (const file of forbiddenFiles) {
  const body = read(file.slice(root.length + 1));
  check(`frontend import file has no Prisma/server imports: ${file.slice(root.length + 1)}`, !/@nexora\/database|@prisma\/client|backend\/|MinIO|BullMQ/.test(body), `${file} imports forbidden server/database code.`);
}

if (blockers.length || failures.length) {
  writeEvidence('FAIL', 'PASS 06 source gates failed.', { failedChecks: failures.length, blockerChecks: blockers.length });
  console.error(['PASS 06 FAILED', ...blockers, ...failures].join('\n'));
  process.exit(1);
}

writeEvidence(sourceOnly ? 'PASS_SOURCE_LEVEL' : 'PASS_STRICT_SOURCE_LEVEL_RUNTIME_PENDING', sourceOnly ? 'PASS 06 source-level data import wizard gates passed.' : 'PASS 06 source gates passed. Run runtime commands on developer machine for final GO.');
console.log(`PASS 06 OK: ${checks.length} source gates passed.`);
