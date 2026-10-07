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
  return lock.implementedLockedRoutes.some((r) => r.method === method && r.path === path);
}

mkdirSync(pathOf('certification-output'), { recursive: true });

if (!sourceOnly) {
  check('root pnpm-lock.yaml exists for strict runtime certification', hasFile('pnpm-lock.yaml'), 'pnpm-lock.yaml is missing; run pnpm install from root and commit the lockfile before claiming runtime GO.', { blocker: true });
}

previousEvidence('certification-output/pass-15-finance-tax-bank-reconciliation.json');

runGate('architecture gate still passes', ['scripts/check-architecture.mjs']);
runGate('contracts gate still passes', ['scripts/check-contracts.mjs']);
runGate('approval-engine source gate passes with Pass 16 route count', ['scripts/check-approval-engine.mjs']);
runGate('commercial procurement source gate still passes', ['scripts/check-commercial-procurement.mjs']);
runGate('finance source gate still passes', ['scripts/check-finance.mjs']);

for (const required of [
  'backend/src/modules/approvals/approval.routes.ts',
  'backend/src/modules/approvals/approval.controller.ts',
  'backend/src/modules/approvals/approval.service.ts',
  'backend/src/modules/approvals/approval.repository.ts',
  'backend/src/modules/approvals/approval.facade.ts',
  'backend/src/modules/approvals/approval-engine-policy.ts',
  'backend/src/modules/approvals/approval-workflow-control-policy.ts',
  'backend/src/modules/approvals/approval-workflow-control-policy.test.ts',
  'backend/src/modules/approvals/approval-engine-maker-checker.integration.test.ts',
  'shared/src/contracts/approvals/approval.contracts.ts',
  'shared/src/contracts/approvals/approval-engine-manifest.ts',
  'shared/src/contracts/approvals/approval-workflow-controls.contracts.ts',
  'docs/contracts/capability-locks/approval-engine.json',
  'shared/src/contracts/registry/locked-endpoints.json',
  'shared/src/contracts/registry/locked-endpoints.ts',
  'shared/src/contracts/registry/contract-maturity.json',
  'docs/contracts/api-endpoint-matrix.csv',
  'docs/contracts/api-endpoint-matrix.md',
  'docs/contracts/contract-lock.json',
  'database/prisma/schema.prisma',
  'database/prisma/migrations/20260912160000_pass16_approval_workflow_controls/migration.sql',
  'database/prisma/seed/baseline.seed.json',
  'database/prisma/seed/seed.mjs',
  'frontend/src/modules/approvals/api.ts',
  'frontend/src/modules/approvals/approval-engine-console.tsx',
  'frontend/src/modules/forms/resource-form-registry.ts',
  'frontend/src/app/(erp)/workflow-rules/page.tsx',
  'frontend/src/lib/route-map.ts',
  'frontend/src/modules/navigation/navigation-registry.ts',
]) check(`PASS 16 source file exists: ${required}`, hasFile(required), `${required} is required.`);

const approvalLock = json('docs/contracts/capability-locks/approval-engine.json');
check('Approval capability lock has 14 routes after workflow-rule additions', approvalLock.routeCount === 14, `Expected 14 routes, found ${approvalLock.routeCount}.`);
check('Approval capability lock includes BusinessRule model', approvalLock.newPhysicalModels.includes('BusinessRule'), 'BusinessRule is missing from approval capability lock.');
for (const [method, path] of [
  ['GET', '/api/v1/approvals/inbox'],
  ['POST', '/api/v1/approvals/:id/approve'],
  ['POST', '/api/v1/approvals/:id/reject'],
  ['POST', '/api/v1/approvals/:id/return'],
  ['GET', '/api/v1/approval-definitions'],
  ['POST', '/api/v1/approval-definitions'],
  ['GET', '/api/v1/workflow-rules'],
  ['GET', '/api/v1/workflow-rules/:id'],
  ['POST', '/api/v1/workflow-rules'],
  ['PATCH', '/api/v1/workflow-rules/:id'],
  ['POST', '/api/v1/workflow-rules/:id/activate'],
  ['POST', '/api/v1/workflow-rules/:id/deactivate'],
  ['POST', '/api/v1/workflow-rules/evaluate'],
]) check(`Approval lock includes ${method} ${path}`, routeInLock(approvalLock, method, path), `${method} ${path} missing from approval capability lock.`);
for (const subject of [
  'PurchaseRequest', 'PurchaseOrder', 'StockAdjustment', 'StockCountVariance', 'VendorOnboardingRequest',
  'CustomerInvoice', 'SupplierInvoice', 'Expense', 'Payment', 'LeaveRequest', 'PayrollRun',
  'AssetRetirement', 'AssetDisposal', 'PurchaseContract', 'PurchaseReleaseOrder', 'LandedCost',
  'BankReconciliation', 'PaymentVoucher', 'ReceiptVoucher',
]) check(`Pass 16 governed subject registered: ${subject}`, approvalLock.integratedSubjects.includes(subject), `${subject} missing from integratedSubjects.`);

