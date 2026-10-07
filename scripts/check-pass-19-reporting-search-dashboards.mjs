#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const checks = [];
const failures = [];
const blockers = [];
const warnings = [];
const limitations = [];
const gateRuns = [];

function pathOf(path) { return join(root, path); }
function hasFile(path) { return existsSync(pathOf(path)); }
function read(path) { return readFileSync(pathOf(path), 'utf8'); }
function json(path) { return JSON.parse(read(path)); }
function check(name, passed, message = '', options = {}) {
  const entry = { name, passed, message, blocker: Boolean(options.blocker) };
  checks.push(entry);
  if (!passed) {
    const line = `${name}${message ? ` — ${message}` : ''}`;
    if (options.blocker) blockers.push(line); else failures.push(line);
  }
}
function includesAll(name, content, required, message = 'Missing invariant(s)') {
  const missing = required.filter((needle) => !content.includes(needle));
  check(name, missing.length === 0, missing.length ? `${message}: ${missing.join(', ')}` : '');
}
function excludesAll(name, content, forbidden, message = 'Forbidden invariant(s) found') {
  const found = forbidden.filter((needle) => content.includes(needle));
  check(name, found.length === 0, found.length ? `${message}: ${found.join(', ')}` : '');
}
function walk(dir) {
  const abs = pathOf(dir);
  const out = [];
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    if (name === 'node_modules' || name === '.next' || name === 'dist' || name === 'coverage') continue;
    const p = join(abs, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(relative(root, p).replace(/\\/g, '/')));
    else out.push(p);
  }
  return out;
}
function runGate(name, args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 120000 });
  gateRuns.push({ name, args, status: result.status ?? 1 });
  check(name, result.status === 0, result.status === 0 ? '' : `${args.join(' ')} failed with status ${result.status}. ${(result.stderr || result.stdout || '').slice(0, 2400)}`);
}
function routeSig(method, routePath) {
  return new RegExp(`defineLockedRoute\\(\\s*['"]${method}['"]\\s*,\\s*['"]${routePath.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}['"]\\s*\\)`);
}
function routeIn(text, method, routePath) { return routeSig(method, routePath).test(text); }
function previousEvidence(path) {
  if (!hasFile(path)) {
    if (sourceOnly) return;
    check(`previous pass evidence exists: ${path}`, false, `${path} is missing.`, { blocker: true });
    return;
  }
  const raw = read(path);
  let status = raw;
  try { const parsed = JSON.parse(raw); status = parsed.status ?? parsed.result ?? raw; } catch {}
  const failed = String(status).includes('FAIL');
  check(`previous pass evidence is not failed: ${path}`, !failed, `${path} status ${status}.`, { blocker: !sourceOnly && failed });
}
function countPages() {
  return walk('frontend/src/app').filter((file) => file.endsWith('/page.tsx') || file.endsWith('/page.ts')).length;
}
function countScreenContracts() {
  return walk('docs/frontend-screens').filter((file) => file.endsWith('.md') && !file.endsWith('/index.md')).length;
}
function countFiles(dir, extensions) {
  return walk(dir).filter((file) => extensions.some((ext) => file.endsWith(ext))).length;
}

mkdirSync(pathOf('certification-output'), { recursive: true });

if (!sourceOnly) {
  check('root pnpm-lock.yaml exists for strict runtime certification', hasFile('pnpm-lock.yaml'), 'pnpm-lock.yaml is missing; run pnpm install from root and commit the lockfile before claiming runtime GO.', { blocker: true });
}
previousEvidence('certification-output/pass-18-frontend-completion.json');

for (const [name, args] of [
  ['architecture gate still passes', ['scripts/check-architecture.mjs']],
  ['contracts gate still passes', ['scripts/check-contracts.mjs']],
  ['route coverage gate still passes', ['scripts/check-route-coverage.mjs']],
  ['reports/search/calendar static visibility gate passes', ['scripts/check-reports-dashboards-search-calendar-timeline.mjs']],
  ['screen contract gate still passes', ['scripts/check-pass-r6-screen-contracts.mjs']],
  ['Pass 18 frontend source gate still passes', ['scripts/check-pass-18-frontend-completion.mjs', '--source-only']],
]) runGate(name, args);

