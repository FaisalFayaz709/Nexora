#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const checks = [];
const failures = [];
const blockers = [];

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
function includesAll(name, content, required, message = '') {
  const missing = required.filter((needle) => !content.includes(needle));
  check(name, missing.length === 0, missing.length ? `${message || 'Missing invariant(s)'}: ${missing.join(', ')}` : '');
}
function excludesAll(name, content, forbidden, message = '') {
  const found = forbidden.filter((needle) => content.includes(needle));
  check(name, found.length === 0, found.length ? `${message || 'Forbidden invariant(s) found'}: ${found.join(', ')}` : '');
}
function runGate(name, args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 120000 });
  const passed = result.status === 0;
  check(name, passed, passed ? '' : `${args.join(' ')} failed with status ${result.status}. ${(result.stderr || result.stdout || '').slice(0, 1800)}`);
}
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
  check(`previous pass evidence is not failed: ${path}`, !failed, failed ? `${path} has failing status ${status}.` : `${path} status ${status}.`, { blocker: !sourceOnly && failed });
}
function routeInLock(lock, method, path) {
  return lock.lockedRoutes.some((r) => r.method === method && r.path === path);
}

mkdirSync(pathOf('certification-output'), { recursive: true });

if (!sourceOnly) {
  check('root pnpm-lock.yaml exists for strict runtime certification', hasFile('pnpm-lock.yaml'), 'pnpm-lock.yaml is missing; run pnpm install from root and commit the lockfile before claiming runtime GO.', { blocker: true });
}

previousEvidence('certification-output/pass-14-maintenance-rma-completion.json');

runGate('architecture gate still passes', ['scripts/check-architecture.mjs']);
runGate('contracts gate still passes', ['scripts/check-contracts.mjs']);
runGate('finance source gate passes', ['scripts/check-finance.mjs']);
runGate('commercial finance source gate passes', ['scripts/check-commercial-finance.mjs']);
runGate('finance frontend R15 source gate passes', ['scripts/check-pass-r15-finance-frontend.mjs', '--source-only']);

for (const required of [
  'backend/src/modules/finance/finance.routes.ts',
  'backend/src/modules/finance/finance.controller.ts',
  'backend/src/modules/finance/finance.service.ts',
  'backend/src/modules/finance/finance.repository.ts',
  'backend/src/modules/finance/finance.facade.ts',
  'backend/src/modules/finance/finance-completion-policy.ts',
  'backend/src/modules/commercial-finance/commercial-finance.routes.ts',
  'backend/src/modules/commercial-finance/commercial-finance.controller.ts',
  'backend/src/modules/commercial-finance/commercial-finance.service.ts',
  'backend/src/modules/commercial-finance/commercial-finance.repository.ts',
  'backend/src/modules/commercial-finance/commercial-finance.service.test.ts',
  'backend/src/modules/commercial-finance/commercial-finance.integration.test.ts',
  'shared/src/contracts/finance/finance-completion.contracts.ts',
  'shared/src/contracts/commercial-finance/commercial-finance.contracts.ts',
  'shared/src/contracts/finance/create-customer-invoice.contract.ts',
  'shared/src/contracts/finance/create-payment.contract.ts',
  'docs/contracts/capability-locks/finance.json',
  'docs/contracts/capability-locks/commercial-finance.json',
  'frontend/src/modules/finance/api.ts',
  'frontend/src/modules/commercial/api.ts',
  'frontend/src/modules/forms/resource-form-registry.ts',
  'frontend/src/modules/finance/finance-command-panel.tsx',
  'frontend/src/modules/finance/finance-resource-config.ts',
  'frontend/src/app/(erp)/vouchers/receipt/page.tsx',
  'shared/src/contracts/registry/locked-endpoints.json',
  'shared/src/contracts/registry/locked-endpoints.ts',
  'shared/src/contracts/registry/contract-maturity.json',
  'docs/contracts/api-endpoint-matrix.csv',
  'docs/contracts/api-endpoint-matrix.md',
]) check(`PASS 15 source file exists: ${required}`, hasFile(required), `${required} is required.`);

