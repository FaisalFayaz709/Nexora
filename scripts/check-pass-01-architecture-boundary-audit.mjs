import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve } from 'node:path';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const failures = [];
const warnings = [];
const evidence = [];

function rel(file) {
  return relative(root, file).replace(/\\/g, '/');
}

function read(file) {
  return readFileSync(file, 'utf8');
}

function readJson(path) {
  return JSON.parse(read(join(root, path)));
}

function has(text, pattern) {
  return typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text);
}

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.next', 'dist', 'build', 'coverage', '.turbo'].includes(name)) continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

function requirePath(path, label = 'required path') {
  if (!existsSync(join(root, path))) failures.push(`Missing ${label}: ${path}`);
  else evidence.push(`Found ${path}`);
}

function recordPackageDependencyViolations(pkgPath, forbiddenDeps) {
  if (!existsSync(join(root, pkgPath))) {
    failures.push(`Missing package file: ${pkgPath}`);
    return;
  }
  const pkg = readJson(pkgPath);
  const dependencies = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}), ...(pkg.optionalDependencies || {}) };
  for (const dependency of Object.keys(dependencies)) {
    if (forbiddenDeps.has(dependency)) failures.push(`${pkgPath}: forbidden dependency ${dependency}`);
  }
}

const requiredPaths = [
  'frontend/src/app',
  'frontend/src/modules',
  'frontend/src/components',
  'frontend/src/lib',
  'backend/src/config',
  'backend/src/core',
  'backend/src/plugins',
  'backend/src/modules',
  'backend/src/types',
  'worker/src/queues',
  'worker/src/processors',
  'worker/src/schedulers',
  'shared/src/contracts',
  'shared/src/schemas',
  'shared/src/enums',
  'shared/src/constants',
  'shared/src/permissions',
  'shared/src/utils',
  'database/prisma/schema.prisma',
  'database/prisma/models',
  'database/prisma/migrations',
  'database/prisma/seed',
  'database/src/client.ts',
  'infrastructure/docker',
  'infrastructure/nginx',
  'infrastructure/terraform',
  'docs',
  'tests/e2e',
  '.github/workflows',
  'docker-compose.yml',
  'pnpm-workspace.yaml',
];

for (const path of requiredPaths) requirePath(path);

const forbiddenDeps = new Set([
  'express',
  '@nestjs/core',
  '@nestjs/common',
  'mongoose',
  'sequelize',
  'typeorm',
  'firebase',
  '@supabase/supabase-js',
]);
for (const pkgPath of [
  'package.json',
  'frontend/package.json',
  'backend/package.json',
  'worker/package.json',
  'shared/package.json',
  'database/package.json',
]) {
  recordPackageDependencyViolations(pkgPath, forbiddenDeps);
}

const allTsFiles = walk(root).filter((file) => /\.(ts|tsx|js|mjs)$/.test(file));
const frontendFiles = walk(join(root, 'frontend/src')).filter((file) => /\.(ts|tsx)$/.test(file));
const backendFiles = walk(join(root, 'backend/src')).filter((file) => /\.(ts|tsx)$/.test(file));
const sharedFiles = walk(join(root, 'shared/src')).filter((file) => /\.(ts|tsx)$/.test(file));
const moduleFiles = walk(join(root, 'backend/src/modules')).filter((file) => /\.(ts|tsx)$/.test(file));
const routeFiles = backendFiles.filter((file) => file.endsWith('.routes.ts'));
const controllerFiles = backendFiles.filter((file) => file.endsWith('.controller.ts'));
const serviceFiles = backendFiles.filter((file) => file.endsWith('.service.ts') && !file.endsWith('.test.ts'));
const repositoryFiles = backendFiles.filter((file) => file.endsWith('.repository.ts'));
const facadeFiles = backendFiles.filter((file) => file.endsWith('.facade.ts'));

