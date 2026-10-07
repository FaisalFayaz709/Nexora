import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];

const prior = spawnSync(process.execPath, ['scripts/check-commercial-procurement.mjs'], { stdio: 'inherit' });
if (prior.status !== 0) process.exit(prior.status ?? 1);

const lock = JSON.parse(readFileSync(join(root, 'docs/contracts/capability-locks/enterprise-controls-platform.json'), 'utf8'));
const catalog = readFileSync(join(root, 'docs/contracts/api-endpoint-matrix.csv'), 'utf8');
const communicationRoutes = readFileSync(join(root, 'backend/src/modules/communications/communication.routes.ts'), 'utf8');
const reportRoutes = readFileSync(join(root, 'backend/src/modules/reports/report-builder.routes.ts'), 'utf8');
const featureRoutes = readFileSync(join(root, 'backend/src/modules/platform/configuration/platform-configuration.routes.ts'), 'utf8');
const routeText = `${communicationRoutes}\n${reportRoutes}\n${featureRoutes}`;

for (const route of lock.lockedRoutes) {
  const sig = `defineLockedRoute('${route.method}', '${route.path}')`;
  if (!routeText.includes(sig)) failures.push(`Missing locked enterprise-control route: ${route.method} ${route.path}`);
  if (!catalog.includes(route.path)) failures.push(`Route absent frozen catalog: ${route.path}`);
  if (route.permission !== 'authenticated' && !routeText.includes(`'${route.permission}'`)) failures.push(`Permission guard missing: ${route.permission}`);
}
const routeMatches = [...routeText.matchAll(/defineLockedRoute\('([A-Z]+)', '([^']+)'\)/g)].map((match) => `${match[1]} ${match[2]}`);
if (new Set(routeMatches).size < lock.lockedRouteCount) failures.push(`Expected at least ${lock.lockedRouteCount} route definitions, found ${new Set(routeMatches).size}`);

const schema = readFileSync(join(root, 'database/prisma/schema.prisma'), 'utf8');
for (const model of lock.newPhysicalModels) {
  if (!new RegExp(`model\\s+${model}\\s*\\{`).test(schema)) failures.push(`Missing Prisma model: ${model}`);
}
for (const model of lock.existingFeatureModels) {
  if (!new RegExp(`model\\s+${model}\\s*\\{`).test(schema)) failures.push(`Missing existing feature model: ${model}`);
}
if (/\bFloat\b/.test(schema)) failures.push('Float introduced into Prisma schema.');

const migration = readFileSync(join(root, 'database/prisma/migrations/20260903000800_pass16_enterprise_controls_platform/migration.sql'), 'utf8');
for (const invariant of [
  'CommunicationTemplate_organizationId_key_key',
  'CommunicationLog_subject_check',
  'CommunicationLog_status_check',
  'EmailDeliveryLog_status_check',
  'SmsDeliveryLog_status_check',
  'ReportTemplate_data_source_check',
  'ReportTemplate_chart_check',
  'SavedReport_chart_check',
  'ScheduledReport_frequency_check',
  'ReportExecution_status_check',
  'ReportExecution_source_check',
  'SavedView_organizationId_userId_entityType_idx',
]) if (!migration.includes(invariant)) failures.push(`Migration invariant missing: ${invariant}`);

const commService = readFileSync(join(root, 'backend/src/modules/communications/communication.service.ts'), 'utf8');
for (const invariant of [
  'COMMUNICATION_TEMPLATE_NOT_FOUND',
  'COMMUNICATION_SEND_REQUESTED',
  "type: 'communication.send.requested'",
  'createEmailDelivery',
  'createSmsDelivery',
]) if (!commService.includes(invariant)) failures.push(`Communication invariant missing: ${invariant}`);
if (/\btx\s*\.\s*[a-zA-Z]\w*\s*\./.test(commService)) failures.push('CommunicationService must persist through repository/facades only.');
if (commService.includes('BullMQ') || commService.includes("from 'bullmq'")) failures.push('Communication log must not put delivery side effects inside critical service path.');

const reportService = readFileSync(join(root, 'backend/src/modules/reports/report-builder.service.ts'), 'utf8');
for (const invariant of [
  'REPORT_PERMISSION_SCOPE_INVALID',
  'REPORT_TEMPLATE_CREATED',
  'SAVED_REPORT_CREATED',
  'SCHEDULED_REPORT_CREATED',
  "type: 'report.scheduled'",
  'FINANCE_AR',
  'HR_EMPLOYEES',
  'AUDIT',
]) if (!reportService.includes(invariant)) failures.push(`Report Builder invariant missing: ${invariant}`);
if (/\btx\s*\.\s*[a-zA-Z]\w*\s*\./.test(reportService)) failures.push('ReportBuilderService must persist through repository/facades only.');
if (reportService.includes('BullMQ') || reportService.includes("from 'bullmq'")) failures.push('Report Builder create/read path must not use BullMQ directly.');

const platformService = readFileSync(join(root, 'backend/src/modules/platform/configuration/platform-configuration.service.ts'), 'utf8');
for (const invariant of ['appendHistory', 'SaaSPlanGuard', 'FEATURE_CONFIGURATION_CHANGED', 'MODULE_CONFIGURATION_CHANGED']) {
  if (!platformService.includes(invariant)) failures.push(`Feature configuration invariant missing: ${invariant}`);
}

const app = readFileSync(join(root, 'backend/src/app.ts'), 'utf8');
for (const invariant of [
  'createCommunicationModule',
  'createReportBuilderModule',
  'app.register(communications.plugin',
  'app.register(reportBuilder.plugin',
]) if (!app.includes(invariant)) failures.push(`App composition missing: ${invariant}`);

for (const file of [
  'backend/src/modules/communications/communication.repository.ts',
  'backend/src/modules/communications/communication.service.ts',
  'backend/src/modules/communications/communication.controller.ts',
  'backend/src/modules/communications/communication.routes.ts',
  'backend/src/modules/reports/report-builder.repository.ts',
  'backend/src/modules/reports/report-builder.service.ts',
  'backend/src/modules/reports/report-builder.controller.ts',
  'backend/src/modules/reports/report-builder.routes.ts',
  'frontend/src/app/(erp)/communications/page.tsx',
  'frontend/src/app/(erp)/report-builder/page.tsx',
  'frontend/src/app/(erp)/platform-features/page.tsx',
  'docs/architecture/source-boundaries/enterprise-controls-platform.md',
]) if (!existsSync(join(root, file))) failures.push(`Missing file: ${file}`);

const allBackend = [commService, reportService, communicationRoutes, reportRoutes].join('\n');
for (const forbidden of ['minio', '@aws-sdk/client-s3', 'S3Client']) {
  if (allBackend.includes(forbidden)) failures.push(`Direct object-storage usage forbidden in enterprise-control modules: ${forbidden}`);
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!String(pkg.scripts?.['verify:static'] ?? '').includes('enterprise-controls:check')) failures.push('verify:static does not include enterprise-controls:check.');
if (!String(pkg.scripts?.verify ?? '').includes('enterprise-controls:check')) failures.push('verify does not include enterprise-controls:check.');

if (failures.length) {
  console.error('Enterprise-controls gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Enterprise-controls gate PASSED: ${lock.communicationRouteCount} communication routes + ${lock.reportBuilderRouteCount} report-builder routes + ${lock.featureRouteCount} feature/module routes and ${lock.newPhysicalModelCount} new models.`);