const financeLock = json('docs/contracts/capability-locks/finance.json');
check('Finance capability lock keeps 26 locked routes', financeLock.lockedRouteCount === 26, `Expected 26 finance routes, found ${financeLock.lockedRouteCount}.`);
for (const [method, path] of [
  ['POST', '/api/v1/customer-invoices/:id/post'],
  ['POST', '/api/v1/supplier-invoices/:id/match'],
  ['POST', '/api/v1/payments'],
  ['POST', '/api/v1/journal-entries/:id/post'],
  ['GET', '/api/v1/finance/receivables'],
  ['GET', '/api/v1/finance/payables'],
]) check(`Finance lock includes ${method} ${path}`, routeInLock(financeLock, method, path), `${method} ${path} missing from finance capability lock.`);

const commercialLock = json('docs/contracts/capability-locks/commercial-finance.json');
check('Commercial finance capability lock has 12 Appendix F/PASS 15 routes', commercialLock.lockedRouteCount === 12, `Expected 12 commercial finance routes, found ${commercialLock.lockedRouteCount}.`);
for (const [method, path] of [
  ['POST', '/api/v1/landed-costs/:id/post'],
  ['POST', '/api/v1/tax/calculate'],
  ['POST', '/api/v1/bank-statements/import'],
  ['POST', '/api/v1/bank-reconciliations/:id/close'],
  ['POST', '/api/v1/vouchers/payment'],
  ['POST', '/api/v1/vouchers/receipt'],
]) check(`Commercial finance lock includes ${method} ${path}`, routeInLock(commercialLock, method, path), `${method} ${path} missing from commercial finance lock.`);
includesAll('Commercial finance lock includes receipt voucher physical model and runtime note', JSON.stringify(commercialLock), [
  'ReceiptVoucher',
  'PENDING_ENVIRONMENT_PASS_15_RECEIPT_VOUCHER_SOURCE_ADDED',
]);

const financeRoutes = read('backend/src/modules/finance/finance.routes.ts');
includesAll('Finance routes expose locked Fastify commands and permissions', financeRoutes, [
  "defineLockedRoute('POST', '/api/v1/customer-invoices/:id/post')",
  "defineLockedRoute('POST', '/api/v1/supplier-invoices/:id/match')",
  "defineLockedRoute('POST', '/api/v1/payments')",
  "defineLockedRoute('POST', '/api/v1/journal-entries/:id/post')",
  "guard('payment.create')",
  "guard('journal.post')",
  "guard('finance.view')",
  "access.assertModuleEnabled(request.tenant!.organizationId, 'finance')",
], 'Finance route invariant missing');
excludesAll('Finance routes do not access Prisma directly', financeRoutes, ['@nexora/database', 'prisma.'], 'Routes must not access persistence directly');

const financeService = read('backend/src/modules/finance/finance.service.ts');
includesAll('Finance service owns invoice posting, payments, allocations, journal posting, three-way match and AR/AP reporting', financeService, [
  'async postCustomerInvoice',
  'async matchSupplierInvoice',
  'async approveSupplierInvoice',
  'async createPayment',
  'async postJournal',
  'balance',
  'PaymentAllocation',
  'assertPaymentIdempotencyKey',
  'calculateSupplierInvoiceThreeWayMatch',
  'withTransaction',
  'audit',
], 'Finance service invariant missing');
excludesAll('Finance critical service code does not import BullMQ or move money through queues', financeService, ['from \'bullmq\'', 'new Queue', 'Queue<', 'Worker<'], 'Money, invoice balance and journal state must be transactional, not queue-owned');

const completionPolicy = read('backend/src/modules/finance/finance-completion-policy.ts');
includesAll('Finance completion policy covers posted-ledger reversal, tax, bank, receipt voucher and runtime scenarios', completionPolicy, [
  'CustomerInvoice',
  'SupplierInvoice',
  'Payment',
  'JournalEntry',
  'TaxTransaction',
  'BankReconciliation',
  'PaymentVoucher',
  'ReceiptVoucher',
  'PAYMENT_CANONICAL_BODY_HASH_IDEMPOTENCY',
  'POSTED_LEDGER_REVERSAL_ONLY',
], 'Finance completion policy invariant missing');