const frontendForbidden = [
  /from\s+['"][^'"]*@nexora\/database[^'"]*['"]|import\s*\([^)]*@nexora\/database[^)]*\)/,
  /from\s+['"][^'"]*@nexora\/backend[^'"]*['"]|import\s*\([^)]*@nexora\/backend[^)]*\)/,
  /from\s+['"][^'"]*@prisma\/client[^'"]*['"]|import\s*\([^)]*@prisma\/client[^)]*\)/,
  /backend\/src/,
  /database\/src/,
  /worker\/src/,
  /from\s+['"]fastify['"]/,
  /from\s+['"]minio['"]/,
  /from\s+['"]node:(fs|crypto|path|child_process|net|tls)['"]/,
  /from\s+['"]bullmq['"]/,
];
for (const file of frontendFiles) {
  const text = read(file);
  if (frontendForbidden.some((pattern) => has(text, pattern))) {
    failures.push(`Frontend boundary violation: ${rel(file)}`);
  }
}

const sharedForbidden = [
  /from\s+['"][^'"]*@nexora\/database[^'"]*['"]|import\s*\([^)]*@nexora\/database[^)]*\)/,
  /from\s+['"][^'"]*@nexora\/backend[^'"]*['"]|import\s*\([^)]*@nexora\/backend[^)]*\)/,
  /from\s+['"][^'"]*@prisma\/client[^'"]*['"]|import\s*\([^)]*@prisma\/client[^)]*\)/,
  /from\s+['"]fastify['"]/,
  /from\s+['"]minio['"]/,
  /from\s+['"]node:(fs|crypto|path|child_process|net|tls)['"]/,
  /from\s+['"]bullmq['"]/,
  /process\.env/,
  /PrismaClient/,
];
for (const file of sharedFiles) {
  const text = read(file);
  if (sharedForbidden.some((pattern) => has(text, pattern))) {
    failures.push(`Shared browser-safety violation: ${rel(file)}`);
  }
}

for (const file of [...routeFiles, ...controllerFiles]) {
  const text = read(file);
  if (has(text, /@nexora\/database|@prisma\/client|PrismaClient|\bprisma\s*\.|\$queryRaw|\$executeRaw/)) {
    failures.push(`Direct database access forbidden in route/controller: ${rel(file)}`);
  }
  if (file.endsWith('.controller.ts') && has(text, /withTransaction|new\s+[A-Za-z0-9_]+Repository\b|\.repository\b|\bdb\s*\./)) {
    failures.push(`Controller appears to coordinate repositories or transactions directly: ${rel(file)}`);
  }
}

for (const file of serviceFiles) {
  const text = read(file);
  if (has(text, /PrismaClient|\bprisma\s*\.|\$queryRaw|\$executeRaw/)) {
    failures.push(`Service direct database-client usage; use repository/facade boundaries: ${rel(file)}`);
  }
  if (has(text, /\btx\s*\.\s*[a-zA-Z]\w*\s*\./)) {
    failures.push(`Service appears to call a transaction model delegate directly: ${rel(file)}`);
  }
}

for (const file of repositoryFiles) {
  const text = read(file);
  if (!has(text, '@nexora/database')) {
    warnings.push(`Repository does not visibly import @nexora/database; verify persistence ownership manually: ${rel(file)}`);
  }
  if (!has(text, /organizationId|tenant/i)) {
    warnings.push(`Repository has no visible tenant marker; verify this is non-tenant or scoped elsewhere: ${rel(file)}`);
  }
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
    const normalizedImport = importPath.replace(/\\/g, '/').replace(/\.ts$/, '').replace(/\.js$/, '');
    const isPublicIndexImport = normalizedImport.endsWith('/index') || normalizedImport.endsWith('/index.js') || targetRel === `${targetOwner}/index.ts` || targetRel === `${targetOwner}/index`;
    if (!isPublicIndexImport) failures.push(`Cross-module private import: ${fileRel} -> ${importPath}`);
  }
}

const moduleDirs = existsSync(modulesRoot)
  ? readdirSync(modulesRoot).filter((name) => statSync(join(modulesRoot, name)).isDirectory())
  : [];
for (const moduleName of moduleDirs) {
  requirePath(`backend/src/modules/${moduleName}/index.ts`, `public module index for ${moduleName}`);
}

const criticalDomains = ['approvals', 'assets', 'finance', 'inventory', 'maintenance', 'procurement', 'service'];
for (const domain of criticalDomains) requirePath(`backend/src/modules/${domain}`, `critical backend domain`);

for (const domain of criticalDomains) {
  const domainPath = join(root, 'backend/src/modules', domain);
  for (const file of walk(domainPath).filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts') && !f.endsWith('.integration.test.ts'))) {
    const text = read(file);
    if (has(text, /from\s+['"]bullmq['"]|new\s+Queue\s*\(/)) {
      failures.push(`Critical domain imports/creates BullMQ directly; async cannot own critical state: ${rel(file)}`);
    }
  }
}

const requiredServiceMarkers = [
  ['backend/src/modules/procurement/procurement.service.ts', ['withTransaction', 'AuditWriter', 'ProcurementRepository']],
  ['backend/src/modules/inventory/stock-transfer.service.ts', ['withTransaction', 'AuditWriter', 'StockTransferRepository']],
  ['backend/src/modules/inventory/stock-reservation.service.ts', ['withTransaction', 'AuditWriter', 'StockReservationRepository']],
  ['backend/src/modules/assets/asset.service.ts', ['withTransaction', 'AuditWriter', 'AssetRepository']],
  ['backend/src/modules/finance/finance.service.ts', ['withTransaction', 'AuditWriter', 'FinanceRepository']],
  ['backend/src/modules/service/field-service.service.ts', ['withTransaction', 'AuditWriter', 'FieldServiceRepository']],
  ['backend/src/modules/approvals/approval.service.ts', ['withTransaction', 'AuditWriter', 'ApprovalRepository']],
];
for (const [path, markers] of requiredServiceMarkers) {
  if (!existsSync(join(root, path))) {
    failures.push(`Missing critical service: ${path}`);
    continue;
  }
  const text = read(join(root, path));
  for (const marker of markers) {
    if (!text.includes(marker)) failures.push(`Critical service missing ${marker}: ${path}`);
  }
}

if (existsSync(join(root, 'docker-compose.yml'))) {
  const compose = read(join(root, 'docker-compose.yml'));
  for (const service of ['web', 'api', 'worker', 'postgres', 'redis', 'minio', 'nginx']) {
    if (!new RegExp(`^  ${service}:`, 'm').test(compose)) failures.push(`docker-compose missing required service: ${service}`);
  }
}

if (existsSync(join(root, 'shared/src/constants/api.ts'))) {
  const apiConstants = read(join(root, 'shared/src/constants/api.ts'));
  if (!apiConstants.includes("'/api/v1'") && !apiConstants.includes('"/api/v1"')) failures.push('Locked API base path /api/v1 not found in shared constants.');
} else failures.push('Missing shared/src/constants/api.ts');

const transactionDoc = join(root, 'docs/architecture/transaction-boundaries.md');
if (!existsSync(transactionDoc)) failures.push('Missing docs/architecture/transaction-boundaries.md');
else {
  const text = read(transactionDoc);
  for (const marker of ['Goods receipt', 'Stock transfer', 'Purchase approval', 'Asset installation', 'Invoice approval', 'Payment posting', 'Work-order completion']) {
    if (!text.includes(marker)) failures.push(`Transaction boundary documentation missing ${marker}`);
  }
}

// Route files should bind schemas/controllers but not own business rules.
for (const file of routeFiles) {
  const text = read(file);
  if (has(text, /\bif\s*\(.+status|\bswitch\s*\(.+status|\btotal\s*=|\bbalance\s*=/s)) {
    warnings.push(`Route file may contain business logic; inspect manually: ${rel(file)}`);
  }
}

const packageJsonPath = join(root, 'package.json');
if (existsSync(packageJsonPath)) {
  const pkgText = read(packageJsonPath);
  for (const marker of ['architecture:check', 'contracts:check', 'imports:check', 'pass:01:source-check', 'pass:01:certify']) {
    if (!pkgText.includes(marker)) failures.push(`package.json missing script marker: ${marker}`);
  }
}

const result = {
  pass: 'PASS_01',
  name: 'Architecture Boundary Audit and Repair',
  sourceOnly,
  status: failures.length ? 'FAIL' : 'PASS_SOURCE_LEVEL',
  checkedAt: new Date().toISOString(),
  counts: {
    allTsFiles: allTsFiles.length,
    frontendFiles: frontendFiles.length,
    sharedFiles: sharedFiles.length,
    backendFiles: backendFiles.length,
    routeFiles: routeFiles.length,
    controllerFiles: controllerFiles.length,
    serviceFiles: serviceFiles.length,
    repositoryFiles: repositoryFiles.length,
    facadeFiles: facadeFiles.length,
    backendModules: moduleDirs.length,
  },
  enforcedRules: [
    'Locked monorepo folders and Docker topology are present.',
    'Forbidden alternate stacks/ORMs are not introduced.',
    'Frontend does not import backend, database, Prisma, worker or server-only packages.',
    'Shared package remains browser-safe and does not import server-only dependencies.',
    'Routes/controllers do not access Prisma/database or coordinate transactions/repositories directly.',
    'Services do not call Prisma/transaction delegates directly; persistence remains in repositories.',
    'Cross-module backend imports use the target public index/facade only.',
    'Critical domains do not use BullMQ as source-of-truth for stock, money, approval or work-order state.',
    'Critical services keep visible transaction, repository and audit markers.',
    'API base path remains /api/v1.',
  ],
  evidence: evidence.slice(0, 50),
  warnings,
  failures,
  limitations: [
    'This pass certifies source-level architecture boundaries only.',
    'It does not replace frozen install, TypeScript compilation, database migration tests, runtime integration tests or browser E2E proof.',
    'Because PASS_00 remains blocked by missing/final pnpm-lock runtime proof until run locally, overall project status remains HOLD even when PASS_01 is source-level clean.',
  ],
};

mkdirSync(join(root, 'certification-output'), { recursive: true });
writeFileSync(join(root, 'certification-output/pass-01-architecture-boundary-audit.json'), JSON.stringify(result, null, 2));

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
