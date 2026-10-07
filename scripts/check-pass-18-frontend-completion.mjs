#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const checks = [];
const failures = [];
const blockers = [];
const warnings = [];
const limitations = [];

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
function includesAll(name, content, required, message = 'Missing invariant(s)') {
  const missing = required.filter((needle) => !content.includes(needle));
  check(name, missing.length === 0, missing.length ? `${message}: ${missing.join(', ')}` : '');
}
function excludesAll(name, content, forbidden, message = 'Forbidden invariant(s) found') {
  const found = forbidden.filter((needle) => content.includes(needle));
  check(name, found.length === 0, found.length ? `${message}: ${found.join(', ')}` : '');
}
function walk(dir) {
  const abs = pathOf(dir);
  const out = [];
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    const p = join(abs, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(relative(root, p).replace(/\\/g, '/')));
    else out.push(p);
  }
  return out;
}
function runGate(name, args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 120000 });
  check(name, result.status === 0, result.status === 0 ? '' : `${args.join(' ')} failed with status ${result.status}. ${(result.stderr || result.stdout || '').slice(0, 2400)}`);
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
  check(`previous pass evidence is not failed: ${path}`, !failed, `${path} status ${status}.`, { blocker: !sourceOnly && failed });
}

mkdirSync(pathOf('certification-output'), { recursive: true });

if (!sourceOnly) {
  check('root pnpm-lock.yaml exists for strict runtime certification', hasFile('pnpm-lock.yaml'), 'pnpm-lock.yaml is missing; run pnpm install from root and commit the lockfile before claiming runtime GO.', { blocker: true });
}
previousEvidence('certification-output/pass-17-documents-events-communications.json');

for (const [name, args] of [
  ['architecture gate still passes', ['scripts/check-architecture.mjs']],
  ['contracts gate still passes', ['scripts/check-contracts.mjs']],
  ['Pass 17 source gate still passes', ['scripts/check-pass-17-documents-events-communications.mjs', '--source-only']],
  ['central API/query frontend gate passes', ['scripts/check-pass-r4-central-api-query-system.mjs', '--source-only']],
  ['screen-contract frontend gate passes', ['scripts/check-pass-r6-screen-contracts.mjs']],
  ['TanStack grid frontend gate passes', ['scripts/check-pass-r7-tanstack-grids.mjs', '--source-only']],
  ['RHF/Zod form frontend gate passes', ['scripts/check-pass-r8-rhf-zod-forms.mjs', '--source-only']],
  ['frontend workflow command gate passes', ['scripts/check-frontend-workflows.mjs', '--source-only']],
]) runGate(name, args);

for (const required of [
  'shared/src/contracts/frontend-workflows/pass18-frontend-completion.contracts.ts',
  'shared/src/contracts/frontend-workflows/index.ts',
  'docs/contracts/capability-locks/frontend-completion.json',
  'docs/frontend-screens/erp-integrations--webhooks.md',
  'docs/frontend-screens/erp-vouchers--receipt.md',
  'docs/frontend-screens/erp-workflow-rules.md',
  'frontend/src/components/ui/button.tsx',
  'frontend/src/components/app/app-shell.tsx',
  'frontend/src/components/app/shells.tsx',
  'frontend/src/components/app/guards.tsx',
  'frontend/src/components/data/data-table.tsx',
  'frontend/src/components/forms/resource-form-fields.tsx',
  'frontend/src/components/forms/form-shell.tsx',
  'frontend/src/components/forms/controlled-fields.tsx',
  'frontend/src/modules/forms/resource-form-registry.ts',
  'frontend/src/modules/integrations/api.ts',
  'frontend/src/modules/integrations/columns.tsx',
  'frontend/src/modules/integrations/integration-webhooks-page.tsx',
  'frontend/src/app/(erp)/integrations/webhooks/page.tsx',
  'frontend/src/lib/api-client.ts',
  'frontend/src/lib/module-api.ts',
  'frontend/src/lib/query-client.ts',
  'frontend/src/lib/route-map.ts',
  'frontend/src/app/(erp)/layout.tsx',
  'frontend/src/app/(portal)/layout.tsx',
  'frontend/src/app/(technician)/layout.tsx',
]) check(`PASS 18 source file exists: ${required}`, hasFile(required), `${required} is required.`);

