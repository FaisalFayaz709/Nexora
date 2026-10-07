import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const sourceOnly = process.argv.includes('--source-only');
const startedAt = new Date().toISOString();

function path(...parts) { return join(root, ...parts); }
function rel(file) { return relative(root, file).split(sep).join('/'); }
function read(projectPath) { return readFileSync(path(projectPath), 'utf8'); }
function fail(message) { failures.push(message); }
function warn(message) { warnings.push(message); }
function requireFile(projectPath) { if (!existsSync(path(projectPath))) fail(`Missing required R4 file: ${projectPath}`); }
function requireText(projectPath, marker, description = marker) {
  if (!existsSync(path(projectPath))) { fail(`Cannot inspect missing file ${projectPath} for ${description}`); return; }
  const text = read(projectPath);
  if (!text.includes(marker)) fail(`${projectPath} missing ${description}`);
}
function walk(dir, files = []) {
  const absoluteDir = path(dir);
  if (!existsSync(absoluteDir)) return files;
  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    const full = join(absoluteDir, entry.name);
    if (entry.isDirectory()) walk(rel(full), files);
    else files.push(full);
  }
  return files;
}

const requiredFiles = [
  'frontend/src/lib/api-client.ts',
  'frontend/src/lib/module-api.ts',
  'frontend/src/lib/query-client.ts',
  'frontend/src/lib/permissions.ts',
  'frontend/src/lib/route-map.ts',
  'frontend/src/modules/core/api-client.ts',
  'frontend/src/modules/api-registry.ts',
  'frontend/src/modules/auth/api.ts',
  'frontend/src/modules/identity/api.ts',
  'frontend/src/modules/organization/api.ts',
  'frontend/src/modules/masters/api.ts',
  'frontend/src/modules/inventory/api.ts',
  'frontend/src/modules/procurement/api.ts',
  'frontend/src/modules/projects/api.ts',
  'frontend/src/modules/assets/api.ts',
  'frontend/src/modules/service/api.ts',
  'frontend/src/modules/maintenance/api.ts',
  'frontend/src/modules/finance/api.ts',
  'frontend/src/modules/platform/api.ts',
  'frontend/src/modules/reports/api.ts',
  'frontend/src/modules/portals/api.ts',
];
requiredFiles.forEach(requireFile);

requireText('frontend/src/lib/api-client.ts', 'export class ApiClientError', 'stable frontend API error class');
requireText('frontend/src/lib/api-client.ts', 'x-organization-id', 'tenant context header injection');
requireText('frontend/src/lib/api-client.ts', 'x-request-id', 'requestId header injection');
requireText('frontend/src/lib/api-client.ts', 'credentials: \'include\'', 'cookie/session credential inclusion');
requireText('frontend/src/lib/api-client.ts', 'Idempotency-Key', 'idempotency key support');
requireText('frontend/src/lib/api-client.ts', 'API_BASE_PATH', 'Fastify /api/v1 base path awareness');
requireText('frontend/src/lib/api-client.ts', 'apiBaseUrl', 'central api base configuration');
requireText('frontend/src/lib/api-client.ts', 'errorBody?.error?.code', 'backend stable error mapping');
requireText('frontend/src/lib/module-api.ts', 'createCrudResourceApi', 'module resource API factory');
requireText('frontend/src/lib/module-api.ts', 'postCommand', 'explicit command mutation helper');
requireText('frontend/src/lib/query-client.ts', 'createModuleQueryKeys', 'central query key factory');
requireText('frontend/src/lib/query-client.ts', 'stableObject', 'stable filter object query keys');
requireText('frontend/src/lib/permissions.ts', 'PERMISSION_KEYS', 'shared permission constants in frontend');
requireText('frontend/src/lib/route-map.ts', 'FRONTEND_ROUTE_MAP', 'route to API/permission registry');
requireText('frontend/src/lib/route-map.ts', '/portal/technician/offline-sync', 'offline sync frontend route/API map entry');
requireText('frontend/src/modules/core/api-client.ts', "export * from '@/lib/api-client'", 'legacy API client compatibility re-export');
requireText('frontend/src/modules/procurement/api.ts', 'submitPurchaseRequest', 'procurement command endpoint wrapper');
requireText('frontend/src/modules/procurement/api.ts', 'getRfqComparison', 'procurement comparison API wrapper');
requireText('frontend/src/modules/inventory/api.ts', 'dispatchTransfer', 'inventory command endpoint wrapper');
requireText('frontend/src/modules/inventory/api.ts', 'lookupSerial', 'serial lookup API wrapper');
requireText('frontend/src/modules/finance/api.ts', 'matchSupplierInvoice', 'three-way match API wrapper');
requireText('frontend/src/modules/service/api.ts', 'completeWorkOrder', 'service command endpoint wrapper');
requireText('frontend/src/modules/portals/api.ts', 'syncTechnicianOffline', 'technician offline-sync API wrapper');
requireText('frontend/src/modules/api-registry.ts', 'procurementApi', 'module API registry export');
requireText('package.json', 'frontend:api:check', 'R4 npm script');
requireText('.github/workflows/ci.yml', 'R4 central API/query source gate', 'R4 CI source gate');

