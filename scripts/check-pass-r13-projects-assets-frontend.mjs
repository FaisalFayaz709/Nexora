#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'frontend/src/modules/projects/project-resource-config.ts',
  'frontend/src/modules/projects/project-resource-list.tsx',
  'frontend/src/modules/projects/project-resource-detail.tsx',
  'frontend/src/modules/projects/project-resource-form-page.tsx',
  'frontend/src/modules/projects/project-command-panel.tsx',
  'frontend/src/modules/projects/project-scoped-surface.tsx',
  'frontend/src/modules/projects/project-asset-completion-workbench.tsx',
  'frontend/src/modules/assets/asset-resource-config.ts',
  'frontend/src/modules/assets/asset-resource-list.tsx',
  'frontend/src/modules/assets/asset-resource-detail.tsx',
  'frontend/src/modules/assets/asset-resource-form-page.tsx',
  'frontend/src/modules/assets/asset-command-panel.tsx',
  'frontend/src/modules/assets/asset-scoped-surface.tsx',
];
const requiredRoutes = [
  'frontend/src/app/(erp)/projects/page.tsx',
  'frontend/src/app/(erp)/projects/create/page.tsx',
  'frontend/src/app/(erp)/projects/[id]/page.tsx',
  'frontend/src/app/(erp)/projects/[id]/edit/page.tsx',
  'frontend/src/app/(erp)/project-tasks/page.tsx',
  'frontend/src/app/(erp)/project-tasks/create/page.tsx',
  'frontend/src/app/(erp)/project-tasks/[id]/page.tsx',
  'frontend/src/app/(erp)/project-tasks/[id]/edit/page.tsx',
  'frontend/src/app/(erp)/projects/[id]/bom/page.tsx',
  'frontend/src/app/(erp)/projects/[id]/budget/page.tsx',
  'frontend/src/app/(erp)/projects/[id]/costing/page.tsx',
  'frontend/src/app/(erp)/projects/[id]/material-request/page.tsx',
  'frontend/src/app/(erp)/projects/[id]/timeline/page.tsx',
  'frontend/src/app/(erp)/projects/[id]/handover/page.tsx',
  'frontend/src/app/(erp)/assets/page.tsx',
  'frontend/src/app/(erp)/assets/create/page.tsx',
  'frontend/src/app/(erp)/assets/register-from-stock/page.tsx',
  'frontend/src/app/(erp)/assets/[id]/page.tsx',
  'frontend/src/app/(erp)/assets/[id]/edit/page.tsx',
  'frontend/src/app/(erp)/assets/[id]/history/page.tsx',
  'frontend/src/app/(erp)/assets/[id]/install/page.tsx',
  'frontend/src/app/(erp)/assets/[id]/replace/page.tsx',
  'frontend/src/app/(erp)/assets/[id]/retire/page.tsx',
  'frontend/src/app/(erp)/assets/[id]/qr/page.tsx',
  'frontend/src/app/(erp)/assets/[id]/rma/page.tsx',
];
const failures = [];
function read(file) { return readFileSync(join(root, file), 'utf8'); }
for (const file of [...requiredFiles, ...requiredRoutes]) if (!existsSync(join(root, file))) failures.push(`Missing required R13 file: ${file}`);

