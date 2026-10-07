import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const lock = JSON.parse(readFileSync(join(root, 'docs/contracts/capability-locks/number-sequence-business-masters.json'), 'utf8'));
const failures = [];

for (const script of [
  'scripts/check-dependency-foundation.mjs',
  'scripts/check-contracts.mjs',
  'scripts/check-contract-coverage.mjs',
  'scripts/check-database-foundation.mjs',
  'scripts/check-database-runtime-foundation.mjs',
  'scripts/check-identity-organization.mjs',
]) {
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const schema = readFileSync(join(root, 'database/prisma/schema.prisma'), 'utf8');
for (const model of lock.newPhysicalModels) {
  if (!new RegExp(`model\\s+${model}\\s*\\{`).test(schema)) failures.push(`Missing business-master model: ${model}`);
}
if (/\bFloat\b/.test(schema)) failures.push('Float introduced despite locked database standards.');
for (const model of ['Employee','Customer','CustomerSite','Vendor','Product','Warehouse','ImportTemplate','NumberSequence','NumberSequenceReservation']) {
  const block = schema.match(new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
  if (!/\borganizationId\s+String\b/.test(block)) failures.push(`Tenant-owned model lacks organizationId: ${model}`);
}
for (const invariant of [
  '@@unique([organizationId, employeeNo])',
  '@@unique([organizationId, sku])',
  '@@unique([organizationId, subjectType, name])',
  '@@unique([organizationId, branchScopeKey, entityType, fiscalYear])',
  '@@unique([sequenceId, reservedNumber])',
  '@@unique([organizationId, businessNumber])',
]) {
  if (!schema.includes(invariant)) failures.push(`Missing uniqueness invariant: ${invariant}`);
}

const migration = readFileSync(join(root, 'database/prisma/migrations/20260901000300_pass5_number_sequence_business_masters/migration.sql'), 'utf8');
for (const needle of ['DECIMAL(18,2)', 'DECIMAL(18,4)', 'Department_managerEmployeeId_fkey', 'NumberSequence_scope_key']) {
  if (!migration.includes(needle)) failures.push(`Business-master migration missing ${needle}`);
}

const sequenceService = readFileSync(join(root, 'backend/src/modules/platform/number-sequence/number-sequence.service.ts'), 'utf8');
for (const needle of ['withTransaction(async(tx)', 'allocateNext', 'createReservation', 'createTarget(tx,businessNumber)', 'consumeReservation']) {
  if (!sequenceService.replaceAll(' ', '').includes(needle.replaceAll(' ', ''))) failures.push(`Number sequence atomic flow missing: ${needle}`);
}
if (sequenceService.includes('BullMQ')) failures.push('Number issuing must not use BullMQ.');
const sequenceRoutes = readFileSync(join(root, 'backend/src/modules/platform/number-sequence/number-sequence.routes.ts'), 'utf8');
if (!sequenceRoutes.includes("identity.assertPermission(request,'number_sequence.manage')") && !sequenceRoutes.includes("identity.assertPermission(request, 'number_sequence.manage')")) failures.push('Number sequence admin permission guard missing.');

const routeFiles = [];
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.routes.ts')) routeFiles.push(p);
  }
}
walk(join(root, 'backend/src/modules'));
const routeText = routeFiles.map((p) => readFileSync(p, 'utf8')).join('\n');
for (const route of lock.implementedRoutes) {
  const single = `defineLockedRoute('${route.method}','${route.path}')`;
  const spaced = `defineLockedRoute('${route.method}', '${route.path}')`;
  if (!routeText.includes(single) && !routeText.includes(spaced)) failures.push(`Missing locked route: ${route.method} ${route.path}`);
}
for (const forbidden of ['/api/v1/product-categories','/api/v1/units-of-measure','/api/v1/warehouse-locations','/api/v1/customer-contacts','/api/v1/vendor-contacts','/api/v1/site-buildings','/api/v1/site-areas']) {
  if (routeText.includes(forbidden)) failures.push(`Unapproved public endpoint invented: ${forbidden}`);
}

const importService = readFileSync(join(root, 'backend/src/modules/import/import-template/import-template.service.ts'), 'utf8');
for (const subject of lock.importTemplateSubjects) {
  if (!importService.includes(`subjectType:'${subject}'`) && !importService.includes(`subjectType: '${subject}'`)) failures.push(`Missing import template baseline: ${subject}`);
}

const customerService = readFileSync(join(root, 'backend/src/modules/customers/customer.service.ts'), 'utf8');
if (!customerService.includes('input.primaryContact') || !customerService.includes('withTransaction')) failures.push('Customer primary contact is not created atomically.');

const app = readFileSync(join(root, 'backend/src/app.ts'), 'utf8');
for (const factory of ['createNumberSequenceModule','createHrModule','createCustomersModule','createVendorsModule','createInventoryModule']) {
  if (!app.includes(factory)) failures.push(`App composition missing ${factory}`);
}

if (failures.length) {
  console.error('Business-master gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Business-master gate PASSED: ${lock.routeCount} locked routes, ${lock.newPhysicalModelCount} new physical models.`);