const pass18Contract = hasFile('shared/src/contracts/frontend-workflows/pass18-frontend-completion.contracts.ts') ? read('shared/src/contracts/frontend-workflows/pass18-frontend-completion.contracts.ts') : '';
includesAll('Pass 18 shared contract declares frontend completion scope', pass18Contract, [
  'PASS_18_SOURCE_LEVEL_FRONTEND_COMPLETION_RUNTIME_PENDING',
  'ROUTE_GROUP_SHELLS',
  'SHADCN_PRIMITIVES_AND_NEXORA_WRAPPERS',
  'REACT_HOOK_FORM_ZOD_FORMS',
  'TANSTACK_TABLE_GRIDS',
  'TANSTACK_QUERY_SERVER_STATE',
  'CENTRALIZED_API_CLIENT',
  'SCREEN_BY_SCREEN_CONTRACTS',
  'NO_NEXTJS_BUSINESS_API_DUPLICATION',
  'Pass18ComplexFieldArrays',
  'technician-offline-sync-commands',
  'integration-webhook-create-form',
], 'Pass 18 contract invariant missing');
check('Frontend workflow contracts index exports Pass 18 contract', hasFile('shared/src/contracts/frontend-workflows/index.ts') && read('shared/src/contracts/frontend-workflows/index.ts').includes('pass18-frontend-completion.contracts'), 'Pass 18 contract export missing.');

const capability = hasFile('docs/contracts/capability-locks/frontend-completion.json') ? json('docs/contracts/capability-locks/frontend-completion.json') : {};
check('Pass 18 capability lock declares runtime pending status', capability.status === 'PASS_18_SOURCE_LEVEL_RUNTIME_PENDING', `Unexpected status ${capability.status}.`);
check('Pass 18 capability lock records active route/screen contract coverage', Number(capability.counts?.nextPageRoutes ?? 0) >= 327 && Number(capability.counts?.screenContracts ?? 0) >= 327, `Counts were ${JSON.stringify(capability.counts ?? {})}.`);

const integrationPage = hasFile('frontend/src/modules/integrations/integration-webhooks-page.tsx') ? read('frontend/src/modules/integrations/integration-webhooks-page.tsx') : '';
includesAll('Integration webhook screen is upgraded to Appendix G frontend standards', integrationPage, [
  'CreateIntegrationWebhookSchema',
  'useForm<CreateIntegrationWebhookInput>',
  'zodResolver',
  'FormShell',
  'TextField',
  'DataTable',
  'createIntegrationWebhookColumns',
  'integrationWebhookDeliveryColumns',
  'useQuery',
  'useMutation',
  'invalidateQueries',
  'createIdempotencyKey',
  'Queue test delivery',
  'Fastify /api/v1',
], 'Integration webhook UI invariant missing');
excludesAll('Integration webhook screen has no raw HTML table or ad-hoc form inputs', integrationPage, ['<table', '<thead', '<tbody', '<tr', '<td', '<th', '<input'], 'Pass 18 requires DataTable and RHF controlled fields.');

const integrationApi = hasFile('frontend/src/modules/integrations/api.ts') ? read('frontend/src/modules/integrations/api.ts') : '';
includesAll('Integration API uses centralized endpoint constants, query keys and approved wrappers', integrationApi, [
  'integrationEndpoints',
  'integrationKeys',
  'createCrudResourceApi',
  'apiGet',
  'apiPatch',
  'postCommand',
  'IntegrationWebhookFilters',
  'IntegrationWebhookDeliveryFilters',
  'integrationWebhookKeys',
  'IntegrationsApiRegistry',
], 'Integration API invariant missing');
excludesAll('Integration API has no raw fetch', integrationApi, ['fetch('], 'Module api.ts files must use approved wrappers.');

