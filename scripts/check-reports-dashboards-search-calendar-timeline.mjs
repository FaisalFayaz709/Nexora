import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const ran = [];

function runGate(name, args) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  ran.push({ name, status: result.status ?? 1 });
  if (result.status !== 0) failures.push(`${name} failed`);
}
function read(path) { return readFileSync(join(root, path), 'utf8'); }
function mustContain(text, needle, label) { if (!text.includes(needle)) failures.push(label); }
function mustExist(path) { if (!existsSync(join(root, path))) failures.push(`Missing file: ${path}`); }
function routeSig(method, routePath) { return new RegExp(`defineLockedRoute\\(\\s*['\"]${method}['\"]\\s*,\\s*['\"]${routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['\"]\\s*\\)`); }
function mustRoute(routeText, method, routePath) { if (!routeSig(method, routePath).test(routeText)) failures.push(`Missing locked route: ${method} ${routePath}`); }
function mustModel(schema, model) { if (!new RegExp(`model\\s+${model}\\s*\\{`).test(schema)) failures.push(`Missing Prisma model: ${model}`); }

runGate('architecture:check', ['scripts/check-architecture.mjs']);
runGate('contracts:check', ['scripts/check-contracts.mjs']);
runGate('enterprise-controls:check', ['scripts/check-enterprise-controls.mjs']);
runGate('operations-platform:check', ['scripts/check-operations-platform.mjs']);

const routeFiles = [
  'backend/src/modules/platform-runtime/platform-runtime.routes.ts',
  'backend/src/modules/reporting/reporting.routes.ts',
  'backend/src/modules/reports/report-builder.routes.ts',
  'backend/src/modules/customers/customer.routes.ts',
  'backend/src/modules/projects/project.routes.ts',
].map(read).join('\n');

const lockedM16Routes = [
  ['GET', '/api/v1/search'],
  ['GET', '/api/v1/calendar'],
  ['GET', '/api/v1/audit-logs'],
  ['GET', '/api/v1/audit-logs/:id'],
  ['GET', '/api/v1/reports'],
  ['GET', '/api/v1/reports/:id'],
  ['POST', '/api/v1/reports/exports'],
  ['GET', '/api/v1/reports/exports/:jobId'],
  ['POST', '/api/v1/report-templates'],
  ['POST', '/api/v1/saved-reports'],
  ['POST', '/api/v1/scheduled-reports'],
  ['GET', '/api/v1/report-executions/:id'],
  ['GET', '/api/v1/customers/:id/timeline'],
  ['GET', '/api/v1/projects/:id/timeline'],
];
for (const [method, routePath] of lockedM16Routes) mustRoute(routeFiles, method, routePath);

for (const permission of ['report.view', 'report.export', 'report_builder.manage', 'audit.view', 'customer.view', 'project.view']) {
  mustContain(routeFiles, `'${permission}'`, `Permission guard missing from M16 route files: ${permission}`);
}

const schema = read('database/prisma/schema.prisma');
for (const model of ['ReportTemplate', 'SavedReport', 'ScheduledReport', 'ReportExecution', 'DashboardWidget', 'UserDashboard', 'SavedView', 'SearchIndexEntry', 'CalendarFeedItem', 'AuditLog', 'BusinessEvent']) {
  mustModel(schema, model);
}
if (/\bFloat\b/.test(schema)) failures.push('Float introduced into Prisma schema.');

const policy = read('backend/src/core/compliance/report-dashboard-completion-policy.ts');
for (const control of [
  'M16-SAVED-REPORT-SOURCE-PERMISSION-SCOPE',
  'M16-DASHBOARD-WIDGET-SOURCE-SCOPE',
  'M16-REPORT-EXPORT-EXECUTION-SCOPE',
  'M16-SCHEDULED-REPORT-RECIPIENT-IDEMPOTENCY',
  'M16-GLOBAL-SEARCH-TENANT-BRANCH-PERMISSION-SCOPE',
  'M16-CALENDAR-FEED-TENANT-BRANCH-PERMISSION-SCOPE',
  'M16-ACTIVITY-TIMELINE-TENANT-PERMISSION-SCOPE',
  'M16-REPORT-BUILDER-FIELD-ALLOWLIST',
  'M16-SAVED-VIEW-PERMISSION-SCOPE',
  'M16-REPORT-DOWNLOAD-DOCUMENT-SCOPE',
  'M16-SEARCH-INDEX-CALENDAR-READMODEL-ONLY',
  'M16-NO-ASYNC-CRITICAL-MUTATION',
]) mustContain(policy, control, `M16 control missing: ${control}`);
for (const fn of ['assertM16ReportReadAccess', 'assertM16GlobalSearchEntryVisibility', 'assertM16CalendarItemVisibility', 'assertM16TimelineEntryVisibility', 'assertM16ReportBuilderFieldAllowlist', 'assertM16NoAsyncCriticalMutation', 'assertM16ReportDashboardCompletionMatrix']) {
  mustContain(policy, fn, `M16 policy function missing: ${fn}`);
}