for (const required of [
  'backend/src/modules/reports/report-builder.routes.ts',
  'backend/src/modules/reports/report-builder.controller.ts',
  'backend/src/modules/reports/report-builder.service.ts',
  'backend/src/modules/reports/report-builder.repository.ts',
  'shared/src/contracts/reports/report-builder.contracts.ts',
  'frontend/src/modules/platform/api.ts',
  'frontend/src/modules/platform/columns.tsx',
  'frontend/src/modules/platform/platform-resource-config.ts',
  'frontend/src/modules/platform/platform-resource-list.tsx',
  'frontend/src/modules/forms/resource-form-registry.ts',
  'frontend/src/modules/masters/entity-list.tsx',
  'frontend/src/app/(erp)/saved-views/page.tsx',
  'frontend/src/app/(erp)/saved-views/[id]/page.tsx',
  'frontend/src/app/(erp)/saved-views/create/page.tsx',
  'frontend/src/app/(erp)/saved-views/[id]/edit/page.tsx',
  'frontend/src/app/(erp)/dashboards/widgets/page.tsx',
  'frontend/src/app/(erp)/dashboards/widgets/create/page.tsx',
  'docs/frontend-screens/erp-saved-views.md',
  'docs/frontend-screens/erp-saved-views--create.md',
  'docs/frontend-screens/erp-saved-views--id.md',
  'docs/frontend-screens/erp-saved-views--id--edit.md',
  'docs/frontend-screens/erp-dashboards--widgets.md',
  'docs/frontend-screens/erp-dashboards--widgets--create.md',
  'docs/contracts/api-endpoint-matrix.csv',
  'docs/contracts/api-endpoint-matrix.md',
  'docs/contracts/contract-lock.json',
  'shared/src/contracts/registry/locked-endpoints.json',
  'shared/src/contracts/registry/locked-endpoints.ts',
  'shared/src/contracts/registry/contract-maturity.json',
]) check(`PASS 19 source file exists: ${required}`, hasFile(required), `${required} is required.`);

const routes = hasFile('backend/src/modules/reports/report-builder.routes.ts') ? read('backend/src/modules/reports/report-builder.routes.ts') : '';
const pass19Routes = [
  ['GET', '/api/v1/report-templates'],
  ['GET', '/api/v1/report-templates/:id'],
  ['PATCH', '/api/v1/report-templates/:id'],
  ['GET', '/api/v1/saved-reports'],
  ['GET', '/api/v1/saved-reports/:id'],
  ['PATCH', '/api/v1/saved-reports/:id'],
  ['GET', '/api/v1/scheduled-reports'],
  ['GET', '/api/v1/scheduled-reports/:id'],
  ['PATCH', '/api/v1/scheduled-reports/:id'],
  ['GET', '/api/v1/report-executions'],
  ['GET', '/api/v1/dashboards/widgets'],
  ['POST', '/api/v1/dashboards/widgets'],
  ['GET', '/api/v1/saved-views'],
  ['GET', '/api/v1/saved-views/:id'],
  ['POST', '/api/v1/saved-views'],
  ['PATCH', '/api/v1/saved-views/:id'],
];
for (const [method, path] of pass19Routes) check(`PASS 19 Fastify locked route exists: ${method} ${path}`, routeIn(routes, method, path), `${method} ${path} missing from report-builder routes.`);
includesAll('Report builder routes use tenant module and permission guards', routes, [
  "access.assertModuleEnabled(request.tenant!.organizationId, 'reports')",
  "identity.assertPermission(request, 'report.view')",
  "identity.assertPermission(request, 'report_builder.manage')",
  'defineLockedRoute',
], 'Route guard invariant missing');
excludesAll('Report builder routes/controllers do not access Prisma directly', routes + (hasFile('backend/src/modules/reports/report-builder.controller.ts') ? read('backend/src/modules/reports/report-builder.controller.ts') : ''), ['@nexora/database', 'prisma.'], 'Routes/controllers must stay persistence-free.');

const contracts = hasFile('shared/src/contracts/reports/report-builder.contracts.ts') ? read('shared/src/contracts/reports/report-builder.contracts.ts') : '';
includesAll('Report builder shared contracts cover complete management surfaces', contracts, [
  'ReportBuilderListQuerySchema',
  'ReportTemplateUpdateSchema',
  'SavedReportUpdateSchema',
  'ScheduledReportUpdateSchema',
  'DashboardWidgetCreateSchema',
  'SavedViewCreateSchema',
  'SavedViewUpdateSchema',
], 'Shared contract invariant missing');

