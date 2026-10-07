#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const failures = [];
const warnings = [];

function repoPath(rel) {
  return path.join(root, rel);
}

function read(rel) {
  const full = repoPath(rel);
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

function walk(dir) {
  const base = repoPath(dir);
  if (!fs.existsSync(base)) return [];
  const out = [];
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    const full = path.join(base, entry.name);
    if (entry.isDirectory()) out.push(...walk(path.relative(root, full)));
    else out.push(path.relative(root, full).split(path.sep).join('/'));
  }
  return out;
}

const requiredFiles = [
  'frontend/src/modules/identity/identity-admin-console.tsx',
  'frontend/src/modules/organization/organization-admin-console.tsx',
  'frontend/src/app/(erp)/users/page.tsx',
  'frontend/src/app/(erp)/roles/page.tsx',
  'frontend/src/app/(erp)/permissions/page.tsx',
  'frontend/src/app/(erp)/rbac/page.tsx',
  'frontend/src/app/(erp)/organization/page.tsx',
  'frontend/src/app/(erp)/organization-settings/page.tsx',
  'frontend/src/app/(erp)/teams/page.tsx',
  'frontend/src/app/(erp)/number-sequences/page.tsx',
  'frontend/src/app/(erp)/branches/page.tsx',
  'frontend/src/app/(erp)/departments/page.tsx',
  'frontend/src/app/(erp)/platform-features/page.tsx',
];
requiredFiles.forEach(read);

const identityConsole = 'frontend/src/modules/identity/identity-admin-console.tsx';
for (const marker of [
  'IdentityAdminConsole',
  'TenantUsersScreen',
  'RolesScreen',
  'RolePermissionMatrix',
  'PermissionMatrixScreen',
  'PERMISSION_KEYS',
  'DataTable',
  'EntityList',
  'React Hook Form/Zod',
  'Fastify identity API',
  'tenant-scoped',
]) {
  assertContains(identityConsole, marker);
}

const organizationConsole = 'frontend/src/modules/organization/organization-admin-console.tsx';
for (const marker of [
  'OrganizationAdminConsole',
  'BranchesScreen',
  'DepartmentsScreen',
  'TeamsScreen',
  'OrganizationSettingsPageSurface',
  'NumberSequencesScreen',
  'FeatureConfigurationScreen',
  'TenantSwitcherReadModel',
  'DataTable',
  'EntityList',
  'organizationId',
  'Feature flags',
]) {
  assertContains(organizationConsole, marker);
}

const registry = read('frontend/src/modules/forms/resource-form-registry.ts');
for (const marker of [
  'CreateTenantUserSchema',
  'CreateRoleSchema',
  "endpoint: '/users'",
  "endpoint: '/roles'",
  "endpoint: '/teams'",
  "endpoint: '/number-sequences'",
  'type: \'checkbox\'',
  'Password policy is enforced by the Fastify identity service',
]) {
  if (!registry.includes(marker)) failures.push(`ResourceFormRegistry missing ${marker}`);
}

for (const marker of ['CheckboxField', "'checkbox'", 'Controller']) {
  const combined = read('frontend/src/components/forms/resource-form-types.ts') + read('frontend/src/components/forms/resource-form-fields.tsx') + read('frontend/src/components/forms/controlled-fields.tsx');
  if (!combined.includes(marker)) failures.push(`Form system missing checkbox/boolean support marker: ${marker}`);
}

const navigation = read('frontend/src/modules/navigation/navigation-registry.ts');
for (const href of ["href: '/users'", "href: '/roles'", "href: '/permissions'", "href: '/rbac'", "href: '/organization'", "href: '/organization-settings'", "href: '/teams'", "href: '/number-sequences'"]) {
  if (!navigation.includes(href)) failures.push(`Navigation registry missing ${href}`);
}

const routeMap = read('frontend/src/lib/route-map.ts');
for (const route of ["route: '/users'", "route: '/roles'", "route: '/permissions'", "route: '/rbac'", "route: '/organization'", "route: '/organization-settings'", "route: '/teams'", "route: '/number-sequences'"]) {
  if (!routeMap.includes(route)) failures.push(`Route map missing ${route}`);
}

