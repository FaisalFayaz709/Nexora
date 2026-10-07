import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const schema = readFileSync(resolve(root, 'database/prisma/schema.prisma'), 'utf8');
const migration = readFileSync(resolve(root, 'database/prisma/migrations/20260901000100_pass3_database_foundation/migration.sql'), 'utf8');

const requiredModels = [
  'User','Session','MfaCredential','Permission','Role','RolePermission',
  'OrganizationMembership','UserRole','Organization','Branch','Department',
  'Team','Address','OrganizationSetting','AuditLog','BusinessEvent','IdempotencyKey'
];

test('required database-foundation physical models exist', () => {
  for (const model of requiredModels) {
    assert.match(schema, new RegExp(`model\\s+${model}\\s*\\{`));
  }
});

test('Float is absent', () => {
  assert.doesNotMatch(schema, /\bFloat\b/);
});

test('tenant-owned foundation models carry organizationId', () => {
  for (const model of [
    'Role','OrganizationMembership','Branch','Department','Team','Address',
    'OrganizationSetting','AuditLog','BusinessEvent','IdempotencyKey'
  ]) {
    const block = schema.match(new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
    assert.match(block, /\borganizationId\s+String\b/);
  }
});

test('tenant-local uniqueness includes organizationId', () => {
  assert.match(schema, /@@unique\(\[organizationId, code\]\)/);
  assert.match(schema, /@@unique\(\[organizationId, name\]\)/);
  assert.match(schema, /@@unique\(\[organizationId, key\]\)/);
  assert.match(schema, /@@unique\(\[organizationId, route, key\]\)/);
});

test('AuditLog is immutable at database level', () => {
  assert.match(migration, /CREATE TRIGGER "AuditLog_immutable"/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON "AuditLog"/);
});

test('managerEmployeeId FK is deferred until Employee exists', () => {
  assert.match(schema, /managerEmployeeId\s+String\?/);
  assert.doesNotMatch(migration, /Department_managerEmployeeId_fkey/);
});