const service = hasFile('backend/src/modules/reports/report-builder.service.ts') ? read('backend/src/modules/reports/report-builder.service.ts') : '';
includesAll('Report builder service enforces RBAC/scope/audit/event controls', service, [
  'assertM16ReportReadAccess',
  'assertM16DashboardWidgetScope',
  'assertM16SavedViewScope',
  'assertM16ActorHasPermissionScope',
  'assertM16ReportBuilderFieldAllowlist',
  'REPORT_TEMPLATE_UPDATED',
  'SAVED_REPORT_UPDATED',
  'SCHEDULED_REPORT_UPDATED',
  'DASHBOARD_WIDGET_CREATED',
  'SAVED_VIEW_CREATED',
  'SAVED_VIEW_UPDATED',
  'withTransaction',
], 'Report builder service invariant missing');

const repo = hasFile('backend/src/modules/reports/report-builder.repository.ts') ? read('backend/src/modules/reports/report-builder.repository.ts') : '';
includesAll('Report builder repository keeps tenant-scoped queries and model ownership', repo, [
  'organizationId',
  'reportTemplate',
  'savedReport',
  'scheduledReport',
  'reportExecution',
  'dashboardWidget',
  'savedView',
], 'Report builder repository invariant missing');

const platformApi = hasFile('frontend/src/modules/platform/api.ts') ? read('frontend/src/modules/platform/api.ts') : '';
includesAll('Frontend platform API exposes report/search/calendar/saved-view/dashboard-widget helpers', platformApi, [
  "savedViews: '/saved-views'",
  "dashboardWidgets: '/dashboards/widgets'",
  'platformKeys',
  'savedViewsApi',
  'dashboardWidgetsApi',
  'listSavedViews',
  'listDashboardWidgets',
  'apiGet',
  'createCrudResourceApi',
], 'Platform API invariant missing');
excludesAll('Frontend platform API has no raw fetch', platformApi, ['fetch('], 'Module API must use centralized wrapper.');

const columns = hasFile('frontend/src/modules/platform/columns.tsx') ? read('frontend/src/modules/platform/columns.tsx') : '';
includesAll('Frontend platform columns include TanStack columns for saved views and dashboard widgets', columns, [
  'savedViewColumns',
  'dashboardWidgetColumns',
  'EntityColumnConfig',
  'platformColumnSets',
], 'Platform column invariant missing');

const config = hasFile('frontend/src/modules/platform/platform-resource-config.ts') ? read('frontend/src/modules/platform/platform-resource-config.ts') : '';
includesAll('Platform resource config includes reporting/search/calendar/saved-view/dashboard surfaces', config, [
  "'saved-views'",
  "'dashboard-widgets'",
  'SavedViewCommands',
  'DashboardCommands',
  'initialFilters',
  "q: 'project'",
  "from: '2026-09-01'",
  "to: '2026-09-30'",
  'PlatformRequiredCompletionSurfaces',
], 'Platform resource config invariant missing');

const entityList = hasFile('frontend/src/modules/masters/entity-list.tsx') ? read('frontend/src/modules/masters/entity-list.tsx') : '';
includesAll('EntityList supports query preservation and nested column ids for reports/search/calendar surfaces', entityList, [
  'withPagination',
  "endpoint.includes('?') ? '&' : '?'",
  'valueAtPath',
  'initialFilters',
], 'EntityList invariant missing');

const registry = hasFile('frontend/src/modules/forms/resource-form-registry.ts') ? read('frontend/src/modules/forms/resource-form-registry.ts') : '';
for (const endpoint of ['/report-templates', '/saved-reports', '/scheduled-reports', '/saved-views', '/dashboards/widgets']) {
  check(`Resource form registry has RHF/Zod create workflow for ${endpoint}`, registry.includes(`endpoint: '${endpoint}'`) || registry.includes(`endpoint: "${endpoint}"`), `${endpoint} form registry entry missing.`);
}
includesAll('Resource form registry imports shared report builder schemas', registry, [
  'ReportTemplateCreateSchema',
  'SavedReportCreateSchema',
  'ScheduledReportCreateSchema',
  'SavedViewCreateSchema',
  'DashboardWidgetCreateSchema',
], 'Report form schema import missing');

const routeMap = hasFile('frontend/src/lib/route-map.ts') ? read('frontend/src/lib/route-map.ts') : '';
const nav = hasFile('frontend/src/modules/navigation/navigation-registry.ts') ? read('frontend/src/modules/navigation/navigation-registry.ts') : '';
for (const path of ['/saved-views', '/saved-views/create', '/saved-views/[id]', '/saved-views/[id]/edit', '/dashboards/widgets', '/dashboards/widgets/create']) {
  check(`Route map includes ${path}`, routeMap.includes(`'${path}'`) || routeMap.includes(`"${path}"`), `${path} missing from route map.`);
}
includesAll('Navigation exposes saved views and dashboard widgets permission-aware links', nav, ['Saved Views', '/saved-views', 'Dashboard Widgets', '/dashboards/widgets'], 'Navigation invariant missing');

