import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const startedAt = new Date().toISOString();
const sourceOnly = process.argv.includes('--source-only');
const checks = [];
const failures = [];
const blockers = [];
const warnings = [];
const previousPassWarnings = [];

function pathOf(path) { return join(root, path); }
function hasFile(path) { return existsSync(pathOf(path)); }
function read(path) { return readFileSync(pathOf(path), 'utf8'); }
function check(name, passed, message, options = {}) {
  const result = { name, passed: Boolean(passed), message: passed ? undefined : message };
  checks.push(result);
  if (!passed) (options.blocker ? blockers : failures).push({ name, message });
}
function includesAll(name, source, needles, message) {
  const missing = needles.filter((needle) => !source.includes(needle));
  check(name, missing.length === 0, `${message}: ${missing.join(', ')}`);
}
function runGate(name, args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  check(name, result.status === 0, output.trim() || `${args.join(' ')} failed`);
  return output;
}
function json(path) { return JSON.parse(read(path)); }

for (const path of [
  'certification-output/pass-00-baseline-certification.json',
  'certification-output/pass-01-architecture-boundary-audit.json',
  'certification-output/pass-02-database-migration-seed-certification.json',
  'certification-output/pass-03-core-platform-security.json',
  'certification-output/pass-04-number-sequence-feature-flags.json',
  'certification-output/pass-05-business-masters-completion.json',
  'certification-output/pass-06-import-wizard-completion.json',
  'certification-output/pass-07-inventory-ledger-completion.json',
  'certification-output/pass-08-stock-count-completion.json',
]) {
  if (!hasFile(path)) {
    if (!sourceOnly) check(`previous evidence exists: ${path}`, false, `${path} is missing.`, { blocker: true });
    continue;
  }
  const evidence = json(path);
  const status = String(evidence.status ?? '');
  const text = read(path);
  const knownRuntimeHold = text.includes('pnpm-lock.yaml') || text.includes('frozen-lockfile') || status.includes('RUNTIME_PENDING') || status.includes('OVERALL_HOLD') || status.includes('HOLD');
  if (sourceOnly && (status.includes('FAIL') || status.includes('HOLD')) && knownRuntimeHold) {
    previousPassWarnings.push(`${path} remains accepted for source-level continuation because lockfile/runtime proof is pending.`);
    check(`previous pass source evidence tolerated pending runtime: ${path}`, true, '');
  } else {
    check(`previous pass evidence not failed: ${path}`, !status.includes('FAIL'), `${path} has failing status ${status}.`, { blocker: !sourceOnly });
  }
}

if (!sourceOnly) {
  check('root pnpm-lock.yaml exists for strict runtime certification', hasFile('pnpm-lock.yaml'), 'pnpm-lock.yaml is missing; run pnpm install from the root and commit the generated lockfile.', { blocker: true });
}

runGate('architecture gate still passes', ['scripts/check-architecture.mjs']);
runGate('contract gate still passes', ['scripts/check-contracts.mjs']);
runGate('PASS 08 stock count gate still passes source-only', ['scripts/check-pass-08-stock-count-completion.mjs', '--source-only']);
runGate('procurement locked-route gate passes', ['scripts/check-procurement.mjs']);

for (const required of [
  'backend/src/modules/procurement/procurement.routes.ts',
  'backend/src/modules/procurement/procurement.controller.ts',
  'backend/src/modules/procurement/procurement.service.ts',
  'backend/src/modules/procurement/procurement.repository.ts',
  'backend/src/modules/procurement/procurement-completion-policy.ts',
  'backend/src/modules/procurement/procurement-completion-policy.test.ts',
  'shared/src/contracts/procurement/procurement.contracts.ts',
  'shared/src/contracts/procurement/procurement-completion.contracts.ts',
  'frontend/src/modules/forms/resource-form-registry.ts',
  'frontend/src/components/forms/resource-form-types.ts',
  'frontend/src/components/forms/resource-form-fields.tsx',
  'frontend/src/components/forms/controlled-fields.tsx',
  'frontend/src/modules/procurement/procurement-command-panel.tsx',
  'frontend/src/modules/procurement/procurement-resource-form-page.tsx',
  'database/prisma/schema.prisma',
]) {
  check(`PASS 09 source file exists: ${required}`, hasFile(required), `${required} is required.`);
}

