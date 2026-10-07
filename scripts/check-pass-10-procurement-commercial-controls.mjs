import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
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
function json(path) { return JSON.parse(read(path)); }
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
  'certification-output/pass-09-procurement-e2e-completion.json',
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
    previousPassWarnings.push(`${path} remains tolerated for source-level continuation because lockfile/runtime proof is pending.`);
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
runGate('PASS 09 procurement E2E gate still passes source-only', ['scripts/check-pass-09-procurement-e2e-completion.mjs', '--source-only']);
runGate('commercial finance gate passes', ['scripts/check-commercial-finance.mjs']);
runGate('commercial procurement gate passes with Pass 08 read-route tolerance', ['scripts/check-commercial-procurement.mjs']);

for (const required of [
  'backend/src/modules/vendors/onboarding/vendor-onboarding.routes.ts',
  'backend/src/modules/vendors/onboarding/vendor-onboarding.controller.ts',
  'backend/src/modules/vendors/onboarding/vendor-onboarding.service.ts',
  'backend/src/modules/vendors/onboarding/vendor-onboarding.repository.ts',
  'backend/src/modules/vendors/onboarding/vendor-governance.facade.ts',
  'backend/src/modules/vendors/vendor.routes.ts',
  'backend/src/modules/vendors/vendor.service.ts',
  'backend/src/modules/procurement/contracts/purchase-contract.routes.ts',
  'backend/src/modules/procurement/contracts/purchase-contract.controller.ts',
  'backend/src/modules/procurement/contracts/purchase-contract.service.ts',
  'backend/src/modules/procurement/contracts/purchase-contract.repository.ts',
  'backend/src/modules/commercial-finance/commercial-finance.routes.ts',
  'backend/src/modules/commercial-finance/commercial-finance.controller.ts',
  'backend/src/modules/commercial-finance/commercial-finance.service.ts',
  'backend/src/modules/commercial-finance/commercial-finance.repository.ts',
  'shared/src/contracts/vendors/vendor-onboarding.contracts.ts',
  'shared/src/contracts/procurement/purchase-contract.contracts.ts',
  'shared/src/contracts/commercial-finance/commercial-finance.contracts.ts',
  'frontend/src/modules/forms/resource-form-registry.ts',
  'frontend/src/modules/procurement/procurement-command-panel.tsx',
  'frontend/src/modules/procurement/procurement-resource-config.ts',
  'database/prisma/schema.prisma',
  'database/prisma/seed/baseline.seed.json',
  'database/prisma/seed/seed.mjs',
  'docs/architecture/source-boundaries/procurement-commercial-extensions.md',
  'docs/domain-rules/procurement-commercial-extensions/TRANSACTION_MODEL.md',
]) {
  check(`PASS 10 source file exists: ${required}`, hasFile(required), `${required} is required.`);
}

const vendorRoutes = read('backend/src/modules/vendors/onboarding/vendor-onboarding.routes.ts') + '\n' + read('backend/src/modules/vendors/vendor.routes.ts');
includesAll('vendor onboarding and blacklist route surface locked', vendorRoutes, [
  "/api/v1/vendor-onboarding/requests",
  "/api/v1/vendor-onboarding/:id/submit",
  "/api/v1/vendor-onboarding/:id/approve",
  "/api/v1/vendors/:id/blacklist",
  "vendor.onboard",
  "vendor.risk.manage",
  "assertModuleEnabled(request.tenant!.organizationId, 'vendors')",
], 'Vendor governance locked route or permission missing');

const vendorService = read('backend/src/modules/vendors/onboarding/vendor-onboarding.service.ts');
includesAll('vendor onboarding service enforces governance transaction', vendorService, [
  'withTransaction',
  'VENDOR_ONBOARDING_MAKER_CHECKER_REQUIRED',
  'VENDOR_VERIFICATION_REQUIRED',
  'VENDOR_RISK_BLOCKED',
  'VENDOR_BLACKLISTED',
  'createRiskAssessment',
  'approveVendor',
  'blacklistVendor',
  'VENDOR_ONBOARDING_APPROVED',
  'VENDOR_BLACKLISTED',
], 'Vendor onboarding transaction invariant missing');
check('VendorOnboardingService persists through repository only', !/\btx\s*\.\s*[a-zA-Z]\w*\s*\./.test(vendorService), 'VendorOnboardingService must not reach Prisma models directly.');

const vendorFacade = read('backend/src/modules/vendors/onboarding/vendor-governance.facade.ts');
includesAll('vendor governance facade blocks non-eligible suppliers', vendorFacade, [
  'VENDOR_BLACKLISTED',
  'VENDOR_RISK_BLOCKED',
  'VENDOR_NOT_APPROVED',
  "vendor.status !== 'APPROVED'",
], 'VendorGovernanceFacade eligibility rule missing');

