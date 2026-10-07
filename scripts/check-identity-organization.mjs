import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const lock = JSON.parse(
  readFileSync(join(root, 'docs/contracts/capability-locks/identity-organization.json'), 'utf8'),
);
const failures = [];

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

for (const script of [
  'scripts/check-dependency-foundation.mjs',
  'scripts/check-contracts.mjs',
  'scripts/check-contract-coverage.mjs',
  'scripts/check-database-foundation.mjs',
  'scripts/check-database-runtime-foundation.mjs',
]) {
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const requiredFiles = [
  'backend/src/modules/identity/identity.routes.ts',
  'backend/src/modules/identity/identity.controller.ts',
  'backend/src/modules/identity/identity.repository.ts',
  'backend/src/modules/identity/authentication.service.ts',
  'backend/src/modules/identity/session.service.ts',
  'backend/src/modules/identity/tenant-resolution.service.ts',
  'backend/src/modules/identity/authorization.service.ts',
  'backend/src/modules/identity/role.service.ts',
  'backend/src/modules/identity/identity.facade.ts',
  'backend/src/modules/organization/organization.routes.ts',
  'backend/src/modules/organization/organization.controller.ts',
  'backend/src/modules/organization/organization.service.ts',
  'backend/src/modules/organization/organization.repository.ts',
  'backend/src/core/security/password-hasher.ts',
  'backend/src/core/security/token.service.ts',
  'backend/src/core/security/refresh-token.ts',
  'backend/src/core/security/totp.service.ts',
  'backend/src/core/security/rate-limiter.ts',
  'backend/src/core/security/maker-checker.policy.ts',
  'database/prisma/migrations/20260901000200_pass4_mfa_recovery_codes/migration.sql',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) failures.push(`Missing identity/organization file: ${path}`);
}

const identityRoutes = read('backend/src/modules/identity/identity.routes.ts');
const organizationRoutes = read('backend/src/modules/organization/organization.routes.ts');
const routeText = `${identityRoutes}\n${organizationRoutes}`;

for (const route of lock.implementedLockedRoutes) {
  const signature = `defineLockedRoute('${route.method}', '${route.path}')`;
  if (!routeText.includes(signature)) failures.push(`Missing locked route registration: ${route.method} ${route.path}`);
}

const tokenService = read('backend/src/core/security/token.service.ts');
if (tokenService.includes('permissionKeys') || tokenService.includes('permissions:')) {
  failures.push('Access token service must not embed authoritative permission lists.');
}
if (!tokenService.includes("typ: 'access'") || !tokenService.includes('sid: claims.sessionId')) {
  failures.push('Access token must carry identity/session reference.');
}

const tenantResolution = read('backend/src/modules/identity/tenant-resolution.service.ts');
if (!tenantResolution.includes('getMembershipAuthorization')) failures.push('Tenant selection is not verified against membership.');
if (!tenantResolution.includes('TENANT_CONTEXT_REQUIRED')) failures.push('Multiple memberships do not require explicit tenant selection.');

const authRepo = read('backend/src/modules/identity/identity.repository.ts');
if (!authRepo.includes("status: 'ACTIVE'")) failures.push('Tenant authorization does not require an active membership.');

const organizationRepo = read('backend/src/modules/organization/organization.repository.ts');
for (const expected of ['organizationId: input.organizationId', 'organizationId,', 'branchScopeId']) {
  if (!organizationRepo.includes(expected)) failures.push(`Organization repository scope invariant missing: ${expected}`);
}

const orgRoutes = organizationRoutes;
for (const permission of [
  'branch.view',
  'branch.create',
  'branch.update',
  'department.view',
  'department.create',
  'department.update',
]) {
  if (!orgRoutes.includes(`protectedBy('${permission}')`)) failures.push(`Missing endpoint permission guard: ${permission}`);
}

const password = read('backend/src/core/security/password-hasher.ts');
if (!password.includes("from 'bcryptjs'")) failures.push('Password hashing is not bcrypt/Argon2.');

const refresh = read('backend/src/core/security/refresh-token.ts');
if (!refresh.includes("createHash('sha256')") || !refresh.includes('randomBytes(32)')) {
  failures.push('Refresh session secret is not randomly generated and hashed.');
}

const totp = read('backend/src/core/security/totp.service.ts');
if (!totp.includes("createHmac('sha1'") || !totp.includes("'aes-256-gcm'")) {
  failures.push('TOTP verification/encrypted secret implementation missing.');
}

const mfaMigration = read('database/prisma/migrations/20260901000200_pass4_mfa_recovery_codes/migration.sql');
if (!mfaMigration.includes('"codeHash" TEXT NOT NULL')) failures.push('Recovery codes are not stored hashed.');

const rateLimiter = read('backend/src/core/security/rate-limiter.ts');
if (!rateLimiter.includes("from 'ioredis'") || !rateLimiter.includes("redis.call('INCR'")) {
  failures.push('Auth rate limiting does not use Redis state.');
}

const sessions = read('backend/src/modules/identity/session.service.ts');
if (!sessions.includes('IDENTITY_SESSION_REVOKED') || !sessions.includes('IDENTITY_ALL_SESSIONS_REVOKED')) {
  failures.push('Session changes do not emit business audit records.');
}

const roles = read('backend/src/modules/identity/role.service.ts');
if (!roles.includes('IDENTITY_ROLE_PERMISSIONS_CHANGED') || !roles.includes('IDENTITY_ROLE_ASSIGNED')) {
  failures.push('Role/permission changes do not emit audit records.');
}

const makerChecker = read('backend/src/core/security/maker-checker.policy.ts');
if (!makerChecker.includes('MAKER_CHECKER_VIOLATION')) failures.push('Maker-checker baseline is missing.');

const controller = read('backend/src/modules/identity/identity.controller.ts');
for (const cookieFlag of ['httpOnly: true', "sameSite: 'strict'", "secure: this.env.NODE_ENV === 'production'"]) {
  if (!controller.includes(cookieFlag)) failures.push(`Refresh cookie security flag missing: ${cookieFlag}`);
}

const platform = read('backend/src/modules/platform/platform.module.ts');
if (platform.includes("prefix: '/health'")) failures.push('Health route double-prefix regression remains.');

const app = read('backend/src/app.ts');
if (!app.includes("from '@fastify/cookie'")) failures.push('Cookie plugin is not registered.');
if (!app.includes('createIdentityModule') || !app.includes('createOrganizationModule')) failures.push('Identity/organization modules are not composed into the app.');

const backendPackage = JSON.parse(read('backend/package.json'));
for (const dep of ['@nexora/database', '@fastify/cookie', 'bcryptjs', 'ioredis', 'jose']) {
  if (!backendPackage.dependencies?.[dep]) failures.push(`Backend dependency missing: ${dep}`);
}

if (failures.length) {
  console.error('Identity/organization gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Identity/organization gate PASSED: ${lock.implementedLockedRouteCount} locked Identity/Organization routes implemented.`);
