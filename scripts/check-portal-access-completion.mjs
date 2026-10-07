import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const startedAt = new Date().toISOString();
const failures = [];
const priorResults = [];

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
  if (!existsSync(file(path))) fail(`Missing required M14 portal source file: ${path}`);
}

function requireText(path, marker, description = marker) {
  if (!existsSync(file(path))) {
    fail(`Cannot inspect missing file ${path} for ${description}`);
    return;
  }
  if (!read(path).includes(marker)) fail(`${path} missing ${description}`);
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

function runPriorGate(name, script) {
  const run = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });
  priorResults.push({ name, script, status: run.status === 0 ? 'passed' : 'failed', exitCode: run.status, stdout: run.stdout.trim(), stderr: run.stderr.trim() });
  if (run.status !== 0) fail(`Prior gate failed: ${name}`);
  else if (run.stdout.trim()) console.log(run.stdout.trim());
}

runPriorGate('crm-portals', 'scripts/check-crm-portals.mjs');

const requiredFiles = [
  'docs/compliance/CUSTOMER_VENDOR_TECHNICIAN_PORTALS.md',
  'docs/contracts/capability-locks/crm-portals-pwa-advanced-ops.json',
  'backend/src/modules/portals/portal-access-policy.ts',
  'backend/src/modules/portals/portal-access-policy.test.ts',
  'backend/src/modules/portals/portal-workspace.integration.test.ts',
  'backend/src/modules/portals/portal-offline-completion-policy.ts',
  'backend/src/modules/portals/portal-offline-completion-policy.test.ts',
  'shared/src/contracts/portal/portal-offline-completion.contracts.ts',
  'frontend/src/modules/portals/portal-workspaces.tsx',
  'frontend/src/modules/portals/portal-offline-completion-workbench.tsx',
  'frontend/src/app/(erp)/portals/page.tsx',
  'frontend/src/app/(erp)/portals/completion/page.tsx',
  'frontend/src/app/(portal)/customer-portal/page.tsx',
  'frontend/src/app/(portal)/vendor-portal/page.tsx',
  'frontend/src/app/(technician)/technician-pwa/page.tsx',
];
requiredFiles.forEach(requireFile);

const c14Controls = [
  'C14-CUSTOMER-PORTAL-LINKED-CUSTOMER-SCOPE',
  'C14-VENDOR-PORTAL-LINKED-VENDOR-SCOPE',
  'C14-TECHNICIAN-PWA-ASSIGNED-WORKORDER-SCOPE',
  'C14-PORTAL-TOKEN-NEVER-BYPASSES-AUTHORIZATION',
  'C14-QR-ASSET-RESOLUTION-AUTHORIZED',
  'C14-PORTAL-PERMISSION-FILTERED-DOCUMENTS-INVOICES-PAYMENTS',
  'C14-OFFLINE-SYNC-IDEMPOTENT-AND-TENANT-SCOPED',
  'C14-PWA-PHOTOS-SIGNATURES-USE-DOCUMENT-STORAGE',
  'C14-PORTAL-ACTIONS-AUDITED',
  'C14-NO-CROSS-TENANT-PORTAL-DATA',
];
for (const control of c14Controls) {
  requireText('backend/src/modules/portals/portal-access-policy.ts', control, `portal access invariant ${control}`);
  requireText('backend/src/modules/portals/portal-access-policy.test.ts', control, `portal access invariant test ${control}`);
}

const m17Controls = [
  'M17-CUSTOMER-PORTAL-LINKED-CUSTOMER-SURFACES',
  'M17-CUSTOMER-PORTAL-WORK-APPROVAL-SIGNATURE-DOCUMENT',
  'M17-VENDOR-PORTAL-LINKED-VENDOR-RFQ-PO-INVOICE-SCOPE',
  'M17-VENDOR-PORTAL-QUOTATION-SUBMISSION-GUARD',
  'M17-TECHNICIAN-PWA-ASSIGNED-JOB-SCOPE',
  'M17-TECHNICIAN-PWA-ONLINE-COMMAND-STATE-MACHINE',
  'M17-TECHNICIAN-PWA-QR-SCAN-AUTHORIZATION',
  'M17-TECHNICIAN-PWA-DOCUMENT-BACKED-EVIDENCE',
  'M17-OFFLINE-SYNC-TENANT-DEVICE-TECHNICIAN-SCOPE',
  'M17-OFFLINE-SYNC-CLIENT-COMMAND-IDEMPOTENCY',
  'M17-OFFLINE-SYNC-ORDERING-AND-CONFLICT-POLICY',
  'M17-PORTAL-ACTIVITY-AUDIT-TRAIL',
  'M17-PORTAL-DOCUMENT-INVOICE-PAYMENT-SCOPE',
  'M17-NO-ASYNC-CRITICAL-MUTATION',
];
for (const control of m17Controls) {
  requireText('backend/src/modules/portals/portal-offline-completion-policy.ts', control, `offline/PWA invariant ${control}`);
  requireText('backend/src/modules/portals/portal-offline-completion-policy.test.ts', control, `offline/PWA invariant test ${control}`);
}

