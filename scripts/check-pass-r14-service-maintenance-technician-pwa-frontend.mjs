#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const requiredFiles = [
  'frontend/src/modules/service/service-resource-config.ts',
  'frontend/src/modules/service/service-resource-list.tsx',
  'frontend/src/modules/service/service-resource-detail.tsx',
  'frontend/src/modules/service/service-resource-form-page.tsx',
  'frontend/src/modules/service/service-command-panel.tsx',
  'frontend/src/modules/service/service-scoped-surface.tsx',
  'frontend/src/modules/service/technician-pwa-workspace.tsx',
  'frontend/src/modules/maintenance/maintenance-resource-config.ts',
  'frontend/src/modules/maintenance/maintenance-resource-list.tsx',
  'frontend/src/modules/maintenance/maintenance-resource-detail.tsx',
  'frontend/src/modules/maintenance/maintenance-resource-form-page.tsx',
  'frontend/src/modules/maintenance/maintenance-command-panel.tsx',
  'frontend/src/modules/maintenance/maintenance-scoped-command-page.tsx',
];
const requiredRoutes = [
  'frontend/src/app/(erp)/tickets/page.tsx',
  'frontend/src/app/(erp)/tickets/create/page.tsx',
  'frontend/src/app/(erp)/tickets/[id]/page.tsx',
  'frontend/src/app/(erp)/tickets/[id]/edit/page.tsx',
  'frontend/src/app/(erp)/tickets/[id]/sla/page.tsx',
  'frontend/src/app/(erp)/work-orders/page.tsx',
  'frontend/src/app/(erp)/work-orders/create/page.tsx',
  'frontend/src/app/(erp)/work-orders/[id]/page.tsx',
  'frontend/src/app/(erp)/work-orders/[id]/edit/page.tsx',
  'frontend/src/app/(erp)/work-orders/[id]/assign/page.tsx',
  'frontend/src/app/(erp)/work-orders/[id]/service-report/page.tsx',
  'frontend/src/app/(erp)/work-orders/[id]/parts/page.tsx',
  'frontend/src/app/(erp)/maintenance/create/page.tsx',
  'frontend/src/app/(erp)/maintenance/[id]/page.tsx',
  'frontend/src/app/(erp)/maintenance/schedule/page.tsx',
  'frontend/src/app/(erp)/maintenance/schedule/[id]/generate-work-order/page.tsx',
  'frontend/src/app/(erp)/maintenance/executions/[id]/complete/page.tsx',
  'frontend/src/app/(technician)/technician-pwa/jobs/page.tsx',
  'frontend/src/app/(technician)/technician-pwa/offline-queue/page.tsx',
  'frontend/src/app/(technician)/technician-pwa/sync/page.tsx',
  'frontend/src/app/(technician)/technician-pwa/work-orders/[id]/service-report/page.tsx',
  'frontend/src/app/(technician)/technician-pwa/work-orders/[id]/parts/page.tsx',
];
function read(file) { return readFileSync(join(root, file), 'utf8'); }
for (const file of [...requiredFiles, ...requiredRoutes]) if (!existsSync(join(root, file))) failures.push(`Missing required R14 file: ${file}`);
if (!failures.length) {
  const serviceConfig = read('frontend/src/modules/service/service-resource-config.ts');
  for (const marker of ['ServiceResourceConfigs','ServiceScopedSurfaceConfigs','assign-work-order','create-service-report','complete-work-order','check-in-work-order','check-out-work-order','/work-orders/:id/service-report','/portal/technician/offline-sync']) if (!serviceConfig.includes(marker)) failures.push(`Service config missing ${marker}`);
  const serviceCommand = read('frontend/src/modules/service/service-command-panel.tsx');
  for (const marker of ['CommandFormDialog','CreateServiceReportSchema','CompleteWorkOrderRequestSchema','TechnicianCheckInSchema','TechnicianCheckOutSchema','parts consumption','offline']) if (!serviceCommand.includes(marker)) failures.push(`Service command panel missing ${marker}`);
  const technician = read('frontend/src/modules/service/technician-pwa-workspace.tsx');
  for (const marker of ['TechnicianOfflineSyncBatchSchema','/portal/technician/offline-sync','Offline queue','Sync status','CommandFormDialog','clientBatchId','clientCommandId']) if (!technician.includes(marker)) failures.push(`Technician PWA workspace missing ${marker}`);
  const maintenanceConfig = read('frontend/src/modules/maintenance/maintenance-resource-config.ts');
  for (const marker of ['MaintenanceResourceConfigs','MaintenanceCommandConfigs','generate-maintenance-work-order','complete-maintenance-execution','/maintenance/schedules/:id/generate-work-order','/maintenance/executions/:id/complete']) if (!maintenanceConfig.includes(marker)) failures.push(`Maintenance config missing ${marker}`);
  const maintenanceCommand = read('frontend/src/modules/maintenance/maintenance-command-panel.tsx');
  for (const marker of ['CommandFormDialog','GenerateMaintenanceWorkOrderSchema','CompleteMaintenanceExecutionSchema','parts','next due']) if (!maintenanceCommand.includes(marker)) failures.push(`Maintenance command panel missing ${marker}`);
  const registry = read('frontend/src/modules/forms/resource-form-registry.ts');
  for (const marker of ['CreateServiceReportSchema','GenerateMaintenanceWorkOrderSchema','CompleteMaintenanceExecutionSchema','TechnicianOfflineSyncBatchSchema','createServiceReport','generateMaintenanceWorkOrder','completeMaintenanceExecution','technicianOfflineSync']) if (!registry.includes(marker)) failures.push(`Form registry missing ${marker}`);
  const routeMap = read('frontend/src/lib/route-map.ts');
  for (const route of ['/tickets/create','/work-orders/[id]/service-report','/maintenance/schedule/[id]/generate-work-order','/maintenance/executions/[id]/complete','/technician-pwa/offline-queue','/technician-pwa/sync']) if (!routeMap.includes(route)) failures.push(`Route map missing ${route}`);
  const nav = read('frontend/src/modules/navigation/navigation-registry.ts');
  for (const label of ['Create Ticket','Create Work Order','Technician PWA Jobs','Technician Offline Queue','Technician Offline Sync','Create Maintenance Plan']) if (!nav.includes(label)) failures.push(`Navigation missing ${label}`);
  const packageJson = read('package.json');
  for (const marker of ['frontend:service-maintenance-technician-pwa:check','pass:r14:source-check','pass:r14:certify:sh']) if (!packageJson.includes(marker)) failures.push(`package.json missing ${marker}`);
  const ci = read('.github/workflows/ci.yml');
  if (!ci.includes('R14 service/maintenance/technician PWA frontend source gate')) failures.push('CI missing R14 service/maintenance/technician PWA frontend source gate');
  const allSource = [
    'frontend/src/modules/service/service-resource-list.tsx',
    'frontend/src/modules/service/service-resource-detail.tsx',
    'frontend/src/modules/service/service-command-panel.tsx',
    'frontend/src/modules/service/technician-pwa-workspace.tsx',
    'frontend/src/modules/maintenance/maintenance-resource-list.tsx',
    'frontend/src/modules/maintenance/maintenance-resource-detail.tsx',
    'frontend/src/modules/maintenance/maintenance-command-panel.tsx',
  ].map(read).join('\n');
  if (!allSource.includes('EntityList') || !allSource.includes('CommandFormDialog')) failures.push('R14 surfaces must use EntityList/DataTable and CommandFormDialog patterns');
  if (allSource.includes('fetch(')) failures.push('Raw fetch found in R14 frontend source; centralized API client is required');
}
const result = {
  pass: 'R14',
  name: 'Service, Maintenance and Technician PWA Frontend Completion',
  sourceOnly: process.argv.includes('--source-only'),
  status: failures.length ? 'FAIL' : 'PASS_SOURCE_LEVEL',
  checkedAt: new Date().toISOString(),
  failures,
  limitations: [
    'Runtime install/typecheck/build are not claimed by this source gate.',
    'Offline sync backend route was introduced in R5; R14 adds technician PWA frontend usage and screen contracts.',
    'Full browser E2E and runtime evidence are deferred to R18-R21.',
  ],
};
mkdirSync(join(root, 'certification-output'), { recursive: true });
writeFileSync(join(root, 'certification-output/pass-r14-service-maintenance-technician-pwa-frontend.json'), JSON.stringify(result, null, 2));
if (failures.length) { console.error(JSON.stringify(result, null, 2)); process.exit(1); }
console.log(JSON.stringify(result, null, 2));