const platformRepo = read('backend/src/modules/platform-runtime/platform-runtime.repository.ts');
for (const invariant of ['organizationId', 'permissionKey: { in: permissionKeys }', 'branchId', 'searchText: { contains: q', 'startsAt: { gte: from, lte: to }']) {
  mustContain(platformRepo, invariant, `Platform read-model repository scope missing: ${invariant}`);
}
const platformService = read('backend/src/modules/platform-runtime/platform-runtime.service.ts');
for (const invariant of ['assertM16GlobalSearchEntryVisibility', 'assertM16CalendarItemVisibility', 'CALENDAR_RANGE_INVALID']) {
  mustContain(platformService, invariant, `Platform runtime service invariant missing: ${invariant}`);
}

const reportingService = read('backend/src/modules/reporting/reporting.service.ts');
for (const invariant of ['REPORT_EXPORT_REQUESTED', 'report.export.requested', 'assertM16ReportReadAccess', 'assertM16NoAsyncCriticalMutation', 'withTransaction', "status: 'PENDING'"]) {
  mustContain(reportingService, invariant, `Reporting service invariant missing: ${invariant}`);
}
const reportBuilderService = read('backend/src/modules/reports/report-builder.service.ts');
for (const invariant of ['REPORT_PERMISSION_SCOPE_INVALID', 'REPORT_TEMPLATE_CREATED', 'SAVED_REPORT_CREATED', 'SCHEDULED_REPORT_CREATED', 'assertM16ReportBuilderFieldAllowlist', 'assertM16ScheduledReportSafety', "type: 'report.scheduled'"]) {
  mustContain(reportBuilderService, invariant, `Report builder invariant missing: ${invariant}`);
}

const customerRepo = read('backend/src/modules/customers/customer.repository.ts');
const projectService = read('backend/src/modules/projects/project.service.ts');
for (const invariant of ['async timeline', 'communication', 'auditLog', 'organizationId']) mustContain(customerRepo, invariant, `Customer timeline invariant missing: ${invariant}`);
for (const invariant of ['async timeline', 'PROJECT_CREATED', 'PROJECT_TASK_CREATED', 'PROJECT_MILESTONE_TRACKED', 'PROJECT_BOM_VERSION_CREATED', 'PROJECT_TIMELINE_BUDGET_VERSION', 'PROJECT_HANDED_OVER', 'procurement.timeline']) mustContain(projectService, invariant, `Project timeline invariant missing: ${invariant}`);

for (const path of [
  'frontend/src/app/(erp)/reports/page.tsx',
  'frontend/src/app/(erp)/reports/completion/page.tsx',
  'frontend/src/app/(erp)/reports-workbench/page.tsx',
  'frontend/src/app/(erp)/report-builder/page.tsx',
  'frontend/src/app/(erp)/search/page.tsx',
  'frontend/src/app/(erp)/calendar/page.tsx',
  'frontend/src/app/(erp)/audit-logs/page.tsx',
  'frontend/src/modules/reports/reports-completion-workbench.tsx',
  'frontend/src/modules/reports/reports-dashboards-workbench.tsx',
  'backend/src/modules/reporting/m16-reports-dashboards-search-calendar-timeline-policy.test.ts',
  'tests/e2e/REPORTS_DASHBOARDS_SEARCH_CALENDAR.md',
  'docs/compliance/REPORTS_DASHBOARDS_SEARCH_CALENDAR.md',
]) mustExist(path);