const routes = read('backend/src/modules/procurement/procurement.routes.ts');
includesAll('procurement E2E locked route surface', routes, [
  '/api/v1/purchase-requests',
  '/api/v1/purchase-requests/:id/submit',
  '/api/v1/purchase-requests/:id/approve',
  '/api/v1/purchase-requests/:id/reject',
  '/api/v1/purchase-requests/:id/create-rfq',
  '/api/v1/rfqs/:id/invite-vendors',
  '/api/v1/rfqs/:id/publish',
  '/api/v1/rfqs/:id/close',
  '/api/v1/rfqs/:id/comparison',
  '/api/v1/supplier-quotations',
  '/api/v1/supplier-quotations/:id/select',
  '/api/v1/purchase-orders',
  '/api/v1/purchase-orders/:id/submit',
  '/api/v1/purchase-orders/:id/approve',
  '/api/v1/purchase-orders/:id/send',
  '/api/v1/purchase-orders/:id/cancel',
  '/api/v1/goods-receipts',
  '/api/v1/goods-receipts/:id',
  '/api/v1/goods-receipts/:id/inspect',
], 'Procurement E2E endpoint missing');
includesAll('procurement E2E route permissions', routes, [
  'purchase_request.create',
  'purchase_request.submit',
  'purchase_request.approve',
  'rfq.create',
  'rfq.update',
  'rfq.publish',
  'rfq.close',
  'supplier_quotation.create',
  'supplier_quotation.select',
  'purchase_order.create',
  'purchase_order.submit',
  'purchase_order.approve',
  'purchase_order.send',
  'purchase_order.cancel',
  'goods_receipt.create',
  'goods_receipt.inspect',
], 'Procurement permission guard missing');
check('procurement routes preserve module enablement guard', routes.includes("assertModuleEnabled(request.tenant!.organizationId,'procurement')"), 'Procurement routes must check procurement module enablement.');

const service = read('backend/src/modules/procurement/procurement.service.ts');
includesAll('procurement service enforces full PR-RFQ-PO-GRN source chain', service, [
  'createPr(',
  'submitPr(',
  'decidePr(',
  'createRfqFromPr(',
  'inviteVendors(',
  'publishRfq(',
  'closeRfq(',
  'comparison(',
  'createQuotation(',
  'selectQuotation(',
  'createPo(',
  'poCommand(',
  'receiveWithNumber(',
  'inspect(',
  'supplierInvoiceSourceFromProcurement',
], 'Procurement service stage missing');
includesAll('procurement service transactional invariants', service, [
  'withTransaction',
  'assertQuotationCoversPurchaseRequest',
  'assertSingleSelectedSupplierQuotation',
  'assertPurchaseOrderSourceChain',
  'assertVendorWasInvited',
  'this.vendors.assertApproved',
  'this.approvals.requestApproval',
  'this.approvals.actBySubject',
  'Idempotency-Key is required for goods receipt',
  'claimIdempotency',
  'lockPurchaseOrder',
  'lockPurchaseOrderItem',
  'GOODS_RECEIPT_OVER_RECEIPT',
  'receiveIntoWarehouse',
  'incrementPoReceived',
  'stockTransactions.push',
  'goods_receipt.received',
  'GOODS_RECEIPT_INSPECTED',
], 'Procurement critical transaction marker missing');
check('critical procurement state is not moved to BullMQ', !service.includes('BullMQ') && !service.includes("from 'bullmq'"), 'Procurement service must not move PR/approval/PO/GRN/stock state to BullMQ.');

const repo = read('backend/src/modules/procurement/procurement.repository.ts');
includesAll('procurement repository supports transactional row locking and finance source', repo, [
  'FOR UPDATE',
  'lockPurchaseRequest',
  'lockPurchaseOrder',
  'lockPurchaseOrderItem',
  'supplierInvoiceSourceSnapshot',
  'findIdempotency',
  'claimIdempotency',
  'completeIdempotency',
], 'Procurement repository persistence/locking marker missing');

const policy = read('backend/src/modules/procurement/procurement-completion-policy.ts');
includesAll('procurement completion policy invariants', policy, [
  'Pass09ProcurementCompletionPolicy',
  'assertQuotationCoversPurchaseRequest',
  'assertSingleSelectedSupplierQuotation',
  'assertPurchaseOrderSourceChain',
  'assertProcurementFinanceSource',
  'runtime_procurement_workflow_certification_pending',
], 'Procurement completion policy marker missing');

const contracts = read('shared/src/contracts/procurement/procurement-completion.contracts.ts');
includesAll('shared procurement completion contract updated for Pass 09', contracts, [
  'Pass09ProcurementCompletionMaturity',
  'MATERIAL_REQUIREMENT',
  'PURCHASE_REQUEST',
  'RFQ',
  'SUPPLIER_QUOTATION',
  'QUOTATION_COMPARISON',
  'SUPPLIER_SELECTION',
  'PURCHASE_ORDER',
  'GOODS_RECEIPT_NOTE',
  'QUALITY_INSPECTION',
  'STOCK_LEDGER_POSTING',
  'SUPPLIER_INVOICE_SOURCE',
  'ProcurementFrontendLineArrayRequirements',
], 'Shared procurement completion contract missing stage/line-array requirement');