const frontendCodeFiles = walk('frontend/src').filter((file) => /\.(tsx?|jsx?)$/.test(file));
for (const file of frontendCodeFiles) {
  const projectPath = rel(file);
  const text = readFileSync(file, 'utf8');
  if (projectPath !== 'frontend/src/lib/api-client.ts' && /\bfetch\s*\(/.test(text)) {
    fail(`Raw fetch outside centralized API client: ${projectPath}`);
  }
  if (projectPath !== 'frontend/src/modules/core/api-client.ts' && text.includes("../core/api-client")) {
    fail(`Legacy relative core API client import remains: ${projectPath}`);
  }
  if (projectPath !== 'frontend/src/modules/core/api-client.ts' && text.includes("../../modules/core/api-client")) {
    fail(`Legacy modules/core API client import remains: ${projectPath}`);
  }
  const importLines = text.split(/\r?\n/).filter((line) => /^\s*import\b/.test(line));
  for (const line of importLines) {
    for (const forbidden of ['@nexora/database', '@prisma/client', 'minio', 'bullmq', 'ioredis']) {
      if (line.includes(forbidden)) fail(`${projectPath} contains forbidden frontend/server import: ${line.trim()}`);
    }
  }
}

const moduleApiFiles = walk('frontend/src/modules').filter((file) => file.endsWith('/api.ts'));
if (moduleApiFiles.length < 15) fail(`Expected at least 15 module-owned api.ts files; found ${moduleApiFiles.length}.`);
for (const file of moduleApiFiles) {
  const text = readFileSync(file, 'utf8');
  const projectPath = rel(file);
  if (!text.includes('Endpoints') && !text.includes('endpoints')) fail(`${projectPath} does not define endpoint constants.`);
  if (!text.includes('Keys') && !text.includes('keys')) fail(`${projectPath} does not define query-key factories.`);
  if (!/api(Get|Post|Put|Patch|Delete)|createCrudResourceApi|postCommand/.test(text)) fail(`${projectPath} does not use approved API wrapper helpers.`);
}

if (sourceOnly) warn('Source-only mode: TypeScript build, real API calls and TanStack Query hook runtime were not executed.');
if (!existsSync(path('pnpm-lock.yaml'))) warn('pnpm-lock.yaml is still absent until registry-backed pnpm install is run on a connected machine.');

mkdirSync(path('certification-output'), { recursive: true });
const payload = {
  gate: 'pass-r4-central-api-query-system',
  pass: 'R4',
  title: 'Central frontend API client and query-key system source gate',
  startedAt,
  completedAt: new Date().toISOString(),
  sourceOnly,
  lockedStackPreserved: true,
  scope: 'Centralizes frontend API calls through api-client.ts, module api.ts files, query key factories, route/API mapping and shared permission helpers while preserving Fastify /api/v1 as the only ERP business API.',
  moduleApiFileCount: moduleApiFiles.length,
  frontendCodeFilesScanned: frontendCodeFiles.length,
  warnings,
  failures,
};
writeFileSync(path('certification-output/pass-r4-central-api-query-system.json'), `${JSON.stringify(payload, null, 2)}\n`);

if (failures.length > 0) {
  console.error('Pass R4 central API/query gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Pass R4 central API/query gate PASSED: ${moduleApiFiles.length} module API files and ${frontendCodeFiles.length} frontend code files scanned.`);
for (const warning of warnings) console.warn(`WARN: ${warning}`);
