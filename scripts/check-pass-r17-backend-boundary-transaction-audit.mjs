#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve } from 'node:path';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const failures = [];
const warnings = [];

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walk(path));
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) out.push(path);
  }
  return out;
}
function read(file) { return readFileSync(file, 'utf8'); }
function rel(file) { return relative(root, file).replace(/\\/g, '/'); }
function has(text, pattern) { return typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text); }
function requireFile(path, label = path) {
  if (!existsSync(join(root, path))) failures.push(`Missing ${label}: ${path}`);
}

const requiredFiles = [
  'backend/src/core/compliance/backend-boundary-transaction-audit.ts',
  'backend/src/core/compliance/backend-boundary-transaction-audit.test.ts',
];
for (const file of requiredFiles) requireFile(file);

const backendFiles = walk(join(root, 'backend/src')).filter((file) => /\.ts$/.test(file));
const moduleFiles = walk(join(root, 'backend/src/modules')).filter((file) => /\.ts$/.test(file));
const frontendFiles = walk(join(root, 'frontend/src')).filter((file) => /\.(ts|tsx)$/.test(file));

const routeFiles = backendFiles.filter((file) => file.endsWith('.routes.ts'));
const controllerFiles = backendFiles.filter((file) => file.endsWith('.controller.ts'));
const serviceFiles = backendFiles.filter((file) => file.endsWith('.service.ts') && !file.endsWith('.test.ts'));
const repositoryFiles = backendFiles.filter((file) => file.endsWith('.repository.ts'));
const facadeFiles = backendFiles.filter((file) => file.endsWith('.facade.ts'));

for (const file of [...routeFiles, ...controllerFiles]) {
  const text = read(file);
  if (has(text, /@nexora\/database|@prisma\/client|PrismaClient|\bprisma\s*\.|\$queryRaw|\$executeRaw/)) {
    failures.push(`Direct persistence dependency in route/controller: ${rel(file)}`);
  }
  if (file.endsWith('.controller.ts') && has(text, /withTransaction|new\s+[A-Za-z0-9_]+Repository\b|\.repository\b|\bdb\s*\./)) {
    failures.push(`Controller appears to coordinate transactions/repositories directly: ${rel(file)}`);
  }
}

for (const file of serviceFiles) {
  const text = read(file);
  if (has(text, /PrismaClient|\bprisma\s*\.|\$queryRaw|\$executeRaw/)) {
    failures.push(`Service direct database client usage; use repository + transaction coordination only: ${rel(file)}`);
  }
  if (has(text, /\btx\s*\.\s*[a-zA-Z]\w*\s*\./)) {
    failures.push(`Service appears to call a transaction model directly instead of repository/facade: ${rel(file)}`);
  }
}

for (const file of repositoryFiles) {
  const text = read(file);
  if (!has(text, '@nexora/database')) warnings.push(`Repository does not import @nexora/database; verify persistence ownership manually: ${rel(file)}`);
  if (!has(text, /organizationId|tenant/i)) warnings.push(`Repository has no visible organizationId/tenant marker; verify this is non-tenant or scoped elsewhere: ${rel(file)}`);
}

const modulesRoot = resolve(root, 'backend/src/modules');
const importRegex = /import(?:\s+type)?\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;
for (const file of moduleFiles) {
  const fileRel = relative(modulesRoot, file).replace(/\\/g, '/');
  const owner = fileRel.split('/')[0];
  const text = read(file);
  for (const match of text.matchAll(importRegex)) {
    const importPath = match[1];
    if (!importPath.startsWith('.')) continue;
    const resolved = normalize(resolve(dirname(file), importPath.replace(/\.js$/, '.ts')));
    if (!resolved.startsWith(modulesRoot)) continue;
    const targetRel = relative(modulesRoot, resolved).replace(/\\/g, '/');
    const targetOwner = targetRel.split('/')[0];
    if (!targetOwner || targetOwner === owner) continue;
    const normalizedImport = importPath.replace(/\\/g, '/');
    const publicIndex = normalizedImport.endsWith('/index.js') || targetRel === `${targetOwner}/index.ts` || targetRel === `${targetOwner}/index`;
    if (!publicIndex) failures.push(`Cross-module private import: ${fileRel} -> ${importPath}`);
  }
}

const criticalDomains = ['approvals', 'assets', 'finance', 'inventory', 'maintenance', 'procurement', 'service'];
for (const domain of criticalDomains) {
  const domainPath = join(root, 'backend/src/modules', domain);
  if (!existsSync(domainPath)) failures.push(`Missing critical backend domain: ${domain}`);
}

const criticalRuntimeFiles = criticalDomains.flatMap((domain) => walk(join(root, 'backend/src/modules', domain)))
  .filter((file) => /\.ts$/.test(file) && !file.endsWith('.test.ts') && !file.endsWith('.integration.test.ts'));