const commercialRoutes = read('backend/src/modules/commercial-finance/commercial-finance.routes.ts');
includesAll('Commercial finance routes expose tax, bank, reconciliation and voucher commands through Fastify', commercialRoutes, [
  "defineLockedRoute('POST', '/api/v1/tax/calculate')",
  "defineLockedRoute('POST', '/api/v1/bank-statements/import')",
  "defineLockedRoute('POST', '/api/v1/bank-reconciliations/:id/close')",
  "defineLockedRoute('POST', '/api/v1/vouchers/payment')",
  "defineLockedRoute('POST', '/api/v1/vouchers/receipt')",
  "guard('tax.manage')",
  "guard('bank.manage')",
  'controller.receiptVoucher',
], 'Commercial route invariant missing');
excludesAll('Commercial finance routes do not access Prisma directly', commercialRoutes, ['@nexora/database', 'prisma.'], 'Routes must not access persistence directly');

const commercialController = read('backend/src/modules/commercial-finance/commercial-finance.controller.ts');
includesAll('Commercial finance controller parses shared schemas and delegates receipt/payment vouchers to service', commercialController, [
  'TaxCalculateSchema',
  'ImportBankStatementSchema',
  'CloseBankReconciliationSchema',
  'PaymentVoucherSchema',
  'ReceiptVoucherSchema',
  'this.service.calculateTax',
  'this.service.importBankStatement',
  'this.service.closeBankReconciliation',
  'this.service.createPaymentVoucher',
  'this.service.createReceiptVoucher',
], 'Commercial controller invariant missing');
excludesAll('Commercial finance controller has no direct persistence access', commercialController, ['@nexora/database', 'prisma.'], 'Controller must not access persistence directly');

const commercialService = read('backend/src/modules/commercial-finance/commercial-finance.service.ts');
includesAll('Commercial finance service completes landed cost, tax, bank statement, reconciliation and vouchers transactionally', commercialService, [
  'async postLandedCost',
  'async calculateTax',
  'async importBankStatement',
  'async closeBankReconciliation',
  'async createPaymentVoucher',
  'async createReceiptVoucher',
  "entityType: 'RECEIPT_VOUCHER'",
  "targetType: 'ReceiptVoucher'",
  'RECEIPT_VOUCHER_POSTED',
  "type: 'receipt_voucher.posted'",
  'linkReceiptVoucherJournal',
  'postCommercialJournal',
  'withBusinessNumber',
  'assertReconciliationNotClosed',
  'assertExactlyOneFundingAccount',
], 'Commercial finance service invariant missing');
excludesAll('Commercial finance critical service code does not import BullMQ or process financial effects asynchronously', commercialService, ['from \'bullmq\'', 'new Queue', 'Queue<', 'Worker<'], 'Critical finance state cannot be queue-owned');

const commercialRepo = read('backend/src/modules/commercial-finance/commercial-finance.repository.ts');
includesAll('Commercial finance repository owns voucher persistence and journal linking', commercialRepo, [
  'createPaymentVoucher',
  'linkPaymentVoucherJournal',
  'createReceiptVoucher',
  'linkReceiptVoucherJournal',
  'bankReconciliation.update',
  'taxTransaction.create',
  'organizationId',
], 'Commercial repository invariant missing');

const commercialContracts = read('shared/src/contracts/commercial-finance/commercial-finance.contracts.ts');
includesAll('Shared commercial finance contracts expose Pass 15 maturity and receipt voucher schema', commercialContracts, [
  'PASS_15_SOURCE_LEVEL_FINANCE_TAX_BANK_RECONCILIATION_COMPLETION',
  'TaxCalculateSchema',
  'ImportBankStatementSchema',
  'CloseBankReconciliationSchema',
  'PaymentVoucherSchema',
  'ReceiptVoucherSchema',
  'VoucherFundingAccountRule',
  'Either bankAccountId or cashAccountId is required',
], 'Commercial shared contract invariant missing');