if (!failures.length) {
  const projectConfig = read('frontend/src/modules/projects/project-resource-config.ts');
  for (const marker of ['ProjectResourceConfigs','ProjectScopedSurfaceConfigs','ProjectCommandConfigs','/projects/:id/bom','/projects/:id/material-request','/projects/:id/costing','/projects/:id/handover','project.view_financials']) {
    if (!projectConfig.includes(marker)) failures.push(`Project config missing ${marker}`);
  }
  const assetConfig = read('frontend/src/modules/assets/asset-resource-config.ts');
  for (const marker of ['AssetResourceConfigs','AssetScopedSurfaceConfigs','AssetCommandConfigs','/assets/register-from-stock','/assets/:id/install','/assets/:id/replace','/assets/:id/retire','/assets/:id/qr/rotate','/assets/:id/rma']) {
    if (!assetConfig.includes(marker)) failures.push(`Asset config missing ${marker}`);
  }
  const projectDetail = read('frontend/src/modules/projects/project-resource-detail.tsx');
  for (const marker of ['ProjectCommandPanel','AuditTimeline','ActivityTimeline','/projects/${recordId}/bom','Fastify /api/v1']) if (!projectDetail.includes(marker)) failures.push(`Project detail missing ${marker}`);
  const assetDetail = read('frontend/src/modules/assets/asset-resource-detail.tsx');
  for (const marker of ['AssetCommandPanel','AuditTimeline','ActivityTimeline','/assets/${recordId}/history','Fastify /api/v1']) if (!assetDetail.includes(marker)) failures.push(`Asset detail missing ${marker}`);
  const projectCommand = read('frontend/src/modules/projects/project-command-panel.tsx');
  for (const marker of ['CommandFormDialog','save-draft-bom','approve-bom','create-material-request','complete-handover']) if (!projectCommand.includes(marker)) failures.push(`Project command panel missing ${marker}`);
  const assetCommand = read('frontend/src/modules/assets/asset-command-panel.tsx');
  for (const marker of ['CommandFormDialog','install-asset','replace-asset','retire-asset','rotate-asset-qr','create-asset-rma']) if (!assetCommand.includes(marker)) failures.push(`Asset command panel missing ${marker}`);
  const registry = read('frontend/src/modules/forms/resource-form-registry.ts');
  for (const marker of ['CreateAssetSchema','RegisterAssetFromStockSchema',"'/assets'","'/assets/register-from-stock'",'installAsset','replaceAsset','retireAsset','rotateAssetQr','createAssetRma','createMaterialRequirement']) if (!registry.includes(marker)) failures.push(`Form registry missing ${marker}`);
  const routeMap = read('frontend/src/lib/route-map.ts');
  for (const route of ['/projects/create','/projects/[id]/bom','/projects/[id]/costing','/projects/[id]/handover','/project-tasks/create','/assets/register-from-stock','/assets/[id]/install','/assets/[id]/qr','/assets/[id]/rma']) if (!routeMap.includes(route)) failures.push(`Route map missing ${route}`);
  const nav = read('frontend/src/modules/navigation/navigation-registry.ts');
  for (const label of ['Projects Assets Completion','Create Project','Create Project Task','Create Asset','Register Asset From Stock']) if (!nav.includes(label)) failures.push(`Navigation missing ${label}`);
  const packageJson = read('package.json');
  for (const marker of ['frontend:projects-assets:check','pass:r13:source-check','pass:r13:certify:sh']) if (!packageJson.includes(marker)) failures.push(`package.json missing ${marker}`);
  const ci = read('.github/workflows/ci.yml');
  if (!ci.includes('R13 projects/assets frontend source gate')) failures.push('CI missing R13 projects/assets frontend source gate');
  for (const name of ['erp-projects--create.md','erp-projects--id.md','erp-projects--id--bom.md','erp-project-tasks--create.md','erp-assets--create.md','erp-assets--register-from-stock.md','erp-assets--id--install.md','erp-assets--id--history.md']) {
    if (!existsSync(join(root, 'docs/frontend-screens', name))) failures.push(`Screen contract missing ${name}`);
  }
}
const result = { pass: 'R13', name: 'Projects and Assets Frontend Completion', sourceOnly: process.argv.includes('--source-only'), status: failures.length ? 'FAIL' : 'PASS_SOURCE_LEVEL', checkedAt: new Date().toISOString(), failures, limitations: ['Runtime install/typecheck/build are not claimed by this source gate.', 'Project child routes use locked Fastify endpoints; no Next.js domain API was introduced.', 'Full browser E2E and runtime placeholder replacement are deferred to R18-R21.'] };
mkdirSync(join(root, 'certification-output'), { recursive: true });
writeFileSync(join(root, 'certification-output/pass-r13-projects-assets-frontend.json'), JSON.stringify(result, null, 2));
if (failures.length) { console.error(JSON.stringify(result, null, 2)); process.exit(1); }
console.log(JSON.stringify(result, null, 2));
