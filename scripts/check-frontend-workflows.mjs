import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const outDir = join(root, 'certification-output');
const startedAt = new Date().toISOString();
const failures = [];

function file(path) {
  return join(root, path);
}

function read(path) {
  return readFileSync(file(path), 'utf8');
}

function fail(message) {
  failures.push(message);
}

function requireFile(path) {
  if (!existsSync(file(path))) fail(`Missing required frontend-workflow source file: ${path}`);
}

function requireText(path, marker, description = marker) {
  if (!existsSync(file(path))) {
    fail(`Cannot inspect missing file ${path} for ${description}`);
    return;
  }
  const text = read(path);
  if (!text.includes(marker)) fail(`${path} missing ${description}`);
}

function listFiles(dir, predicate = () => true) {
  const base = file(dir);
  if (!existsSync(base)) return [];
  const results = [];
  const stack = [base];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current)) {
      const absolute = join(current, entry);
      const stats = statSync(absolute);
      if (stats.isDirectory()) stack.push(absolute);
      else if (predicate(absolute)) results.push(absolute);
    }
  }
  return results;
}

const requiredFiles = [
  'shared/src/contracts/frontend-workflows/frontend-workflow-completion-manifest.ts',
  'shared/src/contracts/frontend-workflows/frontend-runtime-completion.contracts.ts',
  'shared/src/contracts/frontend-workflows/index.ts',
  'frontend/src/app/(erp)/workflow-completion/page.tsx',
  'frontend/src/app/(erp)/workflow-completion/runtime/page.tsx',
  'frontend/src/modules/workflows/frontend-workflow-completion-workbench.tsx',
  'frontend/src/modules/workflows/frontend-runtime-completion-policy.ts',
  'frontend/src/modules/workflows/frontend-runtime-completion-workbench.tsx',
  'backend/src/modules/frontend-workflows/frontend-workflow-policy.ts',
  'backend/src/modules/frontend-workflows/frontend-workflow-policy.test.ts',
  'backend/src/modules/frontend-workflows/frontend-workflow-completion.integration.test.ts',
];
requiredFiles.forEach(requireFile);

const manifestPath = 'shared/src/contracts/frontend-workflows/frontend-workflow-completion-manifest.ts';
const workbenchPath = 'frontend/src/modules/workflows/frontend-workflow-completion-workbench.tsx';
const runtimePolicyPath = 'frontend/src/modules/workflows/frontend-runtime-completion-policy.ts';
const legacyApiClientPath = 'frontend/src/modules/core/api-client.ts';
const centralApiClientPath = 'frontend/src/lib/api-client.ts';
const apiBasePath = 'frontend/src/lib/api-base.ts';

const manifest = existsSync(file(manifestPath)) ? read(manifestPath) : '';
const workbench = existsSync(file(workbenchPath)) ? read(workbenchPath) : '';
const runtimePolicy = existsSync(file(runtimePolicyPath)) ? read(runtimePolicyPath) : '';
const legacyApiClient = existsSync(file(legacyApiClientPath)) ? read(legacyApiClientPath) : '';
const centralApiClient = existsSync(file(centralApiClientPath)) ? read(centralApiClientPath) : '';
const apiClient = `${legacyApiClient}\n${centralApiClient}`;
const apiBase = existsSync(file(apiBasePath)) ? read(apiBasePath) : '';

