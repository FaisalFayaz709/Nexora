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
function contains(path, needles) {
  const text = read(path);
  return needles.every((needle) => text.includes(needle));
}
function endpointExists(endpoints, method, endpoint) {
  return endpoints.some((item) => item.method === method && item.endpoint === endpoint);
}
function writeEvidence(status, message, extra = {}) {
  const outDir = pathOf('certification-output');
  mkdirSync(outDir, { recursive: true });
  const payload = {
    pass: 'PASS_03',
    name: 'Core platform, authentication, RBAC, tenant isolation and organization completion',
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
      'pnpm pass:03:check',
      'pnpm test -- --runInBand identity organization auth rbac tenant',
      'pnpm db:migrate:deploy',
      'pnpm db:seed',
    ],
    ...extra,
  };
  writeFileSync(join(outDir, 'pass-03-core-platform-security.json'), `${JSON.stringify(payload, null, 2)}\n`);
}
function runScript(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: root, stdio: 'pipe', encoding: 'utf8' });
  return { ok: result.status === 0, status: result.status, stdout: result.stdout, stderr: result.stderr };
}

const requiredFiles = [
  'backend/src/modules/identity/identity.routes.ts',
  'backend/src/modules/identity/identity.controller.ts',
  'backend/src/modules/identity/authentication.service.ts',
  'backend/src/modules/identity/session.service.ts',
  'backend/src/modules/identity/tenant-resolution.service.ts',
  'backend/src/modules/identity/authorization.service.ts',
  'backend/src/modules/identity/user-management.service.ts',
  'backend/src/modules/identity/role.service.ts',
  'backend/src/modules/identity/mfa-enrollment.service.ts',
  'backend/src/modules/identity/password-reset.service.ts',
  'backend/src/modules/identity/identity.repository.ts',
  'backend/src/modules/organization/organization.routes.ts',
  'backend/src/modules/organization/organization.controller.ts',
  'backend/src/modules/organization/organization.service.ts',
  'backend/src/modules/organization/organization.repository.ts',
  'backend/src/core/security/password-hasher.ts',
  'backend/src/core/security/password-policy.ts',
  'backend/src/core/security/rate-limiter.ts',
  'backend/src/core/security/token.service.ts',
  'backend/src/core/security/totp.service.ts',
  'backend/src/core/security/refresh-token.ts',
  'backend/src/core/audit/audit-writer.ts',
  'shared/src/contracts/identity/admin.contracts.ts',
  'shared/src/contracts/auth/login.contract.ts',
  'shared/src/contracts/auth/me.contract.ts',
  'shared/src/contracts/auth/session.contracts.ts',
  'docs/contracts/capability-locks/identity-organization.json',
  'database/prisma/seed/permissions.seed.json',
  'database/prisma/seed/baseline.seed.json',
  'frontend/src/app/(erp)/users/page.tsx',
  'frontend/src/app/(erp)/roles/page.tsx',
  'frontend/src/app/(erp)/permissions/page.tsx',
  'frontend/src/app/(erp)/rbac/page.tsx',
  'frontend/src/app/(erp)/auth/sessions/page.tsx',
];
for (const file of requiredFiles) check(`required file exists: ${file}`, hasFile(file), `Missing required PASS 03 file: ${file}`);