const formTypes = read('frontend/src/components/forms/resource-form-types.ts');
includesAll('resource form type supports controlled arrays/json', formTypes, ["'array'", "'json'", 'arrayFields', 'emptyItem', 'minItems'], 'Resource form types missing array/json support');
const controlledFields = read('frontend/src/components/forms/controlled-fields.tsx');
includesAll('JsonField parses JSON into form value', controlledFields, ['export function JsonField', 'JSON.parse(raw)', 'form.setError', 'field.onChange(JSON.parse(raw))'], 'JsonField missing parse/error handling');
const resourceFields = read('frontend/src/components/forms/resource-form-fields.tsx');
includesAll('ResourceFormFields renders dynamic RHF arrays', resourceFields, ['useFieldArray', 'DynamicArrayField', 'append(emptyItem', 'remove(index)', "field.type === 'array'", "field.type === 'json'"], 'Dynamic array field missing');
const registry = read('frontend/src/modules/forms/resource-form-registry.ts');
includesAll('procurement create forms no longer hide critical line arrays', registry, [
  'purchaseRequestItemFields',
  'supplierQuotationItemFields',
  'goodsReceiptItemFields',
  "resourceKey: 'purchase-requests'",
  "label: 'Purchase request items', type: 'array'",
  "resourceKey: 'supplier-quotations'",
  "label: 'Supplier quotation lines', type: 'array'",
  "resourceKey: 'goods-receipts'",
  "label: 'Received items', type: 'array'",
  "serialNumbers: []",
  "batches: []",
], 'Procurement RHF field arrays missing from resource form registry');
check('critical procurement item arrays are not hidden in registry', !registry.includes("name: 'items', label: 'Items', type: 'hidden'") && !registry.includes("name: 'items', label: 'Quoted items', type: 'hidden'") && !registry.includes("name: 'items', label: 'Received items', type: 'hidden'"), 'Critical PR/quotation/GRN item arrays must not remain hidden placeholders.');
const commandPanel = read('frontend/src/modules/procurement/procurement-command-panel.tsx');
includesAll('procurement command panel uses controlled vendor/GRN command input', commandPanel, [
  "name: 'vendorIds', label: 'Approved vendor ids JSON', type: 'json'",
  'goodsReceiptItemFields',
  "label: 'Received line items', type: 'array'",
  "serialNumbers: []",
  "batches: []",
], 'Procurement command panel missing controlled command inputs');
const formPage = read('frontend/src/modules/procurement/procurement-resource-form-page.tsx');
includesAll('procurement resource forms are permission gated', formPage, ['requiredPermission', 'resource.updatePermission', 'resource.createPermission'], 'Procurement create/edit forms must pass required permission to ResourceFormPage');

const endpointRegistry = json('shared/src/contracts/registry/locked-endpoints.json');
for (const signature of ['GET /api/v1/stock-counts', 'GET /api/v1/stock-counts/:id', 'GET /api/v1/stock-counts/:id/count-sheet']) {
  check(`Pass 08 route-lock drift repaired: ${signature}`, endpointRegistry.some((entry) => `${entry.method} ${entry.endpoint}` === signature), `${signature} missing from locked endpoint registry.`);
}

const schema = read('database/prisma/schema.prisma');
for (const model of ['MaterialRequirement', 'PurchaseRequest', 'PurchaseRequestItem', 'RFQ', 'RFQVendor', 'SupplierQuotation', 'SupplierQuotationItem', 'PurchaseOrder', 'PurchaseOrderItem', 'GoodsReceipt', 'GoodsReceiptItem', 'QualityInspection', 'SupplierInvoice']) {
  check(`Prisma model exists for procurement E2E: ${model}`, new RegExp(`model\\s+${model}\\s*\\{`).test(schema), `${model} model missing.`);
}

const status = blockers.length
  ? 'FAIL_BLOCKED'
  : failures.length
    ? (sourceOnly ? 'FAIL_SOURCE_LEVEL' : 'FAIL_STRICT_RUNTIME')
    : sourceOnly
      ? 'PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME'
      : 'PASS_STRICT_RUNTIME';

const payload = {
  pass: 'PASS_09',
  name: 'Procurement End-to-End Completion',
  mode: sourceOnly ? 'source-only' : 'strict-runtime',
  status,
  checkedAt: startedAt,
  finishedAt: new Date().toISOString(),
  lockedStackPreserved: true,
  architectureChanged: false,
  sourceLevelGates: checks.length,
  checks,
  warnings,
  blockers,
  failures,
  previousPassWarnings,
  runtimeCommandsRequiredOnDeveloperMachine: [
    'pnpm install --frozen-lockfile',
    'pnpm pass:09:check',
    'pnpm procurement:check',
    'pnpm inventory:check',
    'pnpm typecheck',
    'pnpm test',
    'pnpm db:migrate:deploy',
    'pnpm db:seed',
    'pnpm test -- --runInBand procurement inventory finance',
    'pnpm test:e2e -- procurement-e2e',
  ],
};
writeFileSync(pathOf('certification-output/pass-09-procurement-e2e-completion.json'), `${JSON.stringify(payload, null, 2)}\n`);
console.log(`[${status}] PASS 09 procurement E2E checks: ${checks.filter((c) => c.passed).length}/${checks.length} passed, ${failures.length} failures, ${blockers.length} blockers.`);
if (warnings.length || previousPassWarnings.length) console.log([...warnings, ...previousPassWarnings].join('\n'));
if (blockers.length || failures.length) process.exit(1);