const requiredControls = [
  'C15-END-TO-END-LIFECYCLE-UI-COVERS-CUSTOMER-PROJECT-PROCUREMENT-STOCK-ASSET-FINANCE',
  'C15-FRONTEND-CALLS-API-ONLY-NO-BACKEND-DATABASE-IMPORTS',
  'C15-COMMAND-ENDPOINTS-USE-EXPLICIT-WORKFLOW-ACTIONS',
  'C15-IDEMPOTENCY-KEYS-FOR-GRN-PAYMENT-IMPORT-EXPORT-RETRY-SENSITIVE-COMMANDS',
  'C15-TANSTACK-QUERY-CACHING-INVALIDATION-AFTER-MUTATIONS',
  'C15-FORMS-USE-SHARED-ZOD-CONTRACTS-OR-MANIFESTED-PAYLOAD-SHAPES',
  'C15-WORKFLOW-STATE-GATES-BUTTONS-BY-STATUS-PERMISSIONS-AND-SCOPE',
  'C15-DESTRUCTIVE-HIGH-RISK-ACTIONS-REQUIRE-EXPLICIT-CONFIRMATION',
  'C15-DOCUMENTS-PHOTOS-SIGNATURES-USE-STORAGE-UPLOAD-INTENT',
  'C15-PORTAL-PWA-OFFLINE-SYNC-SURFACE-PRESENT',
  'C15-CRITICAL-STOCK-MONEY-APPROVAL-MUTATIONS-ARE-API-COMMANDS-NOT-FRONTEND-SHORTCUTS',
];
for (const control of requiredControls) {
  if (!manifest.includes(control)) fail(`Frontend workflow manifest missing locked control ${control}`);
  if (!workbench.includes('FrontendWorkflowCompletionManifest.controls') && !workbench.includes(control)) fail(`Frontend workflow UI does not render locked control set ${control}`);
}

const requiredStages = [
  'CRM_AND_PROJECT_START',
  'PROJECT_BOM_AND_MATERIAL_REQUIREMENT',
  'PROCUREMENT_RFQ_PO_GRN',
  'INVENTORY_STOCK_SERIAL_BATCH',
  'ASSET_INSTALLATION_QR_WARRANTY',
  'FIELD_SERVICE_AND_MAINTENANCE',
  'FINANCE_MATCH_POST_PAY',
  'DOCUMENTS_REPORTS_PORTALS',
];
for (const stage of requiredStages) {
  if (!manifest.includes(stage)) fail(`Frontend workflow manifest missing lifecycle stage ${stage}`);
  if (!workbench.includes(stage)) fail(`Frontend workflow workbench missing lifecycle stage ${stage}`);
}

const requiredCommandIds = [
  'project-create-material-requirement',
  'project-approve-bom',
  'purchase-request-submit',
  'purchase-request-approve',
  'purchase-request-create-rfq',
  'rfq-invite-vendors',
  'rfq-publish',
  'supplier-quotation-select',
  'purchase-order-submit',
  'purchase-order-approve',
  'purchase-order-send',
  'goods-receipt-create',
  'goods-receipt-inspect',
  'inventory-transfer-dispatch',
  'inventory-adjustment-post',
  'asset-install',
  'asset-qr-rotate',
  'work-order-assign',
  'work-order-complete',
  'maintenance-generate-work-order',
  'supplier-invoice-match',
  'customer-invoice-post',
  'payment-record',
  'data-import-validate',
  'report-export',
  'document-upload-intent',
];
for (const commandId of requiredCommandIds) {
  if (!manifest.includes(`id: '${commandId}'`)) fail(`Frontend workflow command catalog missing ${commandId}`);
}