const requiredPolicyFunctions = [
  'assertCustomerPortalScope',
  'assertVendorPortalScope',
  'assertTechnicianWorkOrderScope',
  'assertPortalTokenNotAuthorization',
  'assertQrPortalAuthorization',
  'assertPortalDocumentVisibility',
  'assertOfflineSyncSafety',
  'assertPwaEvidenceUsesDocumentStorage',
  'assertPortalActionAuditable',
  'assertM17CustomerPortalSurfaceScope',
  'assertM17VendorPortalSurfaceScope',
  'assertM17TechnicianPwaJobScope',
  'assertM17OfflineCommandIdempotency',
  'assertM17NoAsyncCriticalMutation',
];
const portalPolicyCombined = `${existsSync(file('backend/src/modules/portals/portal-access-policy.ts')) ? read('backend/src/modules/portals/portal-access-policy.ts') : ''}\n${existsSync(file('backend/src/modules/portals/portal-offline-completion-policy.ts')) ? read('backend/src/modules/portals/portal-offline-completion-policy.ts') : ''}`;
for (const fn of requiredPolicyFunctions) {
  if (!portalPolicyCombined.includes(`function ${fn}`) && !portalPolicyCombined.includes(`export function ${fn}`)) fail(`Portal policy function missing: ${fn}`);
}

const contract = existsSync(file('shared/src/contracts/portal/portal-offline-completion.contracts.ts')) ? read('shared/src/contracts/portal/portal-offline-completion.contracts.ts') : '';
for (const marker of ['PortalLinkedSubjectSchema', 'PortalCustomerSurfaceRequestSchema', 'PortalVendorSurfaceRequestSchema', 'TechnicianPwaCommandCompletionSchema', 'OfflineSyncBatchCompletionSchema', 'PortalPwaOfflineCompletionManifest']) {
  if (!contract.includes(marker)) fail(`Shared portal/PWA contract missing ${marker}`);
}
for (const route of [
  'GET /api/v1/portal/customer/dashboard',
  'POST /api/v1/portal/customer/work-orders/:id/approve',
  'POST /api/v1/portal/vendor/rfqs/:id/quotations',
  'GET /api/v1/portal/technician/jobs',
  'POST /api/v1/portal/technician/offline-sync',
]) {
  if (!contract.includes(route)) fail(`Portal/PWA route manifest missing ${route}`);
}

const pages = [
  ['frontend/src/app/(erp)/portals/page.tsx', 'PortalWorkspaces'],
  ['frontend/src/app/(portal)/customer-portal/page.tsx', 'PortalWorkspaces'],
  ['frontend/src/app/(portal)/vendor-portal/page.tsx', 'PortalWorkspaces'],
  ['frontend/src/app/(technician)/technician-pwa/page.tsx', 'PortalWorkspaces'],
  ['frontend/src/app/(erp)/portals/completion/page.tsx', 'PortalOfflineCompletionWorkbench'],
];
for (const [path, component] of pages) {
  const pageText = existsSync(file(path)) ? read(path) : '';
  if (/import\s*\{\s*AppShell\s*\}/.test(pageText) || /<\/?AppShell\b/.test(pageText)) fail(`${path} must rely on its route-group shell, not direct AppShell wrapping.`);
  requireText(path, component, `${path} portal component binding`);
}
requireText('frontend/src/app/(erp)/layout.tsx', 'ErpRouteShell', 'internal portal-workbench ERP route-group shell');
requireText('frontend/src/app/(portal)/layout.tsx', 'PortalShell', 'customer/vendor portal route-group shell');
requireText('frontend/src/app/(technician)/layout.tsx', 'TechnicianPwaShell', 'technician PWA route-group shell');

const portalWorkspace = existsSync(file('frontend/src/modules/portals/portal-workspaces.tsx')) ? read('frontend/src/modules/portals/portal-workspaces.tsx') : '';
for (const marker of ['Customer Portal', 'Vendor Portal', 'Technician PWA', 'linked customer', 'linked supplier', 'assigned field jobs', 'QR tokens', 'offline-safe replay']) {
  if (!portalWorkspace.includes(marker)) fail(`Portal workspace UI missing marker: ${marker}`);
}

