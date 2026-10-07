import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const lock = JSON.parse(readFileSync(join(root, 'docs/database/database-foundation-lock.json'), 'utf8'));
const schemaPath = join(root, 'database/prisma/schema.prisma');
const migrationPath = join(root, lock.initialMigration);
const seedPath = join(root, 'database/prisma/seed/permissions.seed.json');
const failures = [];

function hash(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

for (const path of [schemaPath, migrationPath, seedPath]) {
  if (!existsSync(path)) failures.push(`Missing database artifact: ${path}`);
}

if (existsSync(migrationPath) && hash(migrationPath) !== lock.initialMigrationSha256) {
  failures.push('Initial baseline migration was modified; add a new migration instead.');
}

const schema = readFileSync(schemaPath, 'utf8');
if (!schema.includes('provider = "postgresql"')) failures.push('Database provider must remain PostgreSQL.');
if (!schema.includes('provider = "prisma-client-js"')) failures.push('ORM client must remain Prisma.');
if (/\bFloat\b/.test(schema)) failures.push('Float is forbidden by NEXORA database standards.');

for (const model of lock.requiredModels) {
  if (!new RegExp(`model\\s+${model}\\s*\\{`).test(schema)) failures.push(`Missing required model: ${model}`);
}

for (const model of lock.tenantOwnedModels) {
  const match = schema.match(new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!match || !/\borganizationId\s+String\b/.test(match[1])) {
    failures.push(`Tenant-owned model lacks organizationId: ${model}`);
  }
}

for (const needle of [
  '@@unique([organizationId, code])',
  '@@unique([organizationId, name])',
  '@@unique([organizationId, key])',
  '@@unique([organizationId, route, key])',
  '@@index([organizationId, createdAt])'
]) {
  if (!schema.includes(needle)) failures.push(`Missing tenant/index invariant: ${needle}`);
}

const permissions = JSON.parse(readFileSync(seedPath, 'utf8'));
if (permissions.length !== lock.canonicalPermissionSeedCount) {
  failures.push(`Permission seed count ${permissions.length} != ${lock.canonicalPermissionSeedCount}`);
}
if (new Set(permissions.map((p) => p.key)).size !== permissions.length) {
  failures.push('Permission seed contains duplicate keys.');
}

const migration = readFileSync(migrationPath, 'utf8');
if (!migration.includes('CREATE TRIGGER "AuditLog_immutable"')) failures.push('AuditLog immutable trigger missing.');
if (!migration.includes('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')) failures.push('UUID generation setup missing.');
if (migration.includes('Department_managerEmployeeId_fkey')) failures.push('Employee FK added before Employee exists.');

if (failures.length) {
  console.error('Database foundation gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Database foundation gate PASSED: ${lock.requiredModels.length} base models, ${permissions.length} permission seeds.`);