const commandBlocks = [...manifest.matchAll(/\{\s*\n\s*id: '([^']+)'[\s\S]*?\n\s*\},/g)].map((match) => ({ id: match[1], block: match[0] }));
if (commandBlocks.length < 26) fail(`Frontend workflow command catalog has ${commandBlocks.length} commands; expected at least 26.`);

const explicitCommandMarkers = ['/submit', '/approve', '/reject', '/create-rfq', '/invite-vendors', '/publish', '/select', '/send', '/receive', '/inspect', '/dispatch', '/post', '/install', '/complete', '/match', '/check-in', '/check-out', '/location', '/material-request', '/qr/rotate', '/assign', '/generate-work-order', '/validate', '/allocate', '/rollback'];
const allowedCreateCommandEndpoints = ['/goods-receipts', '/payments', '/documents/upload-intent', '/documents/complete-upload', '/reports/exports'];
const idempotencyMarkers = ['/submit', '/approve', '/goods-receipts', '/receive', '/dispatch', '/post', '/complete', '/match', '/payments', '/imports/', '/reports/exports'];
for (const { id, block } of commandBlocks) {
  const endpoint = block.match(/endpointTemplate: '([^']+)'/)?.[1];
  const method = block.match(/method: '([^']+)'/)?.[1];
  const permission = block.match(/requiredPermission: '([^']+)'/)?.[1];
  const requiredStatus = block.match(/requiredStatus: \[([^\]]*)\]/)?.[1] ?? '';
  const invalidates = block.match(/invalidates: \[([^\]]*)\]/)?.[1] ?? '';
  if (!endpoint) fail(`Frontend workflow command ${id} is missing endpointTemplate.`);
  if (!method) fail(`Frontend workflow command ${id} is missing method.`);
  if (method === 'GET') fail(`Frontend workflow command ${id} uses GET for workflow mutation.`);
  if (endpoint && !endpoint.startsWith('/')) fail(`Frontend workflow command ${id} endpoint is not public relative API path: ${endpoint}`);
  if (endpoint && (endpoint.includes('/jobs/') || endpoint.includes('/queues/') || endpoint.includes('/worker/'))) {
    fail(`Frontend workflow command ${id} attempts critical async shortcut: ${endpoint}`);
  }
  if (!permission) fail(`Frontend workflow command ${id} is missing requiredPermission.`);
  if (!requiredStatus.trim()) fail(`Frontend workflow command ${id} is missing requiredStatus gate.`);
  if (!invalidates.trim()) fail(`Frontend workflow command ${id} is missing TanStack invalidation keys.`);
  const isExplicitCommand = endpoint && explicitCommandMarkers.some((marker) => endpoint.includes(marker));
  const isAllowedCreateCommand = endpoint && allowedCreateCommandEndpoints.some((allowed) => endpoint === allowed || endpoint.startsWith(`${allowed}/`));
  if (endpoint && !isExplicitCommand && !isAllowedCreateCommand) {
    fail(`Frontend workflow command ${id} lacks explicit workflow command endpoint marker: ${endpoint}`);
  }
  if (endpoint && idempotencyMarkers.some((marker) => endpoint.includes(marker)) && !block.includes('requiresIdempotencyKey: true')) {
    fail(`Frontend workflow command ${id} must require Idempotency-Key for retry-sensitive command ${endpoint}.`);
  }
}

const requiredWorkbenchMarkers = [
  'useMutation',
  'useQuery',
  'useQueryClient',
  'apiRequest',
  'buildM18CommandHeaders',
  'assertM18CommandExecutionGuard',
  'resolveM18CommandGate',
  'invalidateQueries',
  'FrontendWorkflowCommandCatalog',
  'FrontendWorkflowReadModels',
  'C15_FRONTEND_WORKFLOW_COMPLETION',
  'Idempotency-Key',
  'destructiveOrHighRisk',
  'requiredPermission',
  'requiredStatus',
];
for (const marker of requiredWorkbenchMarkers) {
  if (!workbench.includes(marker) && !runtimePolicy.includes(marker)) fail(`Frontend workflow workbench/policy missing marker ${marker}.`);
}

const requiredRoutes = [
  '/workflow-completion',
  '/customers',
  '/projects',
  '/procurement/workflow',
  '/procurement/purchase-requests',
  '/procurement/rfqs',
  '/procurement/purchase-orders',
  '/procurement/goods-receipts',
  '/inventory/ledger',
  '/assets/lifecycle',
  '/service/field-operations',
  '/finance/workbench',
  '/documents-notifications',
  '/reports-workbench',
  '/customer-portal',
  '/vendor-portal',
  '/technician-pwa',
];
for (const route of requiredRoutes) {
  if (route === '/workflow-completion') {
    requireText('frontend/src/app/(erp)/workflow-completion/page.tsx', 'FrontendWorkflowCompletionWorkbench', 'workflow completion page binding');
  } else if (!workbench.includes(route)) {
    fail(`Frontend workflow workbench missing navigation route ${route}`);
  }
}