for (const file of criticalRuntimeFiles) {
  const text = read(file);
  if (has(text, /from\s+['"]bullmq['"]|new\s+Queue\s*\(/)) {
    failures.push(`Critical domain imports/creates BullMQ directly; async cannot own critical state: ${rel(file)}`);
  }
}

const criticalServiceExpectations = [
  ['approvals/approval.service.ts', ['withTransaction', 'AuditWriter', 'ApprovalRepository']],
  ['assets/asset.service.ts', ['withTransaction', 'AuditWriter', 'AssetRepository']],
  ['finance/finance.service.ts', ['withTransaction', 'AuditWriter', 'FinanceRepository']],
  ['inventory/stock-transfer.service.ts', ['withTransaction', 'AuditWriter', 'StockTransferRepository']],
  ['inventory/stock-reservation.service.ts', ['withTransaction', 'AuditWriter', 'StockReservationRepository']],
  ['inventory/stock-adjustment.service.ts', ['withTransaction', 'AuditWriter', 'StockAdjustmentRepository']],
  ['inventory/stock-count/stock-count.service.ts', ['withTransaction', 'AuditWriter', 'StockCountRepository']],
  ['procurement/procurement.service.ts', ['withTransaction', 'AuditWriter', 'ProcurementRepository']],
  ['procurement/contracts/purchase-contract.service.ts', ['withTransaction', 'AuditWriter', 'PurchaseContractRepository']],
  ['maintenance/maintenance.service.ts', ['withTransaction', 'AuditWriter', 'MaintenanceRepository']],
  ['service/field-service.service.ts', ['withTransaction', 'AuditWriter', 'FieldServiceRepository', 'OFFLINE_SYNC_ROUTE']],
];
for (const [path, markers] of criticalServiceExpectations) {
  const absolute = join(root, 'backend/src/modules', path);
  if (!existsSync(absolute)) { failures.push(`Missing critical service for transaction audit: backend/src/modules/${path}`); continue; }
  const text = read(absolute);
  for (const marker of markers) if (!text.includes(marker)) failures.push(`Critical service missing ${marker}: backend/src/modules/${path}`);
}

const transactionDoc = join(root, 'docs/architecture/transaction-boundaries.md');
if (existsSync(transactionDoc)) {
  const text = read(transactionDoc);
  for (const marker of ['Goods receipt', 'Stock transfer', 'Purchase approval', 'Asset installation', 'Invoice approval', 'Payment posting', 'Work-order completion', 'Bank reconciliation close', 'Technician visit completion']) {
    if (!text.includes(marker)) failures.push(`Transaction boundary documentation missing ${marker}`);
  }
} else failures.push('Missing docs/architecture/transaction-boundaries.md');

const boundaryPolicy = join(root, 'backend/src/core/compliance/backend-boundary-transaction-audit.ts');
if (existsSync(boundaryPolicy)) {
  const text = read(boundaryPolicy);
  for (const marker of ['R17-ROUTE-CONTROLLER-NO-DB', 'R17-CROSS-MODULE-FACADE-ONLY', 'R17-CRITICAL-TRANSACTION-BOUNDARY', 'R17-NO-ASYNC-SOURCE-OF-TRUTH', 'R17-TENANT-BRANCH-AUDIT', 'technician offline-sync command application']) {
    if (!text.includes(marker)) failures.push(`R17 policy source missing marker: ${marker}`);
  }
}

for (const file of frontendFiles) {
  const text = read(file);
  if (has(text, /@nexora\/database|@prisma\/client|@nexora\/backend|backend\/src|database\/src/)) {
    failures.push(`Frontend imports backend/database/server-only code: ${rel(file)}`);
  }
}

const packageJsonPath = join(root, 'package.json');
if (existsSync(packageJsonPath)) {
  const packageJson = read(packageJsonPath);
  for (const marker of ['backend:boundary-transaction:check', 'pass:r17:source-check', 'pass:r17:certify:sh']) {
    if (!packageJson.includes(marker)) failures.push(`package.json missing script marker: ${marker}`);
  }
} else failures.push('Missing package.json');

const ciPath = join(root, '.github/workflows/ci.yml');
if (existsSync(ciPath)) {
  const ci = read(ciPath);
  if (!ci.includes('R17 backend boundary/transaction source gate')) failures.push('CI missing R17 backend boundary/transaction source gate');
} else failures.push('Missing .github/workflows/ci.yml');

const result = {
  pass: 'R17',
  name: 'Backend Transaction and Boundary Audit',
  sourceOnly,
  status: failures.length ? 'FAIL' : 'PASS_SOURCE_LEVEL',
  checkedAt: new Date().toISOString(),
  counts: {
    backendFiles: backendFiles.length,
    routeFiles: routeFiles.length,
    controllerFiles: controllerFiles.length,
    serviceFiles: serviceFiles.length,
    repositoryFiles: repositoryFiles.length,
    facadeFiles: facadeFiles.length,
    frontendFiles: frontendFiles.length,
    criticalRuntimeFiles: criticalRuntimeFiles.length,
    criticalServiceExpectations: criticalServiceExpectations.length,
  },
  enforcedRules: [
    'No direct Prisma/database access in routes/controllers.',
    'Controllers do not coordinate repositories/transactions directly.',
    'Services coordinate transactions but do not call prisma/tx model delegates directly.',
    'Cross-module imports use target module public index/facade only.',
    'Critical domains do not import/create BullMQ queues as state source-of-truth.',
    'Critical service files expose transaction, repository and audit markers.',
    'Frontend does not import backend/database/server-only code.',
  ],
  warnings,
  failures,
  limitations: [
    'This is a source-level audit gate; it does not replace TypeScript compilation, runtime integration tests, database migration tests or E2E workflow proof.',
    'The missing pnpm-lock.yaml remains a blocker for frozen install/build/runtime certification.',
    'R18-R21 must still provide test completion, Docker runtime certification, CI hardening and final blueprint compliance audit.',
  ],
};
mkdirSync(join(root, 'certification-output'), { recursive: true });
writeFileSync(join(root, 'certification-output/pass-r17-backend-boundary-transaction-audit.json'), JSON.stringify(result, null, 2));
if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