for (const path of ['frontend/src/app/(erp)/reports/page.tsx','frontend/src/app/(erp)/reports/completion/page.tsx','frontend/src/app/(erp)/reports-workbench/page.tsx','frontend/src/app/(erp)/report-builder/page.tsx','frontend/src/app/(erp)/search/page.tsx','frontend/src/app/(erp)/calendar/page.tsx','frontend/src/app/(erp)/audit-logs/page.tsx']) {
  const text = read(path);
  if (/import\s*\{\s*AppShell\s*\}/.test(text) || /<\/?AppShell\b/.test(text)) failures.push(`Frontend M16 page still wraps AppShell manually after R3: ${path}`);
}
mustContain(read('frontend/src/app/(erp)/layout.tsx'), 'ErpRouteShell', 'Frontend M16 pages must be protected by ERP route-group shell.');
const entityList = read('frontend/src/modules/masters/entity-list.tsx');
for (const invariant of ['withPagination', "endpoint.includes('?') ? '&' : '?'", 'valueAtPath']) mustContain(entityList, invariant, `EntityList query/nested-column fix missing: ${invariant}`);

const frontendText = [
  'frontend/src/modules/reports/reports-completion-workbench.tsx',
  'frontend/src/modules/reports/reports-dashboards-workbench.tsx',
  'frontend/src/app/(erp)/reports/page.tsx',
  'frontend/src/app/(erp)/search/page.tsx',
  'frontend/src/app/(erp)/calendar/page.tsx',
].map(read).join('\n');
for (const forbidden of ['@nexora/backend', '@nexora/database', 'PrismaClient', '@aws-sdk/client-s3', 'bullmq', 'ioredis']) {
  if (frontendText.includes(forbidden)) failures.push(`Frontend M16 surface imports forbidden server package: ${forbidden}`);
}
for (const invariant of ['/reports/exports', '/report-templates', '/saved-reports', '/scheduled-reports', '/search?q=', '/calendar?from=', 'Idempotency-Key']) {
  mustContain(frontendText, invariant, `Frontend M16 workflow invariant missing: ${invariant}`);
}

const runtimeTest = read('backend/src/modules/reporting/reports-dashboards-search-calendar.integration.test.ts');
for (const scenario of ['dashboard widgets are role and permission filtered', 'report exports run through BullMQ', 'global search is tenant and permission scoped', 'calendar feed is tenant, branch and permission scoped', 'saved and scheduled reports cannot bypass RBAC']) {
  mustContain(runtimeTest, scenario, `Runtime acceptance scenario missing: ${scenario}`);
}

const forbiddenServiceText = [
  'backend/src/modules/platform-runtime/platform-runtime.service.ts',
  'backend/src/modules/reporting/reporting.service.ts',
  'backend/src/modules/reports/report-builder.service.ts',
].map(read).join('\n');
for (const forbidden of ["from 'bullmq'", 'new Queue(', 'Minio.Client', 'S3Client', 'redis.set']) {
  if (forbiddenServiceText.includes(forbidden)) failures.push(`M16 synchronous service must not perform direct async/storage side effect: ${forbidden}`);
}

const pkg = JSON.parse(read('package.json'));
for (const script of ['reports-visibility:check', 'pass:m16:certify']) {
  if (!pkg.scripts?.[script]) failures.push(`package.json script missing: ${script}`);
}
if (!String(pkg.scripts?.['verify:static'] ?? '').includes('reports-visibility:check')) failures.push('verify:static does not include reports-visibility:check.');
if (!String(pkg.scripts?.verify ?? '').includes('reports-visibility:check')) failures.push('verify does not include reports-visibility:check.');

if (failures.length) {
  console.error('PASS M16 reports/dashboards/search/calendar/timeline gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

mkdirSync(join(root, 'certification-output'), { recursive: true });
writeFileSync(join(root, 'certification-output/pass-m16-reports-dashboards-search-calendar-timeline-certification.json'), `${JSON.stringify({
  pass: 'M16',
  name: 'Reports, Dashboards, Search, Calendar and Timeline Completion',
  status: 'PASSED_STATIC_SOURCE_CERTIFICATION',
  lockedRoutes: lockedM16Routes.map(([method, path]) => `${method} ${path}`),
  modelCount: 11,
  controlCount: 12,
  gates: ran,
  runtimeCertification: 'PENDING_DEPENDENCY_LOCKFILE_AND_DOCKER_RUNTIME',
  lockfileStatus: existsSync(join(root, 'pnpm-lock.yaml')) ? 'PRESENT' : 'MISSING_M1_BLOCKER_REMAINS',
}, null, 2)}\n`);
console.log('PASS M16 reports/dashboards/search/calendar/timeline gate PASSED: 14 routes, 11 models, 12 controls, route-group shell and read-model boundaries verified.');