const apiClientRoutesThroughBase =
  apiClient.includes('fetch(`${apiBaseUrl}${path}`') ||
  apiClient.includes('fetch(`${apiBaseUrl}${path}`,') ||
  apiClient.includes('fetch(`${apiBaseUrl}${toApiPath(path, query)}`') ||
  apiClient.includes('apiBaseUrl') && apiClient.includes('toApiPath(path, query)');
if (!apiClientRoutesThroughBase) {
  fail('Frontend apiRequest is not visibly routing through centralized apiBaseUrl.');
}
if (!apiBase.includes('API_BASE_PATH')) fail('Frontend apiBaseUrl does not use shared API_BASE_PATH.');

const frontendCodeFiles = listFiles('frontend/src', (absolute) => /\.(tsx?|jsx?)$/.test(absolute));
const forbiddenImports = [
  '@nexora/database',
  '@prisma/client',
  'minio',
  'bullmq',
  'ioredis',
  '../backend',
  '../../backend',
  '../../../backend',
  '../database',
  '../../database',
  '../../../database',
];
for (const absolute of frontendCodeFiles) {
  const text = readFileSync(absolute, 'utf8');
  const importLines = text.split(/\r?\n/).filter((line) => /^\s*import\b/.test(line));
  for (const line of importLines) {
    for (const forbidden of forbiddenImports) {
      if (line.includes(forbidden)) fail(`${relative(root, absolute)} contains forbidden frontend import: ${line.trim()}`);
    }
  }
}

requireText('backend/src/modules/frontend-workflows/frontend-workflow-policy.ts', 'assertFrontendUsesPublicApiOnly', 'frontend public API policy invariant');
requireText('backend/src/modules/frontend-workflows/frontend-workflow-policy.ts', 'assertWorkflowCommandEndpoint', 'explicit command endpoint policy invariant');
requireText('backend/src/modules/frontend-workflows/frontend-workflow-policy.ts', 'assertIdempotencyHeader', 'idempotency policy invariant');
requireText('backend/src/modules/frontend-workflows/frontend-workflow-policy.ts', 'assertTanStackInvalidation', 'TanStack invalidation policy invariant');
requireText('backend/src/modules/frontend-workflows/frontend-workflow-policy.ts', 'assertStorageUploadIntentForDocuments', 'document upload-intent policy invariant');
requireText('backend/src/modules/frontend-workflows/frontend-workflow-policy.test.ts', 'C15 frontend workflow completion policy', 'policy test suite');
requireText('backend/src/modules/frontend-workflows/frontend-workflow-completion.integration.test.ts', 'runtimeAcceptanceSuite', 'runtime acceptance declaration');
requireText('frontend/src/app/(erp)/layout.tsx', 'ErpRouteShell', 'workflow completion route-group shell');
requireText('frontend/src/app/(erp)/layout.tsx', 'ErpRouteShell', 'frontend runtime route-group shell');
requireText('frontend/src/modules/navigation/navigation-registry.ts', 'Workflow Completion', 'navigation registry entry for workflow completion');

mkdirSync(outDir, { recursive: true });
const payload = {
  gate: 'frontend-workflows-check',
  pass: 'M13',
  title: 'Frontend Workflow Completion Gate',
  startedAt,
  completedAt: new Date().toISOString(),
  certificationScope: 'Zero-dependency static/source gate for frontend workflow completion. Dependency-backed Next.js build, TypeScript and browser E2E remain local after M1 lockfile completion.',
  lockedStackPreserved: true,
  commandCount: commandBlocks.length,
  lifecycleStageCount: requiredStages.length,
  controlCount: requiredControls.length,
  frontendCodeFilesScanned: frontendCodeFiles.length,
  requiredRoutes,
  failures,
};
writeFileSync(join(outDir, 'pass-m13-frontend-workflows-gate-certification.json'), `${JSON.stringify(payload, null, 2)}\n`);

if (failures.length > 0) {
  console.error('Frontend-workflows gate FAILED');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log(`Frontend-workflows gate PASSED: ${commandBlocks.length} guarded commands, ${requiredStages.length} lifecycle stages, ${requiredControls.length} controls, ${frontendCodeFiles.length} frontend source files scanned.`);
