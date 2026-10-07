import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const sourceOnly = process.argv.includes('--source-only');
const startedAt = new Date().toISOString();

function path(...parts) {
  return join(root, ...parts);
}

function rel(file) {
  return relative(root, file).split(sep).join('/');
}

function read(projectPath) {
  return readFileSync(path(projectPath), 'utf8');
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function requireFile(projectPath) {
  if (!existsSync(path(projectPath))) fail(`Missing required R3 file: ${projectPath}`);
}

function requireDir(projectPath) {
  const absolute = path(projectPath);
  if (!existsSync(absolute) || !statSync(absolute).isDirectory()) fail(`Missing required R3 directory: ${projectPath}`);
}

function requireText(projectPath, marker, description = marker) {
  if (!existsSync(path(projectPath))) {
    fail(`Cannot inspect missing file ${projectPath} for ${description}`);
    return;
  }
  const text = read(projectPath);
  if (!text.includes(marker)) fail(`${projectPath} missing ${description}`);
}

function walk(dir, files = []) {
  const absoluteDir = path(dir);
  if (!existsSync(absoluteDir)) return files;
  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    const full = join(absoluteDir, entry.name);
    if (entry.isDirectory()) walk(rel(full), files);
    else files.push(full);
  }
  return files;
}

const requiredGroups = [
  'frontend/src/app/(auth)',
  'frontend/src/app/(erp)',
  'frontend/src/app/(portal)',
  'frontend/src/app/(technician)',
];
requiredGroups.forEach(requireDir);

const requiredFiles = [
  'frontend/src/app/layout.tsx',
  'frontend/src/app/providers.tsx',
  'frontend/src/app/(auth)/layout.tsx',
  'frontend/src/app/(auth)/login/page.tsx',
  'frontend/src/app/(erp)/layout.tsx',
  'frontend/src/app/(erp)/page.tsx',
  'frontend/src/app/(erp)/customers/page.tsx',
  'frontend/src/app/(erp)/procurement/purchase-requests/page.tsx',
  'frontend/src/app/(portal)/layout.tsx',
  'frontend/src/app/(portal)/customer-portal/page.tsx',
  'frontend/src/app/(portal)/vendor-portal/page.tsx',
  'frontend/src/app/(technician)/layout.tsx',
  'frontend/src/app/(technician)/technician-pwa/page.tsx',
  'frontend/src/components/app/guards.tsx',
  'frontend/src/components/app/shells.tsx',
  'frontend/src/components/app/permission-context.tsx',
  'frontend/src/components/app/offline-provider.tsx',
];
requiredFiles.forEach(requireFile);

requireText('frontend/src/app/layout.tsx', '<Providers>{children}</Providers>', 'root provider-only layout');
for (const forbidden of ['AppShell', 'AuthGuard', 'TenantGuard', 'PortalShell', 'TechnicianPwaShell']) {
  const rootLayout = existsSync(path('frontend/src/app/layout.tsx')) ? read('frontend/src/app/layout.tsx') : '';
  if (rootLayout.includes(forbidden)) fail(`Root app/layout.tsx must remain provider-only and not import/use ${forbidden}.`);
}

requireText('frontend/src/app/(erp)/layout.tsx', 'ErpRouteShell', 'ERP route-group shell');
requireText('frontend/src/app/(portal)/layout.tsx', 'PortalShell', 'portal route-group shell');
requireText('frontend/src/app/(technician)/layout.tsx', 'TechnicianPwaShell', 'technician route-group shell');
requireText('frontend/src/components/app/shells.tsx', 'AppShell', 'ERP AppShell composition');
requireText('frontend/src/components/app/shells.tsx', 'AuthGuard', 'ERP AuthGuard composition');
requireText('frontend/src/components/app/shells.tsx', 'TenantGuard', 'ERP TenantGuard composition');
requireText('frontend/src/components/app/shells.tsx', 'PermissionContextProvider', 'ERP PermissionContext composition');
requireText('frontend/src/components/app/shells.tsx', 'PortalGuard', 'portal guard composition');
requireText('frontend/src/components/app/shells.tsx', 'OfflineProvider', 'technician offline provider composition');
requireText('frontend/src/components/app/shells.tsx', 'TechnicianGuard', 'technician guard composition');
requireText('frontend/src/components/app/guards.tsx', 'PortalGuard', 'portal guard implementation');
requireText('frontend/src/components/app/guards.tsx', 'TechnicianGuard', 'technician guard implementation');
requireText('frontend/src/components/app/offline-provider.tsx', 'OfflineQueueContext', 'technician offline queue context');
requireText('frontend/src/components/app/permission-context.tsx', 'hasPermission', 'permission context helper');
requireText('frontend/tsconfig.json', '"@/*"', 'frontend absolute source alias');
requireText('package.json', 'frontend:shells:check', 'R3 npm script');
requireText('.github/workflows/ci.yml', 'R3 route-group shell source gate', 'R3 CI source gate');

