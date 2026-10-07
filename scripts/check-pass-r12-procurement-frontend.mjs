#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'frontend/src/modules/procurement/procurement-resource-config.ts',
  'frontend/src/modules/procurement/procurement-resource-list.tsx',
  'frontend/src/modules/procurement/procurement-resource-detail.tsx',
  'frontend/src/modules/procurement/procurement-resource-form-page.tsx',
  'frontend/src/modules/procurement/procurement-command-panel.tsx',
  'frontend/src/modules/procurement/rfq-comparison-panel.tsx',
  'frontend/src/modules/procurement/procurement-workflow-dashboard.tsx',
];

const requiredRoutes = [
  'frontend/src/app/(erp)/procurement/purchase-requests/page.tsx',
  'frontend/src/app/(erp)/procurement/purchase-requests/create/page.tsx',
  'frontend/src/app/(erp)/procurement/purchase-requests/[id]/page.tsx',
  'frontend/src/app/(erp)/procurement/purchase-requests/[id]/edit/page.tsx',
  'frontend/src/app/(erp)/procurement/rfqs/page.tsx',
  'frontend/src/app/(erp)/procurement/rfqs/create/page.tsx',
  'frontend/src/app/(erp)/procurement/rfqs/[id]/page.tsx',
  'frontend/src/app/(erp)/procurement/rfqs/[id]/comparison/page.tsx',
  'frontend/src/app/(erp)/procurement/supplier-quotations/page.tsx',
  'frontend/src/app/(erp)/procurement/supplier-quotations/create/page.tsx',
  'frontend/src/app/(erp)/procurement/supplier-quotations/[id]/page.tsx',
  'frontend/src/app/(erp)/procurement/purchase-orders/page.tsx',
  'frontend/src/app/(erp)/procurement/purchase-orders/create/page.tsx',
  'frontend/src/app/(erp)/procurement/purchase-orders/[id]/page.tsx',
  'frontend/src/app/(erp)/procurement/goods-receipts/page.tsx',
  'frontend/src/app/(erp)/procurement/goods-receipts/create/page.tsx',
  'frontend/src/app/(erp)/procurement/goods-receipts/[id]/page.tsx',
  'frontend/src/app/(erp)/procurement/purchase-contracts/page.tsx',
  'frontend/src/app/(erp)/procurement/purchase-contracts/create/page.tsx',
  'frontend/src/app/(erp)/procurement/purchase-contracts/[id]/page.tsx',
  'frontend/src/app/(erp)/procurement/landed-costs/page.tsx',
  'frontend/src/app/(erp)/procurement/landed-costs/create/page.tsx',
  'frontend/src/app/(erp)/procurement/landed-costs/[id]/page.tsx',
  'frontend/src/app/(erp)/procurement/vendor-onboarding/page.tsx',
  'frontend/src/app/(erp)/procurement/vendor-onboarding/create/page.tsx',
  'frontend/src/app/(erp)/procurement/vendor-onboarding/[id]/page.tsx',
];

const failures = [];
function read(file) { return readFileSync(join(root, file), 'utf8'); }
for (const file of [...requiredFiles, ...requiredRoutes]) if (!existsSync(join(root, file))) failures.push(`Missing required R12 file: ${file}`);