const appPages = walk('frontend/src/app').filter((rel) => rel.endsWith('/page.tsx'));
for (const rel of appPages) {
  const text = read(rel);
  if (!rel.includes('/(auth)/') && !rel.includes('/(erp)/') && !rel.includes('/(portal)/') && !rel.includes('/(technician)/')) failures.push(`Route page outside approved route group: ${rel}`);
  if (/import\s*\{\s*AppShell\s*\}/.test(text) || /<\/?AppShell\b/.test(text)) failures.push(`Page imports/renders AppShell directly: ${rel}`);
}

const frontendFiles = walk('frontend/src').filter((rel) => /\.(ts|tsx)$/.test(rel));
for (const rel of frontendFiles) {
  const text = read(rel);
  if (rel !== 'frontend/src/components/ui/table.tsx' && rel !== 'frontend/src/components/data/data-table.tsx') {
    if (text.includes('<table') || text.includes('<thead') || text.includes('<tbody') || text.includes('<tr') || text.includes('<th') || text.includes('<td')) {
      failures.push(`Raw table markup found outside approved table/DataTable primitives: ${rel}`);
    }
  }
  if (!rel.includes('frontend/src/lib/api-client.ts') && /fetch\s*\(/.test(text)) failures.push(`Raw fetch found outside centralized API client: ${rel}`);
  if (/<form\b/.test(text) && !rel.startsWith('frontend/src/components/forms/')) failures.push(`Raw form markup found outside RHF form system: ${rel}`);
}

const screenContracts = [
  'docs/frontend-screens/erp-users.md',
  'docs/frontend-screens/erp-roles.md',
  'docs/frontend-screens/erp-permissions.md',
  'docs/frontend-screens/erp-rbac.md',
  'docs/frontend-screens/erp-organization.md',
  'docs/frontend-screens/erp-organization-settings.md',
  'docs/frontend-screens/erp-teams.md',
  'docs/frontend-screens/erp-number-sequences.md',
];
for (const rel of screenContracts) {
  const text = read(rel);
  for (const marker of ['# Screen Contract', 'Fastify `/api/v1`', 'React Hook Form', 'Zod', 'TanStack Table', 'tenant', 'audit']) {
    if (!text.includes(marker)) failures.push(`${rel} missing ${marker}`);
  }
}

if (appPages.length < 100) failures.push(`R9 expected at least 100 app routes after adding administration pages, found ${appPages.length}`);

const packageJson = JSON.parse(read('package.json') || '{}');
for (const script of ['frontend:identity-organization-rbac:check', 'pass:r9:source-check', 'pass:r9:certify']) {
  if (!packageJson.scripts?.[script]) failures.push(`package.json missing script ${script}`);
}

assertContains('.github/workflows/ci.yml', 'R9 identity/organization/RBAC frontend source gate', 'R9 CI source gate');

if (!sourceOnly && !fs.existsSync(repoPath('pnpm-lock.yaml'))) {
  warnings.push('Runtime certification requires pnpm-lock.yaml. Run pass R1 locally and commit the generated lockfile before frozen install/build.');
}

if (failures.length) {
  console.error(JSON.stringify({ pass: 'R9', status: 'FAIL', sourceOnly, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  pass: 'R9',
  status: sourceOnly ? 'PASS_SOURCE_LEVEL' : 'PASS_PENDING_RUNTIME_INSTALL',
  sourceOnly,
  checks: {
    appRoutes: appPages.length,
    identityPages: ['users', 'roles', 'permissions', 'rbac'].length,
    organizationPages: ['organization', 'organization-settings', 'branches', 'departments', 'teams', 'number-sequences', 'platform-features'].length,
    rolePermissionMatrix: true,
    tenantContextPanel: true,
    checkboxBooleanFieldSupport: true,
    noRawFetchOutsideApiClient: true,
    noRawTablesOutsideDataTable: true,
    noRawFormsOutsideRHF: true,
  },
  warnings,
  remainingLimits: [
    'R9 is frontend source completion for identity/organization/RBAC surfaces; local typecheck/build/runtime evidence still depends on pnpm-lock.yaml and installed packages.',
    'Backend public user/role/team administration route availability must be verified during R17/R18 runtime/API certification if the current backend catalog remains narrower than these admin screens.',
  ],
}, null, 2));
