#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const sourceOnly = process.argv.includes('--source-only');

const requiredFiles = [
  'frontend/src/modules/finance/api.ts',
  'frontend/src/modules/finance/columns.tsx',
  'frontend/src/modules/finance/finance-resource-config.ts',
  'frontend/src/modules/finance/finance-resource-list.tsx',
  'frontend/src/modules/finance/finance-resource-detail.tsx',
  'frontend/src/modules/finance/finance-resource-form-page.tsx',
  'frontend/src/modules/finance/finance-command-panel.tsx',
  'frontend/src/modules/finance/finance-command-page.tsx',
  'frontend/src/modules/finance/finance-scoped-surface.tsx',
  'frontend/src/modules/finance/finance-completion-workbench.tsx',
];

const requiredRoutes = [
  'frontend/src/app/(erp)/finance/completion/page.tsx',
  'frontend/src/app/(erp)/finance/workbench/page.tsx',
  'frontend/src/app/(erp)/finance/receivables/page.tsx',
  'frontend/src/app/(erp)/finance/payables/page.tsx',
  'frontend/src/app/(erp)/finance/bank-cash/page.tsx',
  'frontend/src/app/(erp)/customer-invoices/page.tsx',
  'frontend/src/app/(erp)/customer-invoices/create/page.tsx',
  'frontend/src/app/(erp)/customer-invoices/[id]/page.tsx',
  'frontend/src/app/(erp)/customer-invoices/[id]/edit/page.tsx',
  'frontend/src/app/(erp)/customer-invoices/[id]/submit/page.tsx',
  'frontend/src/app/(erp)/customer-invoices/[id]/approve/page.tsx',
  'frontend/src/app/(erp)/customer-invoices/[id]/post/page.tsx',
  'frontend/src/app/(erp)/customer-invoices/[id]/send/page.tsx',
  'frontend/src/app/(erp)/customer-invoices/[id]/cancel/page.tsx',
  'frontend/src/app/(erp)/supplier-invoices/page.tsx',
  'frontend/src/app/(erp)/supplier-invoices/create/page.tsx',
  'frontend/src/app/(erp)/supplier-invoices/[id]/page.tsx',
  'frontend/src/app/(erp)/supplier-invoices/[id]/edit/page.tsx',
  'frontend/src/app/(erp)/supplier-invoices/[id]/match/page.tsx',
  'frontend/src/app/(erp)/supplier-invoices/[id]/approve/page.tsx',
  'frontend/src/app/(erp)/payments/page.tsx',
  'frontend/src/app/(erp)/payments/create/page.tsx',
  'frontend/src/app/(erp)/payments/[id]/page.tsx',
  'frontend/src/app/(erp)/payments/[id]/allocations/page.tsx',
  'frontend/src/app/(erp)/expenses/page.tsx',
  'frontend/src/app/(erp)/expenses/create/page.tsx',
  'frontend/src/app/(erp)/expenses/[id]/page.tsx',
  'frontend/src/app/(erp)/expenses/[id]/edit/page.tsx',
  'frontend/src/app/(erp)/accounts/page.tsx',
  'frontend/src/app/(erp)/accounts/[id]/page.tsx',
  'frontend/src/app/(erp)/journal-entries/page.tsx',
  'frontend/src/app/(erp)/journal-entries/create/page.tsx',
  'frontend/src/app/(erp)/journal-entries/[id]/page.tsx',
  'frontend/src/app/(erp)/journal-entries/[id]/post/page.tsx',
  'frontend/src/app/(erp)/tax-codes/page.tsx',
  'frontend/src/app/(erp)/tax-codes/create/page.tsx',
  'frontend/src/app/(erp)/tax-codes/[id]/page.tsx',
  'frontend/src/app/(erp)/tax-rules/create/page.tsx',
  'frontend/src/app/(erp)/tax/calculate/page.tsx',
  'frontend/src/app/(erp)/tax/reports/page.tsx',
  'frontend/src/app/(erp)/bank-accounts/page.tsx',
  'frontend/src/app/(erp)/bank-accounts/[id]/page.tsx',
  'frontend/src/app/(erp)/bank-statements/import/page.tsx',
  'frontend/src/app/(erp)/bank-reconciliations/[id]/close/page.tsx',
  'frontend/src/app/(erp)/vouchers/payment/page.tsx',
  'frontend/src/app/(erp)/vouchers/receipt/page.tsx',
];

function read(file) {
  return readFileSync(join(root, file), 'utf8');
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    if (stat.isFile()) files.push(full);
  }
  return files;
}

for (const file of [...requiredFiles, ...requiredRoutes]) {
  if (!existsSync(join(root, file))) failures.push(`Missing required R15 file: ${file}`);
}