const offlineWorkbench = existsSync(file('frontend/src/modules/portals/portal-offline-completion-workbench.tsx')) ? read('frontend/src/modules/portals/portal-offline-completion-workbench.tsx') : '';
for (const marker of ['useMutation', 'useQuery', 'useQueryClient', 'apiRequest', 'Idempotency-Key', '/portal/customer/', '/portal/vendor/', '/portal/technician/', 'clientCommandId', 'signatureDocumentId', 'evidenceDocumentIds', 'invalidateQueries']) {
  if (!offlineWorkbench.includes(marker)) fail(`Portal offline completion workbench missing marker: ${marker}`);
}
if (/rawBase64|base64Inline|inlineBlob/.test(offlineWorkbench)) {
  fail('Portal frontend workbench contains raw inline blob/base64 evidence marker; evidence must use Document IDs.');
}

const nav = existsSync(file('frontend/src/modules/navigation/navigation-registry.ts')) ? read('frontend/src/modules/navigation/navigation-registry.ts') : '';
for (const href of ['/portals', '/portals/completion', '/customer-portal', '/vendor-portal', '/technician-pwa']) {
  if (!nav.includes(`href: '${href}'`)) fail(`Navigation registry missing portal route ${href}`);
}
for (const marker of ['surface: \'PORTAL_WORKSPACE\'', 'surface: \'PWA_OFFLINE_QUEUE\'', "moduleKey: 'portal'"]) {
  if (!nav.includes(marker)) fail(`Navigation registry missing portal marker ${marker}`);
}

const frontendFiles = listFiles('frontend/src', (absolute) => /\.(ts|tsx)$/.test(absolute));
for (const absolute of frontendFiles) {
  const relativePath = relative(root, absolute).replaceAll('\\', '/');
  const text = readFileSync(absolute, 'utf8');
  if (/from ['\"](?:\.\.\/)*backend\//.test(text) || /from ['\"](?:\.\.\/)*database\//.test(text)) {
    fail(`Frontend portal/static boundary violation: backend/database import in ${relativePath}`);
  }
  for (const banned of ['@prisma/client', 'minio', 'bullmq', 'ioredis', 'node:fs', 'node:path']) {
    if (text.includes(`from '${banned}'`) || text.includes(`from \"${banned}\"`)) fail(`Frontend imports server-only package ${banned} in ${relativePath}`);
  }
}

const integrationTest = existsSync(file('backend/src/modules/portals/portal-workspace.integration.test.ts')) ? read('backend/src/modules/portals/portal-workspace.integration.test.ts') : '';
for (const marker of ['linked customer', 'linked vendor', 'assigned technician', 'QR asset lookup never bypasses authorization', 'offline technician sync is idempotent', 'centralized document storage']) {
  if (!integrationTest.includes(marker)) fail(`Portal runtime acceptance test missing evidence marker: ${marker}`);
}

const lock = existsSync(file('docs/contracts/capability-locks/crm-portals-pwa-advanced-ops.json')) ? JSON.parse(read('docs/contracts/capability-locks/crm-portals-pwa-advanced-ops.json')) : { lockedRouteCount: 0, newPhysicalModelCount: 0 };
const pkg = JSON.parse(read('package.json'));
if (!String(pkg.scripts?.['verify:static'] ?? '').includes('portal-access:check')) fail('verify:static does not include portal-access:check.');
if (!String(pkg.scripts?.verify ?? '').includes('portal-access:check')) fail('verify does not include portal-access:check.');
if (!String(pkg.scripts?.['pass:m14:certify'] ?? '').includes('check-portal-access-completion.mjs')) fail('package.json missing pass:m14:certify script.');

const failed = failures.length;
const payload = {
  gate: 'pass-m14-portal-access-completion',
  pass: 'M14',
  title: 'Customer, Vendor and Technician Portal Access Completion Gate',
  startedAt,
  completedAt: new Date().toISOString(),
  lockedStack: 'Next.js + TypeScript frontend, Fastify + TypeScript backend, PostgreSQL + Prisma, MinIO, Redis, BullMQ, Docker Compose, Nginx, GitHub Actions',
  scope: 'Zero-dependency static/source portal access, linked-subject, QR authorization, document evidence and offline replay certification. Runtime/browser/API certification remains gated by lockfile, dependencies and live services.',
  crmPortalLockedRoutes: lock.lockedRouteCount,
  crmPortalModels: lock.newPhysicalModelCount,
  c14Controls: c14Controls.length,
  m17OfflineControls: m17Controls.length,
  frontendFilesScanned: frontendFiles.length,
  priorResults,
  failures,
};
mkdirSync(file('certification-output'), { recursive: true });
writeFileSync(file('certification-output/pass-m14-portal-access-certification.json'), `${JSON.stringify(payload, null, 2)}\n`);

if (failed) {
  console.error('PASS M14 portal-access completion gate FAILED');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log(`PASS M14 portal-access completion gate PASSED: ${payload.crmPortalLockedRoutes} locked CRM/portal-support routes, ${payload.crmPortalModels} portal/CRM models, ${payload.c14Controls + payload.m17OfflineControls} portal/PWA controls, ${payload.frontendFilesScanned} frontend files scanned.`);