const routes = read('backend/src/modules/approvals/approval.routes.ts');
includesAll('Approval routes expose workflow-rule management and evaluation through Fastify guards', routes, [
  "defineLockedRoute('GET', '/api/v1/workflow-rules')",
  "defineLockedRoute('GET', '/api/v1/workflow-rules/:id')",
  "defineLockedRoute('POST', '/api/v1/workflow-rules')",
  "defineLockedRoute('PATCH', '/api/v1/workflow-rules/:id')",
  "defineLockedRoute('POST', '/api/v1/workflow-rules/:id/activate')",
  "defineLockedRoute('POST', '/api/v1/workflow-rules/:id/deactivate')",
  "defineLockedRoute('POST', '/api/v1/workflow-rules/evaluate')",
  "guard('workflow.manage')",
  "access.assertModuleEnabled(request.tenant.organizationId, 'approvals')",
], 'Approval/workflow route invariant missing');
excludesAll('Approval routes do not access Prisma directly', routes, ['@nexora/database', 'prisma.'], 'Routes must not access persistence directly');

const controller = read('backend/src/modules/approvals/approval.controller.ts');
includesAll('Approval controller parses shared Zod workflow-rule schemas and delegates to service', controller, [
  'CreateWorkflowRuleSchema',
  'UpdateWorkflowRuleSchema',
  'EvaluateWorkflowRulesSchema',
  'WorkflowRuleListQuerySchema',
  'this.service.listWorkflowRules',
  'this.service.workflowRuleDetail',
  'this.service.createWorkflowRule',
  'this.service.updateWorkflowRule',
  'this.service.setWorkflowRuleActive',
  'this.service.evaluateWorkflowRules',
], 'Approval controller invariant missing');
excludesAll('Approval controller has no direct persistence access', controller, ['@nexora/database', 'prisma.'], 'Controller must not access persistence directly');

const service = read('backend/src/modules/approvals/approval.service.ts');
includesAll('Approval service completes definitions, decisions, maker-checker and workflow/fraud controls transactionally', service, [
  'async listDefinitions',
  'async createDefinition',
  'async requestApproval',
  'async requestApprovalIfConfigured',
  'async actBySubject',
  'async act',
  'async listWorkflowRules',
  'async createWorkflowRule',
  'async updateWorkflowRule',
  'async setWorkflowRuleActive',
  'async evaluateWorkflowRules',
  'assertMakerCheckerPolicy',
  'assertWorkflowRuleDefinition',
  'assertFraudControlResult',
  'decideWorkflowControl',
  'withTransaction',
  'WORKFLOW_RULE_CREATED',
  'WORKFLOW_RULE_UPDATED',
  'WORKFLOW_RULE_ACTIVATED',
  'WORKFLOW_RULE_DEACTIVATED',
  'FRAUD_CONTROL_BLOCKED',
  'FRAUD_CONTROL_REQUIRES_SECONDARY_APPROVAL',
], 'Approval service invariant missing');
excludesAll('Approval and workflow state is not moved through queues', service, ['from \'bullmq\'', 'new Queue', 'Queue<', 'Worker<'], 'Approval/workflow critical state cannot be queue-owned');

const repo = read('backend/src/modules/approvals/approval.repository.ts');
includesAll('Approval repository owns approval and workflow-rule persistence behind service boundary', repo, [
  'listDefinitions',
  'activeDefinitions',
  'createDefinition',
  'createRequest',
  'lockRequest',
  'lockPendingStep',
  'createAction',
  'approvalCount',
  'activateStep',
  'listWorkflowRules',
  'getWorkflowRule',
  'activeWorkflowRules',
  'createWorkflowRule',
  'updateWorkflowRule',
  'setWorkflowRuleActive',
  'businessRule',
  'organizationId',
], 'Approval repository invariant missing');