const endpoints = readJson('shared/src/contracts/registry/locked-endpoints.json');
const requiredEndpoints = [
  ['POST', '/api/v1/auth/login'],
  ['POST', '/api/v1/auth/mfa/verify'],
  ['POST', '/api/v1/auth/refresh'],
  ['POST', '/api/v1/auth/logout'],
  ['POST', '/api/v1/auth/logout-all'],
  ['GET', '/api/v1/auth/me'],
  ['GET', '/api/v1/auth/sessions'],
  ['DELETE', '/api/v1/auth/sessions/:sessionId'],
  ['GET', '/api/v1/users'],
  ['GET', '/api/v1/users/:id'],
  ['POST', '/api/v1/users'],
  ['PATCH', '/api/v1/users/:id'],
  ['GET', '/api/v1/roles'],
  ['POST', '/api/v1/roles'],
  ['PATCH', '/api/v1/roles/:id'],
  ['PUT', '/api/v1/roles/:id/permissions'],
  ['POST', '/api/v1/users/roles'],
  ['GET', '/api/v1/permissions'],
  ['GET', '/api/v1/branches'],
  ['GET', '/api/v1/branches/:id'],
  ['POST', '/api/v1/branches'],
  ['PATCH', '/api/v1/branches/:id'],
  ['GET', '/api/v1/departments'],
  ['GET', '/api/v1/departments/:id'],
  ['POST', '/api/v1/departments'],
  ['PATCH', '/api/v1/departments/:id'],
];
for (const [method, endpoint] of requiredEndpoints) {
  check(`locked endpoint exists: ${method} ${endpoint}`, endpointExists(endpoints, method, endpoint), `Missing locked endpoint: ${method} ${endpoint}`);
}

const identityRoutes = read('backend/src/modules/identity/identity.routes.ts');
const organizationRoutes = read('backend/src/modules/organization/organization.routes.ts');
for (const [method, endpoint] of requiredEndpoints.filter(([, endpoint]) => endpoint.includes('/auth/') || endpoint.includes('/users') || endpoint.includes('/roles') || endpoint.includes('/permissions'))) {
  check(`identity route registered: ${method} ${endpoint}`, identityRoutes.includes(`defineLockedRoute('${method}', '${endpoint}')`), `Identity route missing defineLockedRoute for ${method} ${endpoint}`);
}
for (const permission of ['identity.user.view', 'identity.user.manage', 'identity.role.manage']) {
  check(`identity admin permission guard: ${permission}`, identityRoutes.includes(`protectedBy('${permission}')`), `Missing Identity permission guard ${permission}`);
}
for (const permission of ['branch.view', 'branch.create', 'branch.update', 'department.view', 'department.create', 'department.update']) {
  check(`organization permission guard: ${permission}`, organizationRoutes.includes(`protectedBy('${permission}')`), `Missing Organization permission guard ${permission}`);
}
check('identity admin routes resolve tenant context', identityRoutes.includes('facade.resolveTenantRequest.bind(facade)'), 'Identity admin routes must resolve tenant context before authorization.');
check('identity admin routes authenticate first', identityRoutes.includes('facade.authenticateRequest.bind(facade)'), 'Identity admin routes must authenticate before tenant/permission checks.');
check('identity admin routes authorize through facade', identityRoutes.includes('facade.assertPermission(request, permission)'), 'Identity admin routes must authorize through IdentityFacade.');

const controller = read('backend/src/modules/identity/identity.controller.ts');
for (const schema of ['CreateTenantUserSchema', 'UpdateTenantUserStatusSchema', 'CreateRoleSchema', 'UpdateRoleSchema', 'ReplaceRolePermissionsSchema', 'AssignRoleSchema', 'TenantUserListQuerySchema']) {
  check(`identity controller uses shared schema: ${schema}`, controller.includes(schema), `Identity controller must parse ${schema}.`);
}
check('identity controller has no Prisma direct access', !/\bprisma\b|@nexora\/database/.test(controller), 'Identity controller must not import/use Prisma or database directly.');
check('refresh cookie is HttpOnly', controller.includes('httpOnly: true'), 'Refresh cookie must be HttpOnly.');
check('refresh cookie SameSite strict', controller.includes("sameSite: 'strict'"), 'Refresh cookie must use SameSite=strict.');
check('refresh cookie production secure', controller.includes("secure: this.env.NODE_ENV === 'production'"), 'Refresh cookie must be secure in production.');

