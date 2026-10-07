import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];

const prior = spawnSync(process.execPath, ['scripts/check-operations-platform.mjs'], { stdio: 'inherit' });
if (prior.status !== 0) process.exit(prior.status ?? 1);

const lock = JSON.parse(readFileSync(join(root, 'docs/contracts/capability-locks/route-coverage.json'), 'utf8'));
const catalogText = readFileSync(join(root, 'docs/contracts/api-endpoint-matrix.csv'), 'utf8');
const lines = catalogText.trim().split(/\r?\n/);
const header = lines[0].split(',');
const idx = Object.fromEntries(header.map((h, i) => [h, i]));
const catalog = lines.slice(1).map((line) => {
  const parts = line.split(',');
  return { area: parts[idx.area], method: parts[idx.method], path: parts[idx.endpoint], permission: parts[idx.permission] };
});

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

const routePattern = /defineLockedRoute\(\s*['\"]([A-Z]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)/g;
const implemented = [];
for (const file of walk(join(root, 'backend/src/modules')).filter((f) => f.endsWith('.routes.ts'))) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(routePattern)) implemented.push({ method: match[1], path: match[2], file: relative(root, file) });
}
const key = (r) => `${r.method} ${r.path}`;
const catalogSet = new Set(catalog.map(key));
const implementedSet = new Set(implemented.map(key));
const missing = catalog.filter((r) => !implementedSet.has(key(r)));
const extra = implemented.filter((r) => !catalogSet.has(key(r)));
const duplicates = implemented.map(key).filter((v, i, arr) => arr.indexOf(v) !== i);

if (catalog.length !== lock.frozenCatalogRouteCount) failures.push(`Catalog count changed: expected ${lock.frozenCatalogRouteCount}, got ${catalog.length}`);
if (missing.length) failures.push(`Missing frozen routes: ${missing.map(key).join('; ')}`);
if (extra.length) failures.push(`Extra public locked routes: ${extra.map((r) => `${key(r)} in ${r.file}`).join('; ')}`);
if (duplicates.length) failures.push(`Duplicate route definitions: ${[...new Set(duplicates)].join('; ')}`);

for (const r of lock.coverageCriticalRoutes) {
  const signatureSingle = `defineLockedRoute('${r.method}', '${r.path}')`;
  const signatureDouble = `defineLockedRoute(\"${r.method}\", \"${r.path}\")`;
  const allRoutesText = implemented.map((x) => `${x.method} ${x.path}`).join('\n');
  if (!implementedSet.has(`${r.method} ${r.path}`)) failures.push(`Route coverage missing: ${r.method} ${r.path}`);
  void signatureSingle; void signatureDouble; void allRoutesText;
}

for (const file of [
  'docs/production/PRODUCTION_READINESS_CHECKLIST.md',
  'docs/production/RUNTIME_CERTIFICATION_RUNBOOK.md',
  'docs/production/DEPLOYMENT_RUNBOOK.md',
  'docs/production/BACKUP_RESTORE_RUNBOOK.md',
  'docs/production/SECURITY_HARDENING.md',
  'scripts/final-certify.sh',
  'scripts/final-certify.ps1',
]) if (!existsSync(join(root, file))) failures.push(`Missing production certification asset: ${file}`);

const vendorRoutes = readFileSync(join(root, 'backend/src/modules/vendors/vendor.routes.ts'), 'utf8');
for (const invariant of [
  "/api/v1/vendors/:id/purchase-orders",
  "/api/v1/vendors/:id/blacklist",
  "purchase_order.view",
  "vendor.risk.manage",
]) if (!vendorRoutes.includes(invariant)) failures.push(`Vendor route invariant missing: ${invariant}`);

const vendorService = readFileSync(join(root, 'backend/src/modules/vendors/vendor.service.ts'), 'utf8');
for (const invariant of [
  'async purchaseOrders(',
  'async blacklist(',
  'VENDOR_BLACKLISTED',
  'VENDOR_ALREADY_BLACKLISTED',
  'this.repository.listPurchaseOrders',
  'this.repository.blacklist',
]) if (!vendorService.includes(invariant)) failures.push(`Vendor service invariant missing: ${invariant}`);

const sourceFiles = walk(root).filter((f) => /\.(ts|tsx|js|mjs)$/.test(f));
for (const file of sourceFiles) {
  const rel = relative(root, file);
  const text = readFileSync(file, 'utf8');
  if ((rel.startsWith('backend/') || rel.startsWith('shared/') || rel.startsWith('frontend/') || rel.startsWith('worker/')) && text.includes('Prisma.max(')) failures.push(`Invalid Prisma.max usage remains in ${rel}`);
  if (/backend\/src\/modules\/.+\/(.+controller|.+routes)\.ts$/.test(rel) && /@nexora\/database|\bprisma\./.test(text)) {
    failures.push(`Controller/routes persistence violation: ${rel}`);
  }
  if (rel.startsWith('frontend/') && /@nexora\/backend|@nexora\/database|backend\/src|database\/prisma/.test(text)) {
    failures.push(`Frontend backend/database import violation: ${rel}`);
  }
  if (rel.startsWith('shared/') && /from ['\"](?:node:|fs|path|crypto|@prisma\/client|@nexora\/database)/.test(text)) {
    failures.push(`Shared browser-safety violation: ${rel}`);
  }
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!String(pkg.scripts?.['verify:static'] ?? '').includes('route-coverage:check')) failures.push('verify:static does not include route-coverage:check.');
if (!String(pkg.scripts?.verify ?? '').includes('route-coverage:check')) failures.push('verify does not include route-coverage:check.');
if (!String(pkg.scripts?.['final:certify'] ?? '').includes('final-certify.sh')) failures.push('final:certify script missing.');

const ci = existsSync(join(root, '.github/workflows/ci.yml')) ? readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8') : '';
if (!ci.includes('pnpm verify:static')) failures.push('CI does not execute the static capability gate chain.');

mkdirSync(join(root, 'certification-output'), { recursive: true });
writeFileSync(join(root, 'certification-output/route-coverage.json'), JSON.stringify({
  catalogRoutes: catalog.length,
  implementedLockedRoutes: implementedSet.size,
  missing,
  extra,
  duplicates: [...new Set(duplicates)],
  runtimeCertification: 'PENDING_ENVIRONMENT',
}, null, 2));

if (failures.length) {
  console.error('Route-coverage gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Route-coverage gate PASSED: ${catalog.length}/${catalog.length} frozen routes implemented, 0 extra routes, runtime certification pending.`);