if (!failures.length) {
  const config = read('frontend/src/modules/finance/finance-resource-config.ts');
  for (const marker of [
    'FinanceResourceConfigs', 'FinanceScopedSurfaceConfigs', 'FinanceCompletionPrinciples',
    'customer-invoices', 'supplier-invoices', 'payments', 'expenses', 'accounts', 'journal-entries',
    'tax-codes', 'tax-reports', 'bank-accounts', 'receivables', 'payables',
    'submit-customer-invoice', 'approve-customer-invoice', 'post-customer-invoice', 'send-customer-invoice', 'cancel-customer-invoice',
    'match-supplier-invoice', 'approve-supplier-invoice', 'post-journal-entry', 'calculate-tax',
    'import-bank-statement', 'close-bank-reconciliation', 'create-payment-voucher', 'create-receipt-voucher',
    'Purchase Order + Goods Received Note + Supplier Invoice', 'reversal', 'idempotency', 'PostgreSQL transaction-bound',
  ]) if (!config.includes(marker)) failures.push(`Finance config missing ${marker}`);

  const api = read('frontend/src/modules/finance/api.ts');
  for (const marker of [
    'financeKeys', 'financeList', 'financeDetail', 'financeCreate', 'financeUpdate', 'financeCommand',
    '/customer-invoices', '/supplier-invoices', '/payments', '/expenses', '/accounts', '/journal-entries',
    '/tax/calculate', '/tax/reports', '/bank-statements/import', '/bank-reconciliations/:id/close', '/vouchers/payment', '/vouchers/receipt',
    'apiRequest', 'apiPost', 'createIdempotencyKey',
  ]) if (!api.includes(marker)) failures.push(`Finance API file missing ${marker}`);

  const commandPanel = read('frontend/src/modules/finance/finance-command-panel.tsx');
  for (const marker of [
    'CommandFormDialog', 'React Hook Form', 'Zod', 'CreatePaymentSchema', 'TaxCalculateSchema',
    'ImportBankStatementSchema', 'CloseBankReconciliationSchema', 'PaymentVoucherSchema', 'ReceiptVoucherSchema',
    'idempotency', 'Payment and voucher submission', 'three-way match', 'posted invoices',
  ]) if (!commandPanel.includes(marker)) failures.push(`Finance command panel missing ${marker}`);

  const list = read('frontend/src/modules/finance/finance-resource-list.tsx');
  for (const marker of ['EntityList', 'DataTable', 'ResourceFormDialog', 'Fastify /api/v1', 'does not invent a Next.js API']) if (!list.includes(marker)) failures.push(`Finance resource list missing ${marker}`);

  const detail = read('frontend/src/modules/finance/finance-resource-detail.tsx');
  for (const marker of ['FinanceCommandPanel', 'ActivityTimeline', 'AuditTimeline', 'customer-invoices', 'supplier-invoices', 'payments']) if (!detail.includes(marker)) failures.push(`Finance detail missing ${marker}`);

  const scoped = read('frontend/src/modules/finance/finance-scoped-surface.tsx');
  for (const marker of ['FinanceScopedSurface', 'CommandFormDialog', 'TaxCalculateSchema', 'Bank statement import', 'reconciliation', 'DataTable']) if (!scoped.includes(marker)) failures.push(`Finance scoped surface missing ${marker}`);

  const routeMap = read('frontend/src/lib/route-map.ts');
  for (const route of ['/finance/completion','/customer-invoices/[id]/post','/supplier-invoices/[id]/match','/payments/[id]/allocations','/journal-entries/[id]/post','/tax/calculate','/bank-statements/import','/bank-reconciliations/[id]/close','/vouchers/payment','/vouchers/receipt']) if (!routeMap.includes(route)) failures.push(`Route map missing ${route}`);

  const nav = read('frontend/src/modules/navigation/navigation-registry.ts');
  for (const label of ['Finance Completion','Create Customer Invoice','Create Supplier Invoice','Record Payment','Expenses','Chart of Accounts','Journal Entries','AR Aging','AP Aging','Tax Calculation','Tax Reports','Bank and Cash Management','Bank Statement Import','Payment Voucher','Receipt Voucher']) if (!nav.includes(label)) failures.push(`Navigation missing ${label}`);

  const registry = read('frontend/src/modules/forms/resource-form-registry.ts');
  for (const marker of ['CreateCustomerInvoiceSchema','CreateSupplierInvoiceSchema','CreatePaymentSchema','CreateExpenseSchema','CreateJournalEntrySchema','TaxCalculateSchema','PaymentVoucherSchema','ReceiptVoucherSchema','CloseBankReconciliationSchema']) if (!registry.includes(marker)) failures.push(`Form registry missing ${marker}`);

  const financeSource = walk(join(root, 'frontend/src/modules/finance')).filter((file) => /\.(tsx?|mts)$/.test(file)).map((file) => readFileSync(file, 'utf8')).join('\n');
  if (financeSource.includes('fetch(')) failures.push('Raw fetch found in finance frontend module; centralized API client is required');
  if (financeSource.includes('<table')) failures.push('Raw <table> found in finance frontend module; TanStack/DataTable wrapper is required');
  if (!financeSource.includes('TanStack') && !financeSource.includes('DataTable')) failures.push('Finance source must use TanStack/DataTable grid pattern');
  if (!financeSource.includes('React Hook Form') && !financeSource.includes('useForm')) failures.push('Finance source must use React Hook Form pattern through form wrappers');

  const packageJson = read('package.json');
  for (const marker of ['frontend:finance-frontend:check','pass:r15:source-check','pass:r15:certify:sh']) if (!packageJson.includes(marker)) failures.push(`package.json missing ${marker}`);

  const ci = read('.github/workflows/ci.yml');
  if (!ci.includes('R15 finance frontend source gate')) failures.push('CI missing R15 finance frontend source gate');
}

const result = {
  pass: 'R15',
  name: 'Finance Frontend Completion',
  sourceOnly,
  status: failures.length ? 'FAIL' : 'PASS_SOURCE_LEVEL',
  checkedAt: new Date().toISOString(),
  checkedRoutes: requiredRoutes.length,
  failures,
  limitations: [
    'Runtime install/typecheck/build are not claimed by this source gate.',
    'Finance runtime behavior, database transactions and E2E proof are deferred to R17-R21.',
    'pnpm-lock.yaml must still be generated and committed on a connected development machine.',
  ],
};
mkdirSync(join(root, 'certification-output'), { recursive: true });
writeFileSync(join(root, 'certification-output/pass-r15-finance-frontend.json'), JSON.stringify(result, null, 2));
if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
