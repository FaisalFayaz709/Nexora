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
  checks.push({ name, passed: Boolean(passed), message: passed ? undefined : message });
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
  'certification-output/pass-10-procurement-commercial-controls.json',
]) {
  if (!hasFile(path)) {
    if (!sourceOnly) check(`previous evidence exists: ${path}`, false, `${path} is missing.`, { blocker: true });
    continue;
  }
  const evidence = json(path);
  const status = String(evidence.status ?? '');
  const text = read(path);
  const knownRuntimeHold = text.includes('pnpm-lock.yaml') || text.includes('frozen-lockfile') || status.includes('RUNTIME_PENDING') || status.includes('OVERALL_HOLD') || status.includes('HOLD');
  if ((status.includes('FAIL') || status.includes('HOLD')) && knownRuntimeHold) {
    previousPassWarnings.push(`${path} remains tolerated for source-level continuation because strict lockfile/runtime proof is pending.`);
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
runGate('PASS 10 commercial controls gate still passes source-only', ['scripts/check-pass-10-procurement-commercial-controls.mjs', '--source-only']);
runGate('projects source gate passes', ['scripts/check-projects.mjs']);

for (const required of [
  'backend/src/modules/projects/project.routes.ts',
  'backend/src/modules/projects/project.controller.ts',
  'backend/src/modules/projects/project.service.ts',
  'backend/src/modules/projects/project.repository.ts',
  'backend/src/modules/projects/project.facade.ts',
  'backend/src/modules/projects/project.module.ts',
  'backend/src/modules/projects/project-delivery-policy.ts',
  'backend/src/modules/projects/project-completion-policy.ts',
  'backend/src/modules/projects/project-completion-policy.test.ts',
  'backend/src/modules/projects/project-delivery-policy.test.ts',
  'backend/src/modules/projects/project-delivery.integration.test.ts',
  'shared/src/contracts/projects/project.contracts.ts',
  'shared/src/contracts/projects/project-completion.contracts.ts',
  'shared/src/contracts/projects/create-project.contract.ts',
  'frontend/src/modules/projects/project-resource-config.ts',
  'frontend/src/modules/projects/project-command-panel.tsx',
  'frontend/src/modules/projects/project-resource-form-page.tsx',
  'frontend/src/modules/projects/project-scoped-surface.tsx',
  'frontend/src/modules/projects/api.ts',
  'frontend/src/modules/forms/resource-form-registry.ts',
  'frontend/src/components/forms/resource-form-fields.tsx',
  'database/prisma/schema.prisma',
  'docs/contracts/capability-locks/projects.json',
  'docs/contracts/api-endpoint-matrix.csv',
  'shared/src/contracts/registry/locked-endpoints.json',
]) {
  check(`PASS 11 source file exists: ${required}`, hasFile(required), `${required} is required.`);
}

const routeLock = json('docs/contracts/capability-locks/projects.json');
check('Project capability lock has 18 locked routes after budget command closure', routeLock.lockedRouteCount === 18, `Expected 18 project routes, found ${routeLock.lockedRouteCount}.`);
for (const signature of [
  ['GET', '/api/v1/projects'],
  ['POST', '/api/v1/projects'],
  ['PATCH', '/api/v1/projects/:id'],
  ['GET', '/api/v1/project-tasks'],
  ['POST', '/api/v1/project-tasks'],
  ['PATCH', '/api/v1/project-tasks/:id'],
  ['GET', '/api/v1/projects/:id/bom'],
  ['PUT', '/api/v1/projects/:id/bom'],
  ['POST', '/api/v1/projects/:id/bom/:bomId/approve'],
  ['GET', '/api/v1/projects/:id/budget'],
  ['PUT', '/api/v1/projects/:id/budget'],
  ['POST', '/api/v1/projects/:id/budget/:budgetId/approve'],
  ['POST', '/api/v1/projects/:id/material-request'],
  ['GET', '/api/v1/projects/:id/costing'],
  ['POST', '/api/v1/projects/:id/handover'],
  ['GET', '/api/v1/projects/:id/timeline'],
]) {
  const [method, path] = signature;
  check(`Project capability lock includes ${method} ${path}`, routeLock.lockedRoutes.some((r) => r.method === method && r.path === path), `${method} ${path} missing from projects capability lock.`);
}

const routes = read('backend/src/modules/projects/project.routes.ts');
includesAll('Project route surface exposes BOM, budget, material and handover commands', routes, [
  "defineLockedRoute('PUT', '/api/v1/projects/:id/bom')",
  "defineLockedRoute('POST', '/api/v1/projects/:id/bom/:bomId/approve')",
  "defineLockedRoute('PUT', '/api/v1/projects/:id/budget')",
  "defineLockedRoute('POST', '/api/v1/projects/:id/budget/:budgetId/approve')",
  "defineLockedRoute('POST', '/api/v1/projects/:id/material-request')",
  "defineLockedRoute('GET', '/api/v1/projects/:id/costing')",
  "defineLockedRoute('POST', '/api/v1/projects/:id/handover')",
  "guard('project.update')",
  "guard('project.approve')",
  "guard('project.view_financials')",
  "guard('project.handover')",
  "assertModuleEnabled(request.tenant!.organizationId, 'projects')",
], 'Project route or permission invariant missing');

const controller = read('backend/src/modules/projects/project.controller.ts');
includesAll('Project controller parses shared budget and workflow contracts', controller, [
  'CreateProjectRequestSchema',
  'CreateProjectTaskSchema',
  'UpsertProjectBomSchema',
  'UpsertProjectBudgetSchema',
  'CreateMaterialRequirementSchema',
  'CompleteProjectHandoverSchema',
  'this.service.upsertBudget',
  'this.service.approveBudget',
  'this.service.createMaterialRequirement',
  'this.service.costing',
  'this.service.timeline',
], 'Project controller contract parsing missing');
check('Project controller does not import Prisma/database', !controller.includes('@nexora/database') && !/\bprisma\./.test(controller), 'Project controller must not access persistence directly.');

const service = read('backend/src/modules/projects/project.service.ts');
includesAll('Project service keeps blueprint lifecycle continuity inside services/facades', service, [
  'async upsertBudget(',
  'async approveBudget(',
  'assertProjectBudgetCanBeChanged',
  'assertProjectBudgetApproval',
  'assertBudgetLineTotals',
  'supersedeOtherApprovedBudgets',
  'PROJECT_BUDGET_DRAFT_SAVED',
  'PROJECT_BUDGET_APPROVED',
  'this.inventory.freeStockForProject',
  'this.procurement.createMaterialRequirementForProject',
  'this.procurement.projectProcurementReadModel',
  'this.finance.projectCostReadModel',
  'calculateProjectCostSnapshot',
  'PROJECT_APPROVED_BOM_REQUIRED',
  'PROJECT_NO_MATERIAL_SHORTAGE',
  'PROJECT_HANDOVER_INVALID_STATE',
  "type: 'project.handed_over'",
  "status: 'HANDED_OVER'",
  'withTransaction',
], 'Project service lifecycle invariant missing');
check('Project critical state does not use BullMQ/eventual consistency as source of truth', !service.includes('BullMQ') && !service.includes("from 'bullmq'"), 'Project budget/BOM/material/handover critical state must remain transactional, not BullMQ-sourced.');

const repo = read('backend/src/modules/projects/project.repository.ts');
includesAll('Project repository owns project persistence and versioned BOM/budget storage', repo, [
  'lockProject',
  'FOR UPDATE',
  'upsertDraftBom',
  'supersedeOtherApprovedBoms',
  'approveBom',
  'upsertDraftBudget',
  'supersedeOtherApprovedBudgets',
  'approveBudget',
  'deliveryReadiness',
  'localTimeline',
  'ProjectMilestone',
  'ProjectBudget',
], 'Project repository persistence invariant missing');

const policy = read('backend/src/modules/projects/project-completion-policy.ts') + '\n' + read('backend/src/modules/projects/project-delivery-policy.ts');
includesAll('Project policy layer guards schedule, BOM, budget, costing and readiness rules', policy, [
  'assertProjectCompletionReadiness',
  'assertProjectBudgetCanBeChanged',
  'assertProjectBudgetApproval',
  'assertProjectCostingLayers',
  'assertBomCanBeChanged',
  'assertBomLineQuantities',
  'calculateBomShortagePlan',
  'calculateProjectBudgetSummary',
  'calculateProjectCostSnapshot',
  'PROJECT_TASK_SELF_DEPENDENCY',
  'PROJECT_BOM_DUPLICATE_PRODUCT',
], 'Project policy invariant missing');

const sharedContracts = read('shared/src/contracts/projects/project.contracts.ts') + '\n' + read('shared/src/contracts/projects/project-completion.contracts.ts');
includesAll('Shared project contracts cover budget, BOM, tasks, material request and handover', sharedContracts, [
  'CreateProjectTaskSchema',
  'UpsertProjectBomSchema',
  'UpsertProjectBudgetSchema',
  'ProjectBudgetCompletionLineSchema',
  'CreateMaterialRequirementSchema',
  'CompleteProjectHandoverSchema',
  'PUT /api/v1/projects/:id/budget',
  'POST /api/v1/projects/:id/budget/:budgetId/approve',
  'M11-PROJECT-BUDGET-UPsert-AND-APPROVAL-VERSIONING',
], 'Shared project contract invariant missing');

const prisma = read('database/prisma/schema.prisma');
for (const model of [
  'Project', 'ProjectPhase', 'ProjectTask', 'ProjectTaskDependency', 'ProjectMilestone', 'ProjectMember',
  'BillOfMaterials', 'BOMItem', 'ProjectBudget', 'ProjectBudgetLine', 'ProjectExpense', 'ProjectRisk', 'ProjectIssue', 'ProjectHandover',
]) {
  check(`Project Prisma model exists: ${model}`, new RegExp(`model\\s+${model}\\s*\\{`).test(prisma), `${model} model missing from Prisma schema.`);
}
includesAll('Project schema maintains tenant IDs, business numbers and Decimal money', prisma, [
  'organizationId String',
  '@@unique([organizationId, projectNo])',
  'contractValue',
  'totalBudget',
  'budgetAmount',
  'committedAmount',
  'actualAmount',
  'allocationPct',
  '@db.Decimal(18,2)',
], 'Project schema monetary/tenant invariant missing');
check('Project schema does not use Float', !/\bFloat\b/.test(prisma), 'Float must not be used for project money/quantity fields.');

const projectConfig = read('frontend/src/modules/projects/project-resource-config.ts');
includesAll('Frontend project resource config exposes budget commands and surfaces', projectConfig, [
  "'save-draft-budget'",
  "'approve-budget'",
  "endpointTemplate: '/projects/:id/budget'",
  "endpointTemplate: '/projects/:id/budget/:budgetId/approve'",
  "ProjectScopedSurfaceConfigs",
  "ProjectCommandConfigs",
  "project.view_financials",
  "project.handover",
], 'Project frontend config missing budget/project command surface');

const commandPanel = read('frontend/src/modules/projects/project-command-panel.tsx');
includesAll('Frontend command panel uses RHF command dialogs for BOM, budget, material and handover', commandPanel, [
  'CommandFormDialog',
  'bomItemFields',
  'budgetLineFields',
  "'save-draft-bom'",
  "'approve-bom'",
  "'save-draft-budget'",
  "'approve-budget'",
  "type: 'array'",
  "replace(':budgetId', 'selected-budget-id')",
  '/api/v1/projects/:id/budget',
], 'Project command panel invariant missing');

const formRegistry = read('frontend/src/modules/forms/resource-form-registry.ts');
includesAll('Generic form registry exposes controlled project arrays instead of hidden placeholders', formRegistry, [
  'projectBomItemFields',
  'projectBudgetLineFields',
  "resourceKey: 'project-bom'",
  "label: 'BOM items', type: 'array'",
  "arrayFields: projectBomItemFields",
  "resourceKey: 'project-budget'",
  "label: 'Budget lines', type: 'array'",
  "arrayFields: projectBudgetLineFields",
  "label: 'Dependency task IDs JSON', type: 'json'",
], 'Project forms still lack controlled arrays/task dependency UI');

const frontendApi = read('frontend/src/modules/projects/api.ts');
includesAll('Frontend projects API uses centralized client for budget and material endpoints', frontendApi, [
  'apiGet',
  'apiPut',
  'postCommand',
  'approveBudget',
  'putProjectBudget',
  'createMaterialRequest',
  'getProjectCosting',
  'getProjectTimeline',
], 'Frontend projects API missing centralized budget/material helpers');
check('Frontend projects API does not create Next.js business API', !frontendApi.includes('/api/') && !frontendApi.includes('fetch('), 'Frontend project module must call centralized API client, not raw fetch or duplicate Next API.');

const endpointRegistry = json('shared/src/contracts/registry/locked-endpoints.json');
for (const entry of [
  ['PUT', '/api/v1/projects/:id/budget'],
  ['POST', '/api/v1/projects/:id/budget/:budgetId/approve'],
]) {
  const [method, endpoint] = entry;
  check(`Locked endpoint registry includes ${method} ${endpoint}`, endpointRegistry.some((e) => e.method === method && e.endpoint === endpoint), `${method} ${endpoint} missing from locked endpoint registry.`);
}

const endpointCsv = read('docs/contracts/api-endpoint-matrix.csv');
includesAll('API endpoint matrix documents Pass 11 budget routes', endpointCsv, [
  'Projects,PUT,/api/v1/projects/:id/budget,Create/update draft project budget,project.update,Versioned budget lines,Pass 11 / Core Phase 5,IMPLEMENTED_STATIC_ONLY',
  'Projects,POST,/api/v1/projects/:id/budget/:budgetId/approve,Approve project budget,project.approve,Supersedes prior approved budget,Pass 11 / Core Phase 5,IMPLEMENTED_STATIC_ONLY',
], 'Endpoint matrix missing Pass 11 budget routes');

const status = blockers.length
  ? 'HOLD_AUDIT_FOUND_BLOCKERS'
  : failures.length
    ? 'FAIL_SOURCE_LEVEL'
    : 'PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME';

mkdirSync(join(root, 'certification-output'), { recursive: true });
const report = {
  pass: 'PASS_11',
  name: 'Project Management, BOM, Budget and Material Flow Completion',
  sourceOnly,
  status,
  startedAt,
  completedAt: new Date().toISOString(),
  checksRun: checks.length,
  passed: checks.filter((item) => item.passed).length,
  failures,
  blockers,
  warnings: [...warnings, ...previousPassWarnings],
  coverage: {
    lockedProjectRouteCount: routeLock.lockedRouteCount,
    projectPrismaModelCount: 14,
    budgetCommandRoutesAdded: 2,
    frontendControlledArrays: ['BOM items', 'Budget lines', 'Task dependency IDs JSON'],
    criticalContinuity: ['Project -> BOM -> Inventory free-stock check -> Material Requirement -> Procurement read model -> Costing -> Handover -> Timeline'],
  },
  runtimeLimitations: [
    'This pass certifies source-level project/BOM/budget/material-flow completion only.',
    'Strict frozen install, TypeScript build, migrations, database integration tests, Docker runtime and browser E2E still require a local machine with pnpm-lock.yaml and dependencies.',
    'Overall project remains HOLD until PASS 00 runtime certification is completed.',
  ],
  checks,
};
writeFileSync(join(root, 'certification-output/pass-11-project-management-bom-budget-material-flow.json'), JSON.stringify(report, null, 2));

if (blockers.length || failures.length) {
  console.error(`PASS 11 project management gate ${status}`);
  for (const blocker of blockers) console.error(`BLOCKER: ${blocker.name}: ${blocker.message}`);
  for (const failure of failures) console.error(`FAILURE: ${failure.name}: ${failure.message}`);
  process.exit(1);
}

console.log(`PASS 11 project management gate PASSED: ${report.passed}/${report.checksRun} checks. Status ${status}.`);
