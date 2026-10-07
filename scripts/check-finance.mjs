import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];

const prior = spawnSync(process.execPath, ['scripts/check-maintenance.mjs'], { stdio: 'inherit' });
if (prior.status !== 0) process.exit(prior.status ?? 1);

const lock = JSON.parse(readFileSync(join(root, 'docs/contracts/capability-locks/finance.json'), 'utf8'));
const catalog = readFileSync(join(root, 'docs/contracts/api-endpoint-matrix.csv'), 'utf8');
const routes = readFileSync(join(root, 'backend/src/modules/finance/finance.routes.ts'), 'utf8');
for (const route of lock.lockedRoutes) {
  const sig = `defineLockedRoute('${route.method}', '${route.path}')`;
  if (!routes.includes(sig)) failures.push(`Missing locked Finance route: ${route.method} ${route.path}`);
  if (!catalog.includes(route.path)) failures.push(`Finance route absent frozen catalog: ${route.path}`);
  if (!routes.includes(`'${route.permission}'`)) failures.push(`Finance permission guard missing: ${route.permission}`);
}
const routeMatches = [...routes.matchAll(/defineLockedRoute\('([A-Z]+)', '([^']+)'\)/g)].map(m=>`${m[1]} ${m[2]}`);
if (new Set(routeMatches).size !== lock.lockedRouteCount) failures.push(`Expected ${lock.lockedRouteCount} Finance routes, found ${new Set(routeMatches).size}`);

const schema = readFileSync(join(root,'database/prisma/schema.prisma'),'utf8');
for (const model of lock.newPhysicalModels) {
  if (!new RegExp(`model\\s+${model}\\s*\\{`).test(schema)) failures.push(`Missing Finance Prisma model: ${model}`);
}
if (/\bFloat\b/.test(schema)) failures.push('Float introduced into Prisma schema.');
for (const invariant of [
  'customerInvoices CustomerInvoice[]','supplierInvoices SupplierInvoice[]','payments Payment[]','journalEntries JournalEntry[]',
  'customerInvoice CustomerInvoice? @relation("CustomerInvoiceApproval")','supplierInvoice SupplierInvoice? @relation("SupplierInvoiceApproval")','expense Expense? @relation("ExpenseApproval")'
]) if (!schema.includes(invariant)) failures.push(`Finance schema invariant missing: ${invariant}`);

const migration = readFileSync(join(root,'database/prisma/migrations/20260903000600_pass13_finance/migration.sql'),'utf8');
for (const invariant of [
  'CustomerInvoice_organizationId_invoiceNo_key','SupplierInvoice_organizationId_invoiceNo_key','Payment_organizationId_paymentNo_key','JournalEntry_organizationId_entryNo_key',
  'JournalLine_one_side_check','JournalLine_nonzero_check','PaymentAllocation_invoice_type_check','forbid_posted_journal_mutation',
  "'DRAFT','APPROVED','SENT','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED'",
  "'NOT_MATCHED','MATCHED','VARIANCE','BLOCKED'"
]) if (!migration.includes(invariant)) failures.push(`Finance migration invariant missing: ${invariant}`);

const service = readFileSync(join(root,'backend/src/modules/finance/finance.service.ts'),'utf8');
const corePolicy = readFileSync(join(root,'backend/src/modules/finance/finance-core-policy.ts'),'utf8');
const completionPolicy = readFileSync(join(root,'backend/src/modules/finance/finance-completion-policy.ts'),'utf8');
const financeBoundarySource = [service, corePolicy, completionPolicy].join('\n');
const financeBoundaryCompact = financeBoundarySource.replace(/\s+/g, '');
for (const invariant of [
  "entityType:'CUSTOMER_INVOICE'", "entityType:'SUPPLIER_INVOICE'", "entityType:'PAYMENT'", "entityType:'JOURNAL_ENTRY'",
  'IDEMPOTENCY_KEY_REQUIRED', 'PAYMENT_ALLOCATION_MISMATCH', 'PAYMENT_OVER_ALLOCATED', 'JOURNAL_ENTRY_UNBALANCED',
  'requestApprovalIfConfigured', "subjectType:'CustomerInvoice'", "subjectType:'SupplierInvoice'", "subjectType:'Expense'",
  'this.procurement.supplierInvoiceSource', "type:'invoice.sent'", 'CUSTOMER_INVOICE_POSTED', 'PAYMENT_POSTED'
]) if (!financeBoundaryCompact.includes(invariant.replace(/\s+/g, ''))) failures.push(`Finance service/policy invariant missing: ${invariant}`);
for (const serviceCall of [
  'assertPaymentIdempotencyKey(idempotencyKey)',
  'assertPaymentAllocationTotal(amount,input.allocations)',
  'assertInvoiceCanReceivePayment',
  'assertJournalBalanced(lines)'
]) if (!service.replace(/\s+/g, '').includes(serviceCall.replace(/\s+/g, ''))) failures.push(`Finance service does not call centralized policy: ${serviceCall}`);
if (service.includes('BullMQ') || service.includes("from 'bullmq'")) failures.push('Critical Finance state must not use BullMQ.');
if (service.includes('../procurement/') && !service.includes('type { ProcurementFacade }')) failures.push('Finance must use ProcurementFacade boundary, not private procurement imports.');

const module = readFileSync(join(root,'backend/src/modules/finance/finance.module.ts'),'utf8');
for (const boundary of [
  "type { ApprovalFacade } from '../approvals/index.js'", "type { CustomerFacade } from '../customers/index.js'",
  "type { EmployeeFacade } from '../hr/index.js'", "type { ProcurementFacade } from '../procurement/index.js'",
  "type { ProjectFacade } from '../projects/index.js'", "type { VendorGovernanceFacade } from '../vendors/index.js'"
]) if (!module.includes(boundary)) failures.push(`Finance public-facade boundary missing: ${boundary}`);

const procurementFacade = readFileSync(join(root,'backend/src/modules/procurement/procurement.facade.ts'),'utf8');
if (!procurementFacade.includes('supplierInvoiceSource(')) failures.push('ProcurementFacade lacks supplierInvoiceSource for Finance three-way match.');

const app = readFileSync(join(root,'backend/src/app.ts'),'utf8');
for (const invariant of ['createFinanceModule(', "approvalSubjects.register('CustomerInvoice', finance.facade)", "approvalSubjects.register('SupplierInvoice', finance.facade)", "approvalSubjects.register('Expense', finance.facade)", 'app.register(finance.plugin']) {
  if (!app.includes(invariant)) failures.push(`Finance app composition missing: ${invariant}`);
}
for (const file of [
  'backend/src/modules/finance/finance.repository.ts','backend/src/modules/finance/finance.service.ts','backend/src/modules/finance/finance.controller.ts','backend/src/modules/finance/finance.routes.ts','backend/src/modules/finance/finance.facade.ts','backend/src/modules/finance/finance.module.ts',
  'frontend/src/app/(erp)/customer-invoices/page.tsx','frontend/src/app/(erp)/supplier-invoices/page.tsx','frontend/src/app/(erp)/expenses/page.tsx','frontend/src/app/(erp)/payments/page.tsx',
]) if (!existsSync(join(root,file))) failures.push(`Missing Finance file: ${file}`);

const pkg = JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
if (!String(pkg.scripts?.['verify:static'] ?? '').includes('finance:check')) failures.push('Root verify:static does not include finance:check.');

if (failures.length) {
  console.error('Finance gate FAILED');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log(`Finance gate PASSED: ${lock.lockedRouteCount} exact locked Finance routes and ${lock.newPhysicalModelCount} Finance models.`);
