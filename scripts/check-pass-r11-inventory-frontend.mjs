import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'frontend/src/modules/inventory/inventory-resource-config.ts',
  'frontend/src/modules/inventory/inventory-resource-list.tsx',
  'frontend/src/modules/inventory/inventory-resource-detail.tsx',
  'frontend/src/modules/inventory/inventory-resource-form-page.tsx',
  'frontend/src/modules/inventory/inventory-command-panel.tsx',
  'frontend/src/modules/inventory/inventory-workflow-workbench.tsx',
  'frontend/src/app/(erp)/inventory/products/page.tsx',
  'frontend/src/app/(erp)/inventory/product-categories/page.tsx',
  'frontend/src/app/(erp)/inventory/warehouses/page.tsx',
  'frontend/src/app/(erp)/inventory/warehouse-locations/page.tsx',
  'frontend/src/app/(erp)/inventory/stock/page.tsx',
  'frontend/src/app/(erp)/inventory/ledger/page.tsx',
  'frontend/src/app/(erp)/inventory/serials/page.tsx',
  'frontend/src/app/(erp)/inventory/reservations/page.tsx',
  'frontend/src/app/(erp)/inventory/transfers/page.tsx',
  'frontend/src/app/(erp)/inventory/adjustments/page.tsx',
  'frontend/src/app/(erp)/inventory/stock-counts/page.tsx',
];

const screenContracts = [
  'docs/frontend-screens/erp-inventory--products.md',
  'docs/frontend-screens/erp-inventory--product-categories.md',
  'docs/frontend-screens/erp-inventory--warehouses.md',
  'docs/frontend-screens/erp-inventory--warehouse-locations.md',
  'docs/frontend-screens/erp-inventory--stock.md',
  'docs/frontend-screens/erp-inventory--ledger.md',
  'docs/frontend-screens/erp-inventory--serials.md',
  'docs/frontend-screens/erp-inventory--reservations.md',
  'docs/frontend-screens/erp-inventory--transfers.md',
  'docs/frontend-screens/erp-inventory--adjustments.md',
  'docs/frontend-screens/erp-inventory--stock-counts.md',
];

const failures = [];
for (const file of [...requiredFiles, ...screenContracts]) {
  if (!existsSync(join(root, file))) failures.push(`Missing required R11 file: ${file}`);
}

function read(file) {
  return readFileSync(join(root, file), 'utf8');
}

const config = read('frontend/src/modules/inventory/inventory-resource-config.ts');
for (const key of ['products','product-categories','warehouses','warehouse-locations','stock-balances','stock-ledger','serial-lookup','reservations','transfers','adjustments','stock-counts']) {
  if (!config.includes(key)) failures.push(`Inventory resource config missing ${key}`);
}
for (const endpoint of ['/products','/product-categories','/warehouses','/warehouse-locations','/inventory/stock','/inventory/ledger','/inventory/serials','/inventory/reservations','/inventory/transfers','/inventory/adjustments','/stock-counts']) {
  if (!config.includes(endpoint)) failures.push(`Inventory resource config missing endpoint ${endpoint}`);
}
for (const command of ['/inventory/reservations/:id','/inventory/transfers/:id/dispatch','/inventory/transfers/:id/receive','/inventory/adjustments/:id/post','/stock-counts/:id/start','/stock-counts/:id/submit','/stock-counts/:id/post']) {
  if (!config.includes(command)) failures.push(`Inventory command config missing ${command}`);
}

const commandPanel = read('frontend/src/modules/inventory/inventory-command-panel.tsx');
for (const marker of ['CommandFormDialog','EmptyCommandSchema','StartStockCountSchema','SubmitStockCountSchema','PostStockCountSchema','createInventoryCommandDefinition']) {
  if (!commandPanel.includes(marker)) failures.push(`Inventory command panel missing ${marker}`);
}

const workflow = read('frontend/src/modules/inventory/inventory-workflow-workbench.tsx');
for (const marker of ['ResourceFormDialog','CommandFormDialog','/inventory/serials/','Fastify /api/v1']) {
  if (!workflow.includes(marker)) failures.push(`Inventory workflow workbench missing ${marker}`);
}

const formPage = read('frontend/src/modules/inventory/inventory-resource-form-page.tsx');
if (!formPage.includes('ResourceFormPage')) failures.push('Inventory form page does not use the R8 RHF/Zod ResourceFormPage');

for (const forbidden of ['frontend/src/app/(erp)/inventory/stock/create/page.tsx','frontend/src/app/(erp)/inventory/ledger/create/page.tsx','frontend/src/app/(erp)/inventory/stock/[id]/edit/page.tsx','frontend/src/app/(erp)/inventory/ledger/[id]/edit/page.tsx']) {
  if (existsSync(join(root, forbidden))) failures.push(`Read-only stock/ledger surface must not expose direct write page: ${forbidden}`);
}

const registry = read('frontend/src/modules/forms/resource-form-registry.ts');
for (const marker of ['/inventory/reservations','/inventory/transfers','/inventory/adjustments','/stock-counts','/product-categories','/warehouse-locations']) {
  if (!registry.includes(marker)) failures.push(`Resource form registry missing ${marker}`);
}
if (registry.includes("qty: '0'")) failures.push('Reservation form defaults still use qty instead of shared contract quantity.');

const packageJson = read('package.json');
if (!packageJson.includes('pass:r11:source-check')) failures.push('package.json missing pass:r11:source-check script');
if (!packageJson.includes('frontend:inventory:check')) failures.push('package.json missing frontend:inventory:check script');

const ci = read('.github/workflows/ci.yml');
if (!ci.includes('R11 inventory frontend source gate')) failures.push('CI missing R11 inventory frontend source gate');

const result = {
  pass: 'R11',
  name: 'Inventory Frontend Completion',
  sourceOnly: process.argv.includes('--source-only'),
  status: failures.length ? 'FAIL' : 'PASS_SOURCE_LEVEL',
  checkedAt: new Date().toISOString(),
  failures,
  limitations: [
    'Runtime install/typecheck/build are not claimed by this source gate.',
    'Command-only screens intentionally do not invent backend GET endpoints not present in the locked API catalog.',
  ],
};
mkdirSync(join(root, 'certification-output'), { recursive: true });
writeFileSync(join(root, 'certification-output/pass-r11-inventory-frontend.json'), JSON.stringify(result, null, 2));

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