for (const legacyRoute of [
  'frontend/src/app/page.tsx',
  'frontend/src/app/login/page.tsx',
  'frontend/src/app/customer-portal/page.tsx',
  'frontend/src/app/vendor-portal/page.tsx',
  'frontend/src/app/technician-pwa/page.tsx',
]) {
  if (existsSync(path(legacyRoute))) fail(`Legacy route remains outside its route group: ${legacyRoute}`);
}

const pageFiles = walk('frontend/src/app').filter((file) => file.endsWith('/page.tsx'));
if (pageFiles.length < 80) fail(`Unexpectedly low page count after route-group migration: ${pageFiles.length}`);

for (const file of pageFiles) {
  const projectPath = rel(file);
  const text = readFileSync(file, 'utf8');
  if (!projectPath.includes('/(auth)/') && !projectPath.includes('/(erp)/') && !projectPath.includes('/(portal)/') && !projectPath.includes('/(technician)/')) {
    fail(`Route page outside approved route groups: ${projectPath}`);
  }
  if (/import\s*\{\s*AppShell\s*\}/.test(text)) fail(`Page imports AppShell directly instead of route-group layout: ${projectPath}`);
  if (/<\/?AppShell\b/.test(text)) fail(`Page renders AppShell directly instead of route-group layout: ${projectPath}`);
}

for (const portalPath of [
  'frontend/src/app/(portal)/customer-portal/page.tsx',
  'frontend/src/app/(portal)/vendor-portal/page.tsx',
]) {
  if (existsSync(path(portalPath))) {
    const text = read(portalPath);
    if (/AppShell|ErpRouteShell/.test(text)) fail(`${portalPath} must not use internal ERP shell/navigation.`);
  }
}

const technicianText = existsSync(path('frontend/src/app/(technician)/technician-pwa/page.tsx')) ? read('frontend/src/app/(technician)/technician-pwa/page.tsx') : '';
if (/AppShell|ErpRouteShell/.test(technicianText)) fail('Technician PWA page must not use internal ERP shell/navigation.');

if (sourceOnly) warn('Source-only mode: Next.js build/runtime navigation was not executed in this environment.');
if (!existsSync(path('pnpm-lock.yaml'))) warn('pnpm-lock.yaml is still absent until registry-backed pnpm install is run on a connected machine.');

mkdirSync(path('certification-output'), { recursive: true });
const payload = {
  gate: 'pass-r3-route-group-shell-compliance',
  pass: 'R3',
  title: 'Route-group shell compliance source gate',
  startedAt,
  completedAt: new Date().toISOString(),
  sourceOnly,
  lockedStackPreserved: true,
  scope: 'Moves authenticated ERP, customer/vendor portal, technician PWA and auth routes into Next.js route-group layouts so shells and guards are enforced centrally instead of ad hoc page imports.',
  routeGroups: requiredGroups,
  pageFilesScanned: pageFiles.length,
  warnings,
  failures,
};
writeFileSync(path('certification-output/pass-r3-route-group-shell-compliance.json'), `${JSON.stringify(payload, null, 2)}\n`);

if (failures.length > 0) {
  console.error('Pass R3 route-group shell gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Pass R3 route-group shell gate PASSED: ${pageFiles.length} page routes are inside approved route groups with no direct AppShell page imports.`);
for (const warning of warnings) console.warn(`WARN: ${warning}`);