const integrationColumns = hasFile('frontend/src/modules/integrations/columns.tsx') ? read('frontend/src/modules/integrations/columns.tsx') : '';
includesAll('Integration module has TanStack column definitions', integrationColumns, ['ColumnDef', 'IntegrationWebhookRow', 'IntegrationWebhookDeliveryRow', 'createIntegrationWebhookColumns', 'integrationWebhookDeliveryColumns', 'Badge', 'Button'], 'Integration column invariant missing');

const formFields = hasFile('frontend/src/components/forms/resource-form-fields.tsx') ? read('frontend/src/components/forms/resource-form-fields.tsx') : '';
includesAll('ResourceFormFields supports controlled RHF field arrays', formFields, ['useFieldArray', 'DynamicArrayField', 'append(emptyItem', 'remove(index)', 'field.type === \'array\'', 'RenderField<TFieldValues>'], 'RHF array invariant missing');

const registry = hasFile('frontend/src/modules/forms/resource-form-registry.ts') ? read('frontend/src/modules/forms/resource-form-registry.ts') : '';
for (const marker of [
  'Purchase request items',
  'Supplier quotation lines',
  'Quotation items',
  'Received items',
  'Invoice items',
  'Allocations',
  'Expense items',
  'Transfer items',
  'Adjustment lines',
  'Journal lines',
  'Tax lines',
  'BOM items',
  'Budget lines',
  'Parts used',
  'Offline commands',
]) check(`Resource form registry exposes controlled complex field array: ${marker}`, registry.includes(marker) && registry.slice(Math.max(0, registry.indexOf(marker) - 160), registry.indexOf(marker) + 260).includes("type: 'array'"), `${marker} is missing or not declared as type array.`);
excludesAll('No previous hidden complex ERP line placeholders remain', registry, [
  "label: 'Transfer items', type: 'hidden'",
  "label: 'Adjustment lines', type: 'hidden'",
  "label: 'Quotation items', type: 'hidden'",
  "label: 'Commands', type: 'hidden'",
], 'A complex editable ERP line array is still hidden.');

for (const contractPath of ['docs/frontend-screens/erp-integrations--webhooks.md', 'docs/frontend-screens/erp-vouchers--receipt.md', 'docs/frontend-screens/erp-workflow-rules.md']) {
  const text = hasFile(contractPath) ? read(contractPath) : '';
  includesAll(`Screen contract is Appendix G complete: ${contractPath}`, text, [
    '## Route and owner', '## Purpose', '## Permissions', '## API mapping', '## Data table spec', '## Form spec', '## Workflow commands and row actions', '## State model', '## Responsive behavior', '## Audit/traceability', '## Acceptance checks', 'Fastify `/api/v1`', 'React Hook Form', 'Zod', 'TanStack Table', 'tenant', 'audit',
  ], 'screen contract invariant missing');
}