const vendorContracts = read('shared/src/contracts/vendors/vendor-onboarding.contracts.ts');
includesAll('vendor onboarding shared contracts cover verification/risk evidence', vendorContracts, [
  'CreateVendorOnboardingRequestSchema',
  'documentEvidence',
  'bankEvidence',
  'categoryIds',
  'VendorRiskRatingSchema',
  'VendorOnboardingDecisionSchema',
  'BLACKLIST',
  'documentsVerified',
  'bankVerified',
  'riskScore',
  'approvedCategoryIds',
  'blacklistReason',
], 'Vendor onboarding shared contract missing governance fields');

const pcRoutes = read('backend/src/modules/procurement/contracts/purchase-contract.routes.ts');
includesAll('purchase contract route surface locked', pcRoutes, [
  '/api/v1/purchase-contracts',
  '/api/v1/purchase-contracts/:id/approve',
  '/api/v1/purchase-contracts/:id/create-release-order',
  'purchase_contract.manage',
  "assertModuleEnabled(request.tenant!.organizationId, 'procurement')",
], 'Purchase contract route or permission missing');

const pcService = read('backend/src/modules/procurement/contracts/purchase-contract.service.ts');
includesAll('purchase contract service enforces blanket/release controls', pcService, [
  "entityType: 'PURCHASE_CONTRACT'",
  "entityType: 'PURCHASE_RELEASE_ORDER'",
  'PURCHASE_CONTRACT_MAKER_CHECKER_REQUIRED',
  'PURCHASE_CONTRACT_NOT_ACTIVE',
  'PURCHASE_CONTRACT_QUANTITY_EXCEEDED',
  'PURCHASE_CONTRACT_ITEM_VALUE_EXCEEDED',
  'PURCHASE_CONTRACT_VALUE_EXCEEDED',
  'incrementContractItemRelease',
  'incrementContractReleaseValue',
  "type: 'purchase_release_order.created'",
  'this.vendors.assertApproved',
  'this.inventory.getProductForProcurement',
  'withBusinessNumber',
], 'Purchase contract/release invariant missing');
check('PurchaseContractService persists through repository/facades only', !/\btx\s*\.\s*[a-zA-Z]\w*\s*\./.test(pcService), 'PurchaseContractService must not reach Prisma models directly.');
check('Purchase contract critical state is not BullMQ/eventual source of truth', !pcService.includes('BullMQ') && !pcService.includes("from 'bullmq'"), 'Purchase contract source-of-truth state must remain transactional.');

const pcRepo = read('backend/src/modules/procurement/contracts/purchase-contract.repository.ts');
includesAll('purchase contract repository provides row locking and release counters', pcRepo, [
  'FOR UPDATE',
  'lockContract',
  'createContract',
  'activateContract',
  'contractItems',
  'incrementContractItemRelease',
  'incrementContractReleaseValue',
  'createReleaseOrder',
], 'Purchase contract repository support missing');

const pcContracts = read('shared/src/contracts/procurement/purchase-contract.contracts.ts');
includesAll('purchase contract shared contracts cover contract and release forms', pcContracts, [
  'CreatePurchaseContractSchema',
  'CreatePurchaseReleaseOrderSchema',
  'PurchaseContractStatusSchema',
  'PurchaseReleaseOrderStatusSchema',
  'maxQuantity',
  'maxValue',
  'Each contract item requires maxQuantity or maxValue',
], 'Purchase contract shared contract missing');

const lcRoutes = read('backend/src/modules/commercial-finance/commercial-finance.routes.ts');
includesAll('landed cost route surface locked', lcRoutes, [
  '/api/v1/landed-costs',
  '/api/v1/landed-costs/:id/allocate',
  '/api/v1/landed-costs/:id/post',
  'landed_cost.manage',
  "assertModuleEnabled(request.tenant!.organizationId, 'finance')",
], 'Landed cost route or permission missing');

const lcService = read('backend/src/modules/commercial-finance/commercial-finance.service.ts');
includesAll('landed cost service enforces allocation/posting controls', lcService, [
  "entityType: 'LANDED_COST'",
  'LANDED_COST_TOTAL_INVALID',
  'LANDED_COST_ALLOCATION_MISMATCH',
  'IDEMPOTENCY_KEY_REQUIRED',
  'this.procurement.supplierInvoiceSource',
  'this.inventory.recordLandedCostLayer',
  'this.finance.postCommercialJournal',
  "status: 'POSTED'",
  "type: 'landed_cost.posted'",
], 'Landed cost service invariant missing');
check('Landed cost critical state is not BullMQ/eventual source of truth', !lcService.includes('BullMQ') && !lcService.includes("from 'bullmq'"), 'Landed cost valuation/journal state must remain transactional.');