const schema = read('database/prisma/schema.prisma');
includesAll('Prisma schema contains tenant-scoped BusinessRule model and approval engine models', schema, [
  'model ApprovalDefinition',
  'model ApprovalRequest',
  'model ApprovalStep',
  'model ApprovalAction',
  'model BusinessRule',
  'organizationId String',
  'triggerType',
  'subjectType',
  'conditionJson',
  'actionsJson',
  '@@unique([organizationId, triggerType, name])',
  '@@index([organizationId, branchId, triggerType, active])',
], 'Prisma schema invariant missing');
excludesAll('Prisma schema does not introduce Float', schema, [' Float'], 'Money/quantities must not use Float');

const migration = read('database/prisma/migrations/20260912160000_pass16_approval_workflow_controls/migration.sql');
includesAll('Pass 16 migration is additive and validates BusinessRule structure', migration, [
  'CREATE TABLE IF NOT EXISTS "BusinessRule"',
  '"organizationId" uuid NOT NULL REFERENCES "Organization"',
  '"branchId" uuid NULL REFERENCES "Branch"',
  '"createdById" uuid NOT NULL REFERENCES "User"',
  'BusinessRule_severity_check',
  'BusinessRule_condition_object_check',
  'BusinessRule_actions_array_check',
  'BusinessRule_organizationId_triggerType_name_key',
  'BusinessRule_organizationId_branchId_triggerType_active_idx',
], 'Migration invariant missing');
excludesAll('Pass 16 migration is non-destructive', migration.toUpperCase(), ['DROP TABLE', 'DROP COLUMN', 'TRUNCATE'], 'Pass 16 must be additive.');

const sharedContracts = read('shared/src/contracts/approvals/approval-workflow-controls.contracts.ts');
includesAll('Shared approval workflow contracts expose Pass 16 manifest, schemas and control rules', sharedContracts, [
  'PASS_16_SOURCE_LEVEL_APPROVAL_WORKFLOW_MAKER_CHECKER_FRAUD_RULES_COMPLETION',
  'Pass16ApprovalWorkflowControlManifest',
  'CreateWorkflowRuleSchema',
  'UpdateWorkflowRuleSchema',
  'EvaluateWorkflowRulesSchema',
  'WorkflowRuleConditionSchema',
  'WorkflowRuleActionSchema',
  'invoice_amount_greater_than_po_amount_blocks_supplier_invoice_approval',
  'same_user_creates_vendor_and_payment_requires_secondary_approval',
  'stock_adjustment_above_threshold_requires_warehouse_manager_approval',
  'creator_cannot_be_sole_approver_for_high_risk_subject',
], 'Shared Pass 16 contract invariant missing');

const policy = read('backend/src/modules/approvals/approval-workflow-control-policy.ts');
includesAll('Backend workflow control policy rejects unsafe subjects/actions and locks fraud decision outcomes', policy, [
  'Pass16WorkflowTransactionBoundary',
  'Pass16FraudControlRules',
  'assertPass16WorkflowSubject',
  'assertWorkflowRuleDefinition',
  'decideWorkflowControl',
  'assertFraudControlResult',
  'FRAUD_CONTROL_MUST_BLOCK_SUPPLIER_INVOICE_OVER_PO',
  'FRAUD_CONTROL_MUST_REQUIRE_SECONDARY_APPROVAL',
  'FRAUD_CONTROL_STOCK_ADJUSTMENT_THRESHOLD_UNPROTECTED',
  'frontend-only-rule-enforcement',
  'bullmq-approval-state-mutation',
], 'Workflow control policy invariant missing');

const policyTest = read('backend/src/modules/approvals/approval-workflow-control-policy.test.ts');
includesAll('Pass 16 policy tests cover governed subjects, actions, blocking and secondary approval controls', policyTest, [
  'StockCountVariance',
  'PaymentVoucher',
  'ReceiptVoucher',
  'WORKFLOW_RULE_APPROVAL_SUBJECT_REQUIRED',
  'FRAUD_CONTROL_MUST_REQUIRE_SECONDARY_APPROVAL',
  'WORKFLOW_SUBJECT_TYPE_NOT_GOVERNED',
  'decideWorkflowControl',
], 'Workflow policy test invariant missing');