const authService = read('backend/src/modules/identity/authentication.service.ts');
for (const needle of ['loginRateLimit', 'loginLockoutThreshold', 'MFA_REQUIRED', 'recordLoginFailure', 'markLoginSuccess']) {
  check(`authentication control present: ${needle}`, authService.includes(needle), `Authentication service missing ${needle}.`);
}
const tenantService = read('backend/src/modules/identity/tenant-resolution.service.ts');
check('tenant context requires membership authorization', tenantService.includes('getMembershipAuthorization'), 'Tenant resolution must verify active membership authorization.');
check('tenant context rejects ambiguous/missing org', tenantService.includes('TENANT_CONTEXT_REQUIRED'), 'Tenant resolution must require explicit tenant when needed.');
check('tenant context not taken from body', !/request\.body.*organizationId|organizationId.*request\.body/.test(`${identityRoutes}\n${controller}\n${tenantService}`), 'Tenant context must not be trusted from request body.');
const authorization = read('backend/src/modules/identity/authorization.service.ts');
check('authorization checks permission keys', authorization.includes('permissionKeys') && authorization.includes('AUTH_PERMISSION_DENIED'), 'Authorization service must check canonical permission keys.');
check('authorization exposes role ids for maker-checker/context', authorization.includes('roleIds'), 'Authorization service must expose role IDs for role-scoped decisions.');

const userService = read('backend/src/modules/identity/user-management.service.ts');
for (const needle of ['withTransaction', 'AuditWriter', 'IDENTITY_USER_CREATED', 'IDENTITY_USER_STATUS_CHANGED', 'branchBelongsToOrganization', 'roleBelongsToOrganization']) {
  check(`user management invariant: ${needle}`, userService.includes(needle), `User management service missing ${needle}.`);
}
const roleService = read('backend/src/modules/identity/role.service.ts');
for (const needle of ['withTransaction', 'AuditWriter', 'IDENTITY_ROLE_CREATED', 'IDENTITY_ROLE_MFA_REQUIREMENT_CHANGED', 'IDENTITY_ROLE_PERMISSIONS_CHANGED', 'IDENTITY_ROLE_ASSIGNED', 'roleBelongsToOrganization', 'membershipBelongsToOrganization']) {
  check(`role management invariant: ${needle}`, roleService.includes(needle), `Role service missing ${needle}.`);
}
const repo = read('backend/src/modules/identity/identity.repository.ts');
for (const method of ['listTenantUsers', 'getTenantUser', 'createTenantUser', 'setTenantUserStatus', 'listRoles', 'createRole', 'replaceRolePermissions', 'assignRole', 'listPermissions']) {
  check(`identity repository method exists: ${method}`, repo.includes(method), `Identity repository missing ${method}.`);
}
check('repository active membership gate present', repo.includes("status: 'ACTIVE'") && repo.includes('organizationId'), 'Repository must enforce active organization membership and organization scope.');

const app = read('backend/src/app.ts');
check('identity module registered into Fastify app', app.includes('createIdentityModule') && app.includes('identity.plugin'), 'Identity module must be registered in app.');
check('organization module registered into Fastify app', app.includes('createOrganizationModule') && app.includes('organization.plugin'), 'Organization module must be registered in app.');
check('cookie plugin registered for sessions', app.includes("from '@fastify/cookie'") && app.includes('app.register(cookie)'), 'Cookie plugin must be registered.');

const adminContracts = read('shared/src/contracts/identity/admin.contracts.ts');
for (const schema of ['TenantUserListQuerySchema', 'CreateTenantUserSchema', 'UpdateTenantUserStatusSchema', 'CreateRoleSchema', 'UpdateRoleSchema', 'ReplaceRolePermissionsSchema', 'AssignRoleSchema']) {
  check(`shared identity admin contract exported: ${schema}`, adminContracts.includes(`export const ${schema}`), `Shared identity contract missing ${schema}.`);
}
check('shared identity admin contracts use canonical permission schema', adminContracts.includes('PermissionKeySchema'), 'Identity role contracts must use canonical shared permission keys.');