const financeCompletionContracts = read('shared/src/contracts/finance/finance-completion.contracts.ts');
includesAll('Shared finance completion contracts include Pass 15 receipt-voucher scenarios', financeCompletionContracts, [
  'PASS_15_SOURCE_LEVEL_FINANCE_TAX_BANK_RECONCILIATION_COMPLETION',
  'RECEIPT_VOUCHER',
  'bank-or-cash-not-both',
  'payer-traceability',
  'PASS15-RECEIPT-VOUCHER-POSTS-JOURNAL-AND-PAYER-TRACE',
], 'Finance completion shared contract invariant missing');

const prisma = read('database/prisma/schema.prisma');
includesAll('Prisma schema includes core finance, tax, bank and receipt voucher models', prisma, [
  'model CustomerInvoice',
  'model SupplierInvoice',
  'model Payment',
  'model PaymentAllocation',
  'model JournalEntry',
  'model JournalLine',
  'model TaxCode',
  'model TaxTransaction',
  'model BankAccount',
  'model CashAccount',
  'model BankReconciliation',
  'model PaymentVoucher',
  'model ReceiptVoucher',
], 'Prisma model invariant missing');
const migrations = ['database/prisma/migrations/20260903000700_pass14_commercial_finance/migration.sql'];
for (const path of migrations) {
  check(`PASS 15 migration evidence exists: ${path}`, hasFile(path), `${path} required.`);
  if (hasFile(path)) includesAll(`Migration ${path} includes receipt voucher constraints`, read(path), [
    'CREATE TABLE "ReceiptVoucher"',
    'ReceiptVoucher_account_exclusive_check',
    'ReceiptVoucher_amount_check',
    'ReceiptVoucher_method_check',
  ]);
}

const registry = read('frontend/src/modules/forms/resource-form-registry.ts');
includesAll('Frontend resource registry uses RHF/Zod controlled field arrays for finance line-item forms', registry, [
  'CustomerInvoiceSchema',
  'SupplierInvoiceSchema',
  'CreatePaymentSchema',
  'CreateJournalEntrySchema',
  'TaxCalculateSchema',
  'ImportBankStatementSchema',
  'PaymentVoucherSchema',
  'ReceiptVoucherSchema',
  "endpoint: '/vouchers/receipt'",
  "name: 'items', label: 'Invoice items', type: 'array'",
  "name: 'allocations', label: 'Allocations', type: 'array'",
  "name: 'lines', label: 'Tax lines', type: 'array'",
  "name: 'lines', label: 'Statement lines', type: 'array'",
  "name: 'lines', label: 'Journal lines', type: 'array'",
], 'Frontend registry invariant missing');
excludesAll('Frontend resource registry does not hide critical finance arrays', registry, [
  "name: 'items', label: 'Invoice items JSON', type: 'hidden'",
  "name: 'allocations', label: 'Allocations JSON', type: 'hidden'",
  "name: 'lines', label: 'Tax lines JSON', type: 'hidden'",
  "name: 'lines', label: 'Journal lines JSON', type: 'hidden'",
], 'Critical finance arrays must be controlled, not hidden placeholders');

const financeApi = read('frontend/src/modules/finance/api.ts');
includesAll('Frontend finance API maps receipt voucher and command templates to centralized API client', financeApi, [
  "receiptVoucher: '/vouchers/receipt'",
  'createReceiptVoucher',
  'financeCommandEndpointTemplates',
  "'/vouchers/receipt'",
], 'Finance frontend API invariant missing');

const commandPanel = read('frontend/src/modules/finance/finance-command-panel.tsx');
includesAll('Finance command panel contains Pass 15 command schemas and controlled fields', commandPanel, [
  'CreatePaymentSchema',
  'TaxCalculateSchema',
  'ImportBankStatementSchema',
  'CloseBankReconciliationSchema',
  'PaymentVoucherSchema',
  'ReceiptVoucherSchema',
  "case 'create-receipt-voucher'",
  "type: 'array'",
  "type: 'json'",
  'Payment and voucher submission',
  'three-way match',
  'posted invoices',
], 'Finance command-panel invariant missing');