if (!failures.length) {
  const config = read('frontend/src/modules/procurement/procurement-resource-config.ts');
  for (const key of ['purchase-requests','rfqs','supplier-quotations','purchase-orders','goods-receipts','purchase-contracts','landed-costs','vendor-onboarding']) {
    if (!config.includes(key)) failures.push(`Procurement resource config missing ${key}`);
  }
  for (const endpoint of ['/purchase-requests/:id/submit','/purchase-requests/:id/approve','/purchase-requests/:id/reject','/purchase-requests/:id/create-rfq','/rfqs/:id/invite-vendors','/rfqs/:id/publish','/rfqs/:id/close','/rfqs/[id]/comparison','/supplier-quotations/:id/select','/purchase-orders/:id/submit','/purchase-orders/:id/approve','/purchase-orders/:id/send','/purchase-orders/:id/cancel','/goods-receipts','/goods-receipts/:id/inspect','/purchase-contracts/:id/approve','/purchase-contracts/:id/create-release-order','/landed-costs/:id/allocate','/landed-costs/:id/post','/vendor-onboarding/:id/submit','/vendor-onboarding/:id/approve','/vendors/:id/blacklist']) {
    if (!config.includes(endpoint)) failures.push(`Procurement config missing endpoint/control ${endpoint}`);
  }
  const commandPanel = read('frontend/src/modules/procurement/procurement-command-panel.tsx');
  for (const marker of ['CommandFormDialog','ReceiveGoodsCommandSchema','CreateRfqFromPurchaseRequestSchema','InviteVendorsSchema','SelectQuotationSchema','CancelPurchaseOrderSchema','InspectGoodsReceiptSchema','CreatePurchaseReleaseOrderSchema','AllocateLandedCostSchema','PostLandedCostSchema','VendorOnboardingActionSchema']) {
    if (!commandPanel.includes(marker)) failures.push(`Procurement command panel missing ${marker}`);
  }
  const list = read('frontend/src/modules/procurement/procurement-resource-list.tsx');
  for (const marker of ['EntityList','DataTable','ResourceFormDialog','Fastify /api/v1']) if (!list.includes(marker)) failures.push(`Procurement list missing ${marker}`);
  const detail = read('frontend/src/modules/procurement/procurement-resource-detail.tsx');
  for (const marker of ['ProcurementCommandPanel','AuditTimeline','ActivityTimeline','three-way match','Fastify /api/v1']) if (!detail.includes(marker)) failures.push(`Procurement detail missing ${marker}`);
  const comparison = read('frontend/src/modules/procurement/rfq-comparison-panel.tsx');
  for (const marker of ['/rfqs/${rfqId}/comparison','DataTable','/supplier-quotations/:id/select']) if (!comparison.includes(marker)) failures.push(`RFQ comparison panel missing ${marker}`);
  const routeMap = read('frontend/src/lib/route-map.ts');
  for (const route of ['/procurement/purchase-requests/create','/procurement/rfqs/[id]/comparison','/procurement/supplier-quotations/create','/procurement/purchase-orders/[id]','/procurement/goods-receipts/[id]','/procurement/purchase-contracts','/procurement/landed-costs','/procurement/vendor-onboarding']) {
    if (!routeMap.includes(route)) failures.push(`Route map missing ${route}`);
  }
  const nav = read('frontend/src/modules/navigation/navigation-registry.ts');
  for (const label of ['Supplier Quotations','Purchase Contracts','Landed Costs','Vendor Onboarding']) if (!nav.includes(label)) failures.push(`Navigation missing ${label}`);
  const registry = read('frontend/src/modules/forms/resource-form-registry.ts');
  for (const marker of ['/purchase-requests','/rfqs','/supplier-quotations','/purchase-orders','/goods-receipts','/purchase-contracts','/landed-costs','/vendor-onboarding/requests']) {
    if (!registry.includes(marker)) failures.push(`Resource form registry missing ${marker}`);
  }
  const packageJson = read('package.json');
  if (!packageJson.includes('pass:r12:source-check')) failures.push('package.json missing pass:r12:source-check script');
  if (!packageJson.includes('frontend:procurement:check')) failures.push('package.json missing frontend:procurement:check script');
  const ci = read('.github/workflows/ci.yml');
  if (!ci.includes('R12 procurement frontend source gate')) failures.push('CI missing R12 procurement frontend source gate');
  const screenDir = join(root, 'docs/frontend-screens');
  for (const name of ['erp-procurement--purchase-requests--create.md','erp-procurement--rfqs--id--comparison.md','erp-procurement--supplier-quotations.md','erp-procurement--purchase-contracts.md','erp-procurement--landed-costs.md','erp-procurement--vendor-onboarding.md']) {
    if (!existsSync(join(screenDir, name))) failures.push(`Screen contract missing ${name}`);
  }
}

const result = {
  pass: 'R12',
  name: 'Procurement Frontend Completion',
  sourceOnly: process.argv.includes('--source-only'),
  status: failures.length ? 'FAIL' : 'PASS_SOURCE_LEVEL',
  checkedAt: new Date().toISOString(),
  failures,
  limitations: [
    'Runtime install/typecheck/build are not claimed by this source gate.',
    'Screens that lack locked list/detail GET endpoints intentionally do not invent Next.js business APIs.',
    'Line-item pickers and arrays remain controlled module UI patterns for later runtime refinement and E2E proof.',
  ],
};
mkdirSync(join(root, 'certification-output'), { recursive: true });
writeFileSync(join(root, 'certification-output/pass-r12-procurement-frontend.json'), JSON.stringify(result, null, 2));

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