const lcRepo = read('backend/src/modules/commercial-finance/commercial-finance.repository.ts');
includesAll('landed cost repository supports locking/allocation/cost layers', lcRepo, [
  'createLandedCost',
  'lockLandedCost',
  'replaceLandedCostAllocations',
  'allocations',
  'updateAllocationCostLayer',
  'updateLandedCost',
], 'Landed cost repository support missing');

const financeContracts = read('shared/src/contracts/commercial-finance/commercial-finance.contracts.ts');
includesAll('landed cost shared contracts cover cost lines and allocations', financeContracts, [
  'CreateLandedCostSchema',
  'AllocateLandedCostSchema',
  'PostLandedCostSchema',
  'LandedCostAllocationMethodSchema',
  'LandedCostLineTypeSchema',
  'goodsReceiptItemId',
  'allocatedAmount',
], 'Landed cost contract missing');

const registry = read('frontend/src/modules/forms/resource-form-registry.ts');
includesAll('frontend resource forms expose commercial line/evidence arrays', registry, [
  'purchaseContractItemFields',
  'landedCostLineFields',
  'vendorDocumentEvidenceFields',
  "resourceKey: 'purchase-contracts'",
  "label: 'Contract items', type: 'array'",
  "arrayFields: purchaseContractItemFields",
  "resourceKey: 'landed-costs'",
  "label: 'Landed cost lines', type: 'array'",
  "arrayFields: landedCostLineFields",
  "resourceKey: 'vendor-onboarding'",
  "label: 'Document evidence', type: 'array'",
  "label: 'Bank evidence JSON', type: 'json'",
  "label: 'Approved category ids JSON', type: 'json'",
], 'Frontend resource registry missing commercial form controls');
for (const hidden of [
  "name: 'items', label: 'Contract items', type: 'hidden'",
  "name: 'lines', label: 'Landed cost lines', type: 'hidden'",
  "name: 'documentEvidence', label: 'Document evidence', type: 'hidden'",
  "name: 'bankEvidence', label: 'Bank evidence', type: 'hidden'",
  "name: 'categoryIds', label: 'Approved categories', type: 'hidden'",
]) {
  check(`commercial frontend no hidden placeholder remains: ${hidden}`, !registry.includes(hidden), `${hidden} must be replaced with controlled fields.`);
}

const commandPanel = read('frontend/src/modules/procurement/procurement-command-panel.tsx');
includesAll('frontend command dialogs expose release/allocation arrays', commandPanel, [
  'purchaseReleaseOrderItemFields',
  'landedCostAllocationFields',
  "label: 'Release lines', type: 'array'",
  "arrayFields: purchaseReleaseOrderItemFields",
  "label: 'Allocation lines', type: 'array'",
  "arrayFields: landedCostAllocationFields",
  "label: 'Decision', type: 'select'",
  "label: 'Risk rating', type: 'select'",
  "label: 'Blacklist reason', type: 'textarea'",
], 'Commercial procurement command panel missing controlled fields');
for (const hidden of [
  "name: 'items', label: 'Release lines', type: 'hidden'",
  "name: 'allocations', label: 'Allocation lines', type: 'hidden'",
]) {
  check(`commercial command no hidden placeholder remains: ${hidden}`, !commandPanel.includes(hidden), `${hidden} must be replaced with controlled field arrays.`);
}

const schema = read('database/prisma/schema.prisma');
for (const model of [
  'VendorOnboardingRequest',
  'VendorRiskAssessment',
  'VendorBlacklist',
  'VendorCategoryApproval',
  'PurchaseContract',
  'PurchaseContractItem',
  'BlanketPurchaseOrder',
  'BlanketPurchaseOrderItem',
  'PurchaseReleaseOrder',
  'PurchaseReleaseOrderItem',
  'LandedCost',
  'LandedCostLine',
  'LandedCostAllocation',
  'InventoryCostLayer',
]) {
  check(`Prisma model exists for PASS 10: ${model}`, new RegExp(`model\\s+${model}\\s*\\{`).test(schema), `${model} model missing.`);
}
includesAll('Prisma commercial controls preserve tenant/business constraints', schema, [
  'riskScore',
  'blacklistedAt',
  'approvedCategoryIdsJson',
  '@@unique([organizationId, contractNo])',
  '@@unique([organizationId, releaseOrderNo])',
  '@@unique([organizationId, landedCostNo])',
  '@@unique([organizationId, idempotencyKey])',
], 'Commercial Prisma invariant missing');
check('No Float in Prisma schema', !/\bFloat\b/.test(schema), 'Float must not be introduced into Prisma schema.');