const permissions = readJson('database/prisma/seed/permissions.seed.json');
for (const key of ['identity.user.view', 'identity.user.manage', 'identity.role.manage', 'branch.view', 'branch.create', 'branch.update', 'department.view', 'department.create', 'department.update']) {
  check(`permission seeded: ${key}`, permissions.some((item) => item.key === key), `Missing permission seed ${key}.`);
}
const baseline = readJson('database/prisma/seed/baseline.seed.json');
const baselineText = JSON.stringify(baseline);
for (const needle of ['Super Administrator', 'Read Only Auditor', 'admin@nexora.local', 'auditor@nexora.local']) {
  check(`baseline seed includes ${needle}`, baselineText.includes(needle), `Baseline seed missing ${needle}.`);
}

const frontendIdentityApi = read('frontend/src/modules/identity/api.ts');
for (const endpoint of ['users', 'roles', 'permissions', 'sessions']) {
  check(`frontend identity api exposes ${endpoint}`, frontendIdentityApi.includes(endpoint), `Frontend identity API missing ${endpoint}.`);
}
const routeGroup = read('frontend/src/app/(erp)/layout.tsx');
const appShells = read('frontend/src/components/app/shells.tsx');
check('ERP route group uses shell/guards', routeGroup.includes('ErpRouteShell') && appShells.includes('AppShell') && appShells.includes('AuthGuard') && appShells.includes('TenantGuard'), 'ERP route group must wrap authenticated pages with ErpRouteShell -> AppShell/AuthGuard/TenantGuard.');

const lock = readJson('docs/contracts/capability-locks/identity-organization.json');
check('identity capability lock count includes PASS 03 routes', lock.implementedLockedRouteCount >= 26, 'Identity/organization capability lock must include PASS 03 admin routes.');

for (const [name, script] of [
  ['architecture gate', 'scripts/check-architecture.mjs'],
  ['contract gate', 'scripts/check-contracts.mjs'],
  ['identity organization gate', 'scripts/check-identity-organization.mjs'],
]) {
  const result = runScript(script);
  check(`${name} passes`, result.ok, `${name} failed.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
}

if (!sourceOnly) {
  const lockfile = hasFile('pnpm-lock.yaml');
  check('pnpm-lock.yaml exists for strict runtime', lockfile, 'Strict PASS 03 requires pnpm-lock.yaml generated by PASS 00.', { blocker: true });
  if (lockfile) {
    const install = spawnSync('pnpm', ['install', '--frozen-lockfile'], { cwd: root, stdio: 'pipe', encoding: 'utf8' });
    check('pnpm install --frozen-lockfile succeeds', install.status === 0, `Frozen install failed.\nSTDOUT:\n${install.stdout}\nSTDERR:\n${install.stderr}`, { blocker: true });
    const typecheck = spawnSync('pnpm', ['typecheck'], { cwd: root, stdio: 'pipe', encoding: 'utf8' });
    check('pnpm typecheck succeeds', typecheck.status === 0, `Typecheck failed.\nSTDOUT:\n${typecheck.stdout}\nSTDERR:\n${typecheck.stderr}`, { blocker: true });
  }
}

const status = blockers.length ? 'HOLD_RUNTIME_BLOCKED' : failures.length ? 'FAIL' : sourceOnly ? 'PASS_SOURCE_LEVEL' : 'PASS_RUNTIME_READY';
const message = blockers.length
  ? 'PASS 03 source checks ran, but runtime proof is blocked until PASS 00 lockfile/install is completed.'
  : failures.length
    ? 'PASS 03 source checks failed.'
    : sourceOnly
      ? 'PASS 03 source-level core platform checks passed. Runtime proof remains pending on a connected developer machine.'
      : 'PASS 03 strict runtime checks passed.';
writeEvidence(status, message, {
  endpointCatalogCount: endpoints.length,
  identityOrganizationRouteCount: lock.implementedLockedRouteCount,
  permissionSeedCount: permissions.length,
});

if (failures.length || blockers.length) {
  console.error(`PASS 03 ${status}`);
  for (const failure of [...blockers, ...failures]) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS 03 ${status}: core platform, auth, RBAC, tenant isolation and organization source gates passed.`);
if (warnings.length) for (const warning of warnings) console.warn(`warning: ${warning}`);