const engineManifest = read('shared/src/contracts/approvals/approval-engine-manifest.ts');
includesAll('Approval engine manifest now governs Pass 16 high-risk subjects and runtime evidence', engineManifest, [
  'StockCountVariance',
  'Payment',
  'PurchaseReleaseOrder',
  'PaymentVoucher',
  'ReceiptVoucher',
  'workflow-rules-are-tenant-owned-and-managed-through-workflow.manage',
  'fraud-control-rules-can-block-or-require-secondary-approval',
  'workflow-rule-evaluation-is-tenant-scoped',
], 'Approval manifest invariant missing');

const baseline = read('database/prisma/seed/baseline.seed.json');
includesAll('Baseline seed includes deterministic fraud/control rules for local smoke certification', baseline, [
  'businessRules',
  'Invoice amount greater than PO amount blocks approval',
  'Same user creates vendor and payment requires secondary approval',
  'Stock adjustment threshold requires warehouse manager approval',
  'High value purchase route manager finance director',
  'REQUIRE_SECONDARY_APPROVAL',
  'BLOCK',
]);
const seed = read('database/prisma/seed/seed.mjs');
includesAll('Seed runner upserts BusinessRule records by tenant trigger/name', seed, [
  'baseline.businessRules',
  'tx.businessRule.upsert',
  'organizationId_triggerType_name',
  'conditionJson',
  'actionsJson',
]);

const frontendApi = read('frontend/src/modules/approvals/api.ts');
includesAll('Frontend approval API maps workflow-rule endpoints through centralized API helpers', frontendApi, [
  "workflowRules: '/workflow-rules'",
  'workflowRulesApi',
  'activateWorkflowRule',
  'deactivateWorkflowRule',
  'evaluateWorkflowRules',
  'postCommand',
], 'Frontend approval API invariant missing');

const formRegistry = read('frontend/src/modules/forms/resource-form-registry.ts');
includesAll('Frontend workflow-rule form uses RHF/Zod registry instead of ad hoc local forms', formRegistry, [
  'CreateWorkflowRuleSchema',
  "'/workflow-rules'",
  'Workflow / Fraud Control Rule',
  'Condition JSON',
  'Actions JSON',
  'REQUIRE_APPROVAL',
  'REQUIRE_SECONDARY_APPROVAL',
]);

const routeMap = read('frontend/src/lib/route-map.ts');
const nav = read('frontend/src/modules/navigation/navigation-registry.ts');
includesAll('Frontend navigation and route map expose workflow-rules in ERP shell with workflow.manage permission', routeMap + '\n' + nav, [
  "route: '/workflow-rules'",
  "href: '/workflow-rules'",
  'Workflow Rules',
  'workflow.manage',
  '/workflow-rules/evaluate',
]);

const lockedEndpointJson = JSON.stringify(json('shared/src/contracts/registry/locked-endpoints.json'));
includesAll('Locked endpoint registry includes Pass 16 workflow-rule API surface', lockedEndpointJson, [
  '/api/v1/workflow-rules',
  '/api/v1/workflow-rules/:id',
  '/api/v1/workflow-rules/:id/activate',
  '/api/v1/workflow-rules/:id/deactivate',
  '/api/v1/workflow-rules/evaluate',
]);
const contractLock = json('docs/contracts/contract-lock.json');
check('Contract lock endpoint count has not regressed below Pass 16 baseline', contractLock.endpointCatalogCount >= 292, `Expected at least 292 endpoints, found ${contractLock.endpointCatalogCount}.`);

const status = blockers.length || failures.length
  ? (blockers.length ? 'HOLD_AUDIT_FOUND_BLOCKERS' : 'FAIL')
  : (sourceOnly || !hasFile('pnpm-lock.yaml') ? 'PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME' : 'PASS_STRICT_SOURCE_AND_RUNTIME_PREREQUISITES_READY');
const output = {
  pass: 'PASS_16',
  name: 'Approval Engine, Workflow Engine, Maker-Checker and Fraud Rules Completion',
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
    'Approval/workflow/fraud behavior must still be proven with integration and E2E tests against PostgreSQL using real tenant, role, branch and subject fixtures.',
  ],
};
writeFileSync(pathOf('certification-output/pass-16-approval-workflow-engine.json'), JSON.stringify(output, null, 2) + '\n');
writeFileSync(pathOf('certification-output/PASS_16_APPROVAL_WORKFLOW_ENGINE_LOG.txt'), [
  `PASS_16 status: ${status}`,
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