const frontendCodeFiles = walk('frontend/src').filter((file) => /\.(ts|tsx)$/.test(file));
const pageFiles = frontendCodeFiles.filter((file) => file.endsWith('/page.tsx'));
const rawFetch = [];
const forbiddenImports = [];
const rawTables = [];
const appShellPages = [];
for (const absolute of frontendCodeFiles) {
  const rel = relative(root, absolute).replace(/\\/g, '/');
  const text = readFileSync(absolute, 'utf8');
  if (rel !== 'frontend/src/lib/api-client.ts' && /\bfetch\s*\(/.test(text)) rawFetch.push(rel);
  const importLines = text.split(/\r?\n/).filter((line) => /^\s*import\b/.test(line));
  for (const line of importLines) {
    for (const forbidden of ['@nexora/database', '@prisma/client', 'minio', 'bullmq', 'ioredis', '../backend', '../../backend', '../../../backend', '../database', '../../database', '../../../database', '../worker', '../../worker', '../../../worker']) {
      if (line.includes(forbidden)) forbiddenImports.push(`${rel}: ${line.trim()}`);
    }
  }
  if (rel !== 'frontend/src/components/ui/table.tsx' && rel !== 'frontend/src/components/data/data-table.tsx' && /<\/?(table|thead|tbody|tr|th|td)\b/.test(text)) rawTables.push(rel);
  if (rel.endsWith('/page.tsx') && text.includes('AppShell')) appShellPages.push(rel);
}
check('No raw fetch outside centralized frontend api-client', rawFetch.length === 0, rawFetch.join(', '));
check('Frontend imports no backend/database/worker/server-only packages', forbiddenImports.length === 0, forbiddenImports.slice(0, 30).join(' | '));
check('No raw ERP table markup outside DataTable/shadcn primitives', rawTables.length === 0, rawTables.join(', '));
check('No authenticated page imports AppShell directly', appShellPages.length === 0, appShellPages.join(', '));

const appApiRoutes = walk('frontend/src/app').filter((file) => file.includes('/api/') && /\.(ts|tsx)$/.test(file));
const forbiddenAppApi = appApiRoutes.filter((file) => {
  const rel = relative(root, file).replace(/\\/g, '/');
  return !rel.includes('frontend/src/app/api/frontend/');
});
check('No Next.js duplicate business API route handlers are present', forbiddenAppApi.length === 0, forbiddenAppApi.map((f) => relative(root, f).replace(/\\/g, '/')).join(', '));

const erpLayout = hasFile('frontend/src/app/(erp)/layout.tsx') ? read('frontend/src/app/(erp)/layout.tsx') : '';
const portalLayout = hasFile('frontend/src/app/(portal)/layout.tsx') ? read('frontend/src/app/(portal)/layout.tsx') : '';
const technicianLayout = hasFile('frontend/src/app/(technician)/layout.tsx') ? read('frontend/src/app/(technician)/layout.tsx') : '';
const shellImplementation = hasFile('frontend/src/components/app/shells.tsx') ? read('frontend/src/components/app/shells.tsx') : '';
includesAll('Route group layouts enforce shell wrapping', `${erpLayout}\n${portalLayout}\n${technicianLayout}\n${shellImplementation}`, ['ErpRouteShell', 'AppShell', 'AuthGuard', 'TenantGuard', 'PortalShell', 'PortalGuard', 'TechnicianPwaShell', 'TechnicianGuard', 'OfflineProvider'], 'layout shell invariant missing');

const pkg = hasFile('package.json') ? json('package.json') : { scripts: {} };
for (const script of ['pass:18:source-check', 'pass:18:check', 'pass:18:certify:sh', 'pass:18:certify:ps', 'frontend:completion:check']) {
  check(`package.json includes ${script}`, Boolean(pkg.scripts?.[script]), pkg.scripts?.[script] ? '' : `${script} script missing.`);
}

if (!hasFile('pnpm-lock.yaml')) warnings.push('pnpm-lock.yaml is still absent until registry-backed pnpm install is run on a connected local machine.');
limitations.push('This certification is source-level unless run without --source-only after pnpm-lock.yaml exists.');
limitations.push('Runtime install, Next.js build, typecheck, browser E2E and live backend API calls remain local-machine gates.');
limitations.push('Pass 18 verifies Appendix G frontend source coverage and no-deviation rules; it does not claim final production GO.');

const result = {
  pass: 'PASS_18_FRONTEND_COMPLETION',
  status: blockers.length ? 'HOLD_AUDIT_FOUND_BLOCKERS' : failures.length ? 'FAIL' : 'PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME',
  sourceOnly,
  checksRun: checks.length,
  passed: checks.filter((item) => item.passed).length,
  blockers,
  failures,
  warnings,
  limitations,
  counts: {
    frontendCodeFiles: frontendCodeFiles.length,
    nextPageFiles: pageFiles.length,
    screenContracts: walk('docs/frontend-screens').filter((file) => file.endsWith('.md') && !file.endsWith('/index.md') && !file.includes('/_')).length,
    rawFetchViolations: rawFetch.length,
    rawTableViolations: rawTables.length,
    forbiddenFrontendImports: forbiddenImports.length,
  },
  checks,
};
writeFileSync(pathOf('certification-output/pass-18-frontend-completion.json'), JSON.stringify(result, null, 2));
if (blockers.length || failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