const lockedEndpoints = hasFile('shared/src/contracts/registry/locked-endpoints.json') ? json('shared/src/contracts/registry/locked-endpoints.json') : [];
for (const [method, endpoint] of pass19Routes) check(`Locked endpoint registry includes ${method} ${endpoint}`, lockedEndpoints.some((route) => route.method === method && route.endpoint === endpoint), `${method} ${endpoint} missing from locked registry.`);
check('Locked endpoint registry count is at least 316 after Pass 19', lockedEndpoints.length >= 316, `Expected at least 316, found ${lockedEndpoints.length}.`);

const contractLock = hasFile('docs/contracts/contract-lock.json') ? json('docs/contracts/contract-lock.json') : {};
check('Contract lock records Pass 19 endpoint catalog count', Number(contractLock.endpointCatalogCount ?? 0) >= 316, `Unexpected endpointCatalogCount ${contractLock.endpointCatalogCount}.`);
check('Contract lock records Pass 19 reconciliation marker', String(contractLock.lastImplementationStatusReconciliation ?? '').includes('PASS_19_REPORTING_SEARCH_DASHBOARDS'), `Unexpected reconciliation marker ${contractLock.lastImplementationStatusReconciliation}.`);

const screenContracts = countScreenContracts();
const nextPages = countPages();
check('Screen contracts cover all active frontend routes after Pass 19', screenContracts >= nextPages && nextPages >= 333, `screenContracts=${screenContracts}, nextPages=${nextPages}.`);

for (const file of walk('frontend/src').filter((candidate) => candidate.endsWith('.ts') || candidate.endsWith('.tsx'))) {
  const rel = relative(root, file).replace(/\\/g, '/');
  const text = readFileSync(file, 'utf8');
  for (const forbidden of ['@nexora/backend', '@nexora/database', '@nexora/worker', '@prisma/client', '@aws-sdk/client-s3', 'bullmq', 'ioredis']) {
    const importPattern = new RegExp(`(?:import|export)\\s+(?:[^;]*?\\s+from\\s+)?['"]${forbidden.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}['"]`);
    check(`Frontend has no forbidden server import in ${rel}: ${forbidden}`, !importPattern.test(text), `${forbidden} imported in frontend source.`);
  }
}
check('No Next.js duplicate business API route handlers are present', walk('frontend/src/app/api').length === 0 || !walk('frontend/src/app/api').some((file) => /\/api\/(customers|purchase|invoices|payments|work-orders|assets|projects)/.test(file)), 'Duplicate business API route handler found.');

if (!existsSync(pathOf('pnpm-lock.yaml'))) warnings.push('pnpm-lock.yaml is still absent until registry-backed pnpm install is run on a connected local machine.');
limitations.push('This certification is source-level unless run without --source-only after pnpm-lock.yaml exists.');
limitations.push('Runtime install, Fastify API boot, Next.js build, migrations, seed, Docker, worker jobs and browser E2E remain local-machine gates.');
limitations.push('Pass 19 verifies report/dashboard/search/calendar/saved-view source coverage and no-deviation rules; it does not claim final production GO.');

const status = blockers.length ? 'HOLD_AUDIT_FOUND_BLOCKERS' : failures.length ? 'FAIL_SOURCE_LEVEL' : (warnings.length ? 'PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME' : 'PASS_SOURCE_LEVEL');
const result = {
  pass: 'PASS_19_REPORTING_SEARCH_DASHBOARDS',
  status,
  sourceOnly,
  checksRun: checks.length,
  passed: checks.filter((c) => c.passed).length,
  blockers,
  failures,
  warnings,
  limitations,
  counts: {
    endpointRegistryCount: lockedEndpoints.length,
    frontendCodeFiles: countFiles('frontend/src', ['.ts', '.tsx']),
    nextPageRoutes: nextPages,
    screenContracts,
    pass19LockedRoutes: pass19Routes.length,
  },
  gateRuns,
  checks,
};
writeFileSync(pathOf('certification-output/pass-19-reporting-search-dashboards.json'), `${JSON.stringify(result, null, 2)}\n`);
if (blockers.length || failures.length) {
  console.error(`PASS 19 failed: ${blockers.length} blocker(s), ${failures.length} failure(s).`);
  for (const item of [...blockers, ...failures]) console.error(`- ${item}`);
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