const resourceConfig = read('frontend/src/modules/finance/finance-resource-config.ts');
includesAll('Finance resource config exposes receipt voucher command surface', resourceConfig, [
  "'create-receipt-voucher'",
  "'receipt-voucher'",
  'Receipt voucher',
  '/vouchers/receipt',
  'bank.manage',
], 'Finance resource config invariant missing');

const receiptRoute = read('frontend/src/app/(erp)/vouchers/receipt/page.tsx');
includesAll('Receipt voucher route renders finance-scoped command page', receiptRoute, [
  'FinanceScopedCommandPage',
  'receipt-voucher',
]);

const routeMap = read('frontend/src/lib/route-map.ts');
includesAll('Frontend route map and navigation expose receipt voucher without creating Next.js business API', routeMap + '\n' + read('frontend/src/modules/navigation/navigation-registry.ts'), [
  '/vouchers/receipt',
  'Receipt Voucher',
  'bank.manage',
  '/vouchers/receipt',
], 'Route-map/navigation invariant missing');

const baseline = read('database/prisma/seed/baseline.seed.json');
includesAll('Baseline seed includes finance commercial voucher number sequences', baseline, [
  'PAYMENT_VOUCHER',
  'RECEIPT_VOUCHER',
  '"prefix": "PV"',
  '"prefix": "RV"',
], 'Baseline number-sequence seed invariant missing');

const lockedEndpointJson = JSON.stringify(json('shared/src/contracts/registry/locked-endpoints.json'));
includesAll('Locked endpoint registry includes Pass 15 finance/tax/bank/voucher endpoints', lockedEndpointJson, [
  '/api/v1/supplier-invoices/:id/match',
  '/api/v1/payments',
  '/api/v1/tax/calculate',
  '/api/v1/bank-statements/import',
  '/api/v1/bank-reconciliations/:id/close',
  '/api/v1/vouchers/payment',
  '/api/v1/vouchers/receipt',
], 'Locked endpoint registry invariant missing');

const status = blockers.length || failures.length
  ? (blockers.length ? 'HOLD_AUDIT_FOUND_BLOCKERS' : 'FAIL')
  : (sourceOnly || !hasFile('pnpm-lock.yaml') ? 'PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME' : 'PASS_STRICT_SOURCE_AND_RUNTIME_PREREQUISITES_READY');
const output = {
  pass: 'PASS_15',
  name: 'Finance Core, Tax, Bank/Cash and Reconciliation Completion',
  sourceOnly,
  status,
  checkedAt: new Date().toISOString(),
  checkedCount: checks.length,
  passedCount: checks.filter((c) => c.passed).length,
  blockerCount: blockers.length,
  failureCount: failures.length,
  checks,
  blockers,
  failures,
  limitations: [
    'This certification is source-level unless run without --source-only after pnpm-lock.yaml is generated and committed.',
    'Runtime install, typecheck, migrations, seed, Docker and E2E proof remain local-machine gates until the root lockfile exists.',
    'Financial/inventory/accounting behavior must still be proven with integration and E2E tests against PostgreSQL.'
  ],
};
writeFileSync(pathOf('certification-output/pass-15-finance-tax-bank-reconciliation.json'), JSON.stringify(output, null, 2) + '\n');
writeFileSync(pathOf('certification-output/PASS_15_FINANCE_TAX_BANK_RECONCILIATION_LOG.txt'), [
  `PASS_15 status: ${status}`,
  `checked: ${output.checkedCount}`,
  `passed: ${output.passedCount}`,
  `blockers: ${blockers.length}`,
  `failures: ${failures.length}`,
  ...blockers.map((b) => `BLOCKER: ${b}`),
  ...failures.map((f) => `FAILURE: ${f}`),
  '',
].join('\n'));
console.log(JSON.stringify(output, null, 2));
if (blockers.length || failures.length) process.exit(1);