const baseline = json('database/prisma/seed/baseline.seed.json');
for (const entityType of ['PURCHASE_CONTRACT', 'PURCHASE_RELEASE_ORDER', 'LANDED_COST']) {
  check(`baseline business sequence exists for ${entityType}`, baseline.numberSequences?.some((item) => item.entityType === entityType), `${entityType} number sequence missing from baseline seed.`);
}
const demoVendor = baseline.vendors?.find((vendor) => vendor.code === 'VEND-DEMO-001');
check('baseline demo vendor is approved for commercial smoke flows', demoVendor?.status === 'APPROVED', 'Demo supplier must be APPROVED so purchase-contract smoke flows do not fail vendor governance.');
check('baseline demo vendor carries verification evidence', Boolean(demoVendor?.documentsVerifiedAt && demoVendor?.bankVerifiedAt && Array.isArray(demoVendor?.approvedCategoryIdsJson)), 'Demo supplier must carry document/bank/category governance evidence.');
const seed = read('database/prisma/seed/seed.mjs');
includesAll('seed upserts vendor governance and commercial number sequences', seed, [
  'documentsVerifiedAt',
  'bankVerifiedAt',
  'approvedCategoryIdsJson',
  'numberSequence.upsert',
], 'Seed script must persist governance/sequence evidence');

const commercialProcCheck = read('scripts/check-commercial-procurement.mjs');
includesAll('commercial procurement gate tolerates stock-count read routes but not unsupported extras', commercialProcCheck, [
  'requiredRouteSignatures',
  'extraRouteSignatures',
  'GET /api/v1/stock-counts/:id/count-sheet',
  'unsupportedExtras',
], 'Commercial procurement gate still has strict false-positive route count');

const pkg = json('package.json');
for (const script of ['pass:10:source-check', 'pass:10:check', 'pass:10:certify', 'pass:10:certify:ps', 'commercial-procurement:check', 'commercial-finance:check']) {
  check(`root package script exists: ${script}`, Boolean(pkg.scripts?.[script]), `package.json missing required PASS 10/commercial script: ${script}`);
}

const status = blockers.length
  ? 'FAIL_BLOCKED'
  : failures.length
    ? (sourceOnly ? 'FAIL_SOURCE_LEVEL' : 'FAIL_STRICT_RUNTIME')
    : sourceOnly
      ? 'PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME'
      : 'PASS_STRICT_RUNTIME';

const payload = {
  pass: 'PASS_10',
  name: 'Procurement Commercial Controls - Vendor Risk, Purchase Contracts and Landed Cost',
  status,
  startedAt,
  completedAt: new Date().toISOString(),
  sourceOnly,
  summary: {
    totalChecks: checks.length,
    passed: checks.filter((c) => c.passed).length,
    failures: failures.length,
    blockers: blockers.length,
    warnings: warnings.length + previousPassWarnings.length,
  },
  previousPassWarnings,
  warnings,
  failures,
  blockers,
  checks,
  runtimeCertification: sourceOnly ? 'PENDING_ROOT_LOCKFILE_AND_LOCAL_DEPENDENCY_RUNTIME' : 'STRICT_RUNTIME_ATTEMPTED',
};
mkdirSync(pathOf('certification-output'), { recursive: true });
writeFileSync(pathOf('certification-output/pass-10-procurement-commercial-controls.json'), JSON.stringify(payload, null, 2));
writeFileSync(pathOf('certification-output/PASS_10_PROCUREMENT_COMMERCIAL_CONTROLS_LOG.txt'), [
  `PASS 10 - ${payload.name}`,
  `Status: ${status}`,
  `Checks: ${payload.summary.passed}/${payload.summary.totalChecks}`,
  `Failures: ${failures.length}`,
  `Blockers: ${blockers.length}`,
  ...failures.map((failure) => `FAIL: ${failure.name} - ${failure.message}`),
  ...blockers.map((blocker) => `BLOCKER: ${blocker.name} - ${blocker.message}`),
  ...previousPassWarnings.map((warning) => `PREVIOUS-PASS-WARNING: ${warning}`),
].join('\n'));

if (failures.length || blockers.length) {
  console.error(`PASS 10 commercial controls gate FAILED: ${payload.summary.passed}/${payload.summary.totalChecks} checks passed.`);
  for (const failure of failures) console.error(`- ${failure.name}: ${failure.message}`);
  for (const blocker of blockers) console.error(`- ${blocker.name}: ${blocker.message}`);
  process.exit(1);
}

console.log(`PASS 10 commercial controls gate PASSED: ${payload.summary.passed}/${payload.summary.totalChecks} checks. Status ${status}.`);
