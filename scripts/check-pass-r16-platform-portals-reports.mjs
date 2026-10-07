#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const failures = [];
const requiredFiles = [
  'frontend/src/modules/platform/api.ts',
  'frontend/src/modules/platform/columns.tsx',
  'frontend/src/modules/platform/platform-resource-config.ts',
  'frontend/src/modules/platform/platform-resource-list.tsx',
  'frontend/src/modules/platform/platform-resource-detail.tsx',
  'frontend/src/modules/platform/platform-resource-form-page.tsx',
  'frontend/src/modules/platform/platform-command-page.tsx',
  'frontend/src/modules/platform/platform-scoped-surface.tsx',
  'frontend/src/modules/platform/platform-completion-workbench.tsx',
  'frontend/src/modules/portals/portal-resource-config.ts',
  'frontend/src/modules/portals/portal-resource-page.tsx',
  'frontend/src/modules/portals/portal-completion-workbench.tsx',
];
const requiredRoutes = [
  'frontend/src/app/(erp)/platform/completion/page.tsx',
  'frontend/src/app/(erp)/documents/page.tsx',
  'frontend/src/app/(erp)/documents/upload/page.tsx',
  'frontend/src/app/(erp)/documents/[id]/page.tsx',
  'frontend/src/app/(erp)/documents/[id]/download/page.tsx',
  'frontend/src/app/(erp)/documents/[id]/versions/page.tsx',
  'frontend/src/app/(erp)/reports/page.tsx',
  'frontend/src/app/(erp)/reports/exports/page.tsx',
  'frontend/src/app/(erp)/reports/exports/[jobId]/page.tsx',
  'frontend/src/app/(erp)/report-builder/templates/page.tsx',
  'frontend/src/app/(erp)/report-builder/saved-reports/page.tsx',
  'frontend/src/app/(erp)/report-builder/scheduled-reports/page.tsx',
  'frontend/src/app/(erp)/report-executions/page.tsx',
  'frontend/src/app/(erp)/communications/page.tsx',
  'frontend/src/app/(erp)/communications/send/page.tsx',
  'frontend/src/app/(erp)/communications/[id]/delivery/page.tsx',
  'frontend/src/app/(erp)/communication-templates/page.tsx',
  'frontend/src/app/(erp)/notifications/page.tsx',
  'frontend/src/app/(erp)/notifications/[id]/read/page.tsx',
  'frontend/src/app/(erp)/notifications/read-all/page.tsx',
  'frontend/src/app/(erp)/audit-logs/page.tsx',
  'frontend/src/app/(erp)/audit-logs/[id]/page.tsx',
  'frontend/src/app/(erp)/search/page.tsx',
  'frontend/src/app/(erp)/calendar/page.tsx',
  'frontend/src/app/(erp)/saas/plans/page.tsx',
  'frontend/src/app/(erp)/saas/subscriptions/page.tsx',
  'frontend/src/app/(erp)/saas/usage/page.tsx',
  'frontend/src/app/(erp)/platform-features/page.tsx',
  'frontend/src/app/(erp)/module-configurations/page.tsx',
  'frontend/src/app/(portal)/customer-portal/projects/page.tsx',
  'frontend/src/app/(portal)/customer-portal/assets/page.tsx',
  'frontend/src/app/(portal)/customer-portal/tickets/page.tsx',
  'frontend/src/app/(portal)/customer-portal/invoices/page.tsx',
  'frontend/src/app/(portal)/customer-portal/documents/page.tsx',
  'frontend/src/app/(portal)/vendor-portal/rfqs/page.tsx',
  'frontend/src/app/(portal)/vendor-portal/purchase-orders/page.tsx',
  'frontend/src/app/(portal)/vendor-portal/invoices/page.tsx',
  'frontend/src/app/(portal)/vendor-portal/documents/page.tsx',
];
function read(file) { return readFileSync(join(root, file), 'utf8'); }
function walk(dir) { const out=[]; for (const e of readdirSync(dir)) { const p=join(dir,e); const s=statSync(p); if (s.isDirectory()) out.push(...walk(p)); else if (s.isFile()) out.push(p); } return out; }
for (const file of [...requiredFiles, ...requiredRoutes]) if (!existsSync(join(root, file))) failures.push(`Missing required R16 file: ${file}`);
if (!failures.length) {
  const config = read('frontend/src/modules/platform/platform-resource-config.ts');
  for (const marker of ['PlatformResourceConfigs','PlatformCompletionPrinciples','documents','reports','report-templates','saved-reports','scheduled-reports','report-executions','communications','communication-templates','notifications','audit-logs','search','calendar','saas-plans','saas-subscriptions','saas-usage','features','module-configurations','document-upload-intent','document-complete-upload','report-export','send-communication','notification-read','notifications-read-all','StorageService','MinIO','RBAC','tenant','branch']) if (!config.includes(marker)) failures.push(`Platform config missing ${marker}`);
  const portal = read('frontend/src/modules/portals/portal-resource-config.ts');
  for (const marker of ['PortalResourceConfigs','customer-projects','customer-assets','customer-tickets','customer-invoices','customer-documents','vendor-rfqs','vendor-purchase-orders','vendor-invoices','vendor-documents','linkedScope']) if (!portal.includes(marker)) failures.push(`Portal resource config missing ${marker}`);
  const platformSource = walk(join(root, 'frontend/src/modules/platform')).filter((f)=>/\.tsx?$/.test(f)).map((f)=>readFileSync(f,'utf8')).join('\n');
  if (platformSource.includes('fetch(')) failures.push('Raw fetch found in platform frontend module; centralized API client is required');
  if (platformSource.includes('<table')) failures.push('Raw <table> found in platform frontend module; TanStack/DataTable wrapper is required');
  for (const marker of ['EntityList','DataTable','CommandFormDialog','ResourceFormPage','React Hook Form','Zod','Fastify /api/v1','TanStack Table']) if (!platformSource.includes(marker)) failures.push(`Platform source missing ${marker}`);
  const portalsSource = walk(join(root, 'frontend/src/modules/portals')).filter((f)=>/\.tsx?$/.test(f)).map((f)=>readFileSync(f,'utf8')).join('\n');
  if (portalsSource.includes('fetch(')) failures.push('Raw fetch found in portals module');
  if (portalsSource.includes('<table')) failures.push('Raw <table> found in portals module');
  for (const marker of ['PortalResourcePage','DataTable','PortalShell','linked customer','linked vendor','internal ERP navigation','Fastify']) if (!portalsSource.includes(marker)) failures.push(`Portal source missing ${marker}`);
  const api = read('frontend/src/modules/platform/api.ts');
  for (const marker of ['/documents/upload-intent','/documents/complete-upload','/reports/exports','/report-executions','/communications/send','/notifications/read-all','/search','/calendar','/saas/plans','/saas/subscriptions','/saas/usage','postCommand','apiGet']) if (!api.includes(marker)) failures.push(`Platform API missing ${marker}`);
  const nav = read('frontend/src/modules/navigation/navigation-registry.ts');
  for (const marker of ['Platform Completion','Document Upload Flow','Report Templates','Report Exports','Send Communication','SaaS Plans','SaaS Subscriptions','Customer Portal Projects','Vendor Portal RFQs']) if (!nav.includes(marker)) failures.push(`Navigation missing ${marker}`);
  const routeMap = read('frontend/src/lib/route-map.ts');
  for (const marker of ['/platform/completion','/documents/upload','/reports/exports/[jobId]','/communications/send','/notifications/read-all','/saas/plans','/customer-portal/projects','/vendor-portal/rfqs']) if (!routeMap.includes(marker)) failures.push(`Route map missing ${marker}`);
  const packageJson = read('package.json');
  for (const marker of ['frontend:platform-portals-reports:check','pass:r16:source-check','pass:r16:certify:sh']) if (!packageJson.includes(marker)) failures.push(`package.json missing ${marker}`);
  const ci = read('.github/workflows/ci.yml');
  if (!ci.includes('R16 platform/portals/reports source gate')) failures.push('CI missing R16 source gate');
}
const result = { pass: 'R16', name: 'Platform, Portals and Reports Completion', sourceOnly, status: failures.length ? 'FAIL' : 'PASS_SOURCE_LEVEL', checkedAt: new Date().toISOString(), requiredRoutes: requiredRoutes.length, failures, limitations: ['Runtime install/typecheck/build are not claimed by this source gate.', 'Portal authorization, report worker exports, MinIO upload/download and E2E proof are deferred to R18-R21.', 'pnpm-lock.yaml must still be generated and committed on a connected development machine.'] };
mkdirSync(join(root, 'certification-output'), { recursive: true });
writeFileSync(join(root, 'certification-output/pass-r16-platform-portals-reports.json'), JSON.stringify(result, null, 2));
if (failures.length) { console.error(JSON.stringify(result, null, 2)); process.exit(1); }
console.log(JSON.stringify(result, null, 2));
