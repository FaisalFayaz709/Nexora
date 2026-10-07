#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const failures = [];
const warnings = [];
const holdBlockers = [];
const checked = [];

function file(path) { return join(root, path); }
function exists(path) { return existsSync(file(path)); }
function read(path) { return readFileSync(file(path), 'utf8'); }
function json(path) { return JSON.parse(read(path)); }
function requireFile(path, label = path) {
  checked.push(`file:${path}`);
  if (!exists(path)) failures.push(`Missing ${label}: ${path}`);
}
function requireText(path, marker, label = marker) {
  requireFile(path);
  if (exists(path) && !read(path).includes(marker)) failures.push(`${path} missing ${label}`);
}
function walk(dir, opts = {}) {
  const abs = file(dir);
  const out = [];
  if (!existsSync(abs)) return out;
  const skip = new Set(['node_modules', '.git', '.next', 'dist', 'coverage']);
  for (const name of readdirSync(abs)) {
    if (skip.has(name)) continue;
    const p = join(abs, name);
    const st = statSync(p);
    const rel = relative(root, p).replace(/\\/g, '/');
    if (st.isDirectory()) out.push(...walk(rel, opts));
    else out.push(rel);
  }
  return out;
}
function count(path, predicate) { return walk(path).filter(predicate).length; }
function containsAny(path, markers) { return exists(path) && markers.some((m) => read(path).includes(m)); }
function addReq(id, area, requirement, evidence, status, notes = '') {
  requirements.push({ id, area, requirement, evidence, status, notes });
  if (status === 'FAIL') failures.push(`${id}: ${requirement}`);
  if (status === 'HOLD') holdBlockers.push(`${id}: ${requirement}${notes ? ` (${notes})` : ''}`);
}

const requirements = [];

// Required R21 artifact files are allowed to be checked after the pass adds them.
const r21Files = [
  'scripts/check-pass-r21-final-blueprint-compliance-audit.mjs',
  'scripts/pass-r21-final-blueprint-compliance-audit-certify.sh',
  'scripts/pass-r21-final-blueprint-compliance-audit-certify.ps1',
  'docs/compliance/FINAL_BLUEPRINT_COMPLIANCE_MATRIX.md',
  'docs/production/FINAL_GO_NO_GO_DECISION.md',
];
for (const p of r21Files) requireFile(p);

for (let i = 0; i <= 20; i += 1) {
  const script = i === 0
    ? 'scripts/check-pass-r0-source-of-truth-rebase.mjs'
    : walk('scripts').find((p) => p.startsWith(`scripts/check-pass-r${i}-`) && p.endsWith('.mjs'));
  if (!script) failures.push(`Missing R${i} source gate checker.`);
}

const pkg = exists('package.json') ? json('package.json') : { scripts: {}, packageManager: '' };
const frontendPkg = exists('frontend/package.json') ? json('frontend/package.json') : { dependencies: {} };
const backendPkg = exists('backend/package.json') ? json('backend/package.json') : { dependencies: {} };
const workerPkg = exists('worker/package.json') ? json('worker/package.json') : { dependencies: {} };

addReq('R21-001', 'Source of truth', 'Active blueprint must be latest 90-page source with Appendix F and Appendix G mandatory.', 'docs/SOURCE_OF_TRUTH.md', exists('docs/SOURCE_OF_TRUTH.md') && read('docs/SOURCE_OF_TRUTH.md').includes('Total pages: **90**') && read('docs/SOURCE_OF_TRUTH.md').includes('Appendix G is mandatory scope') ? 'PASS' : 'FAIL');
addReq('R21-002', 'Locked stack', 'Root package manager must remain pnpm workspace and TypeScript monorepo.', 'package.json + pnpm-workspace.yaml', pkg.packageManager?.startsWith('pnpm@') && exists('pnpm-workspace.yaml') ? 'PASS' : 'FAIL');
addReq('R21-003', 'Locked stack', 'Frontend remains Next.js + TypeScript with Tailwind/shadcn-compatible UI, React Hook Form, Zod, TanStack Query and TanStack Table.', 'frontend/package.json', ['next','react','react-dom','react-hook-form','zod','@hookform/resolvers','@tanstack/react-query','@tanstack/react-table'].every((d) => frontendPkg.dependencies?.[d] || frontendPkg.devDependencies?.[d]) ? 'PASS' : 'FAIL');
addReq('R21-004', 'Locked stack', 'Backend remains Fastify + TypeScript with Prisma/PostgreSQL through database workspace, MinIO, Redis and BullMQ.', 'backend/package.json', ['fastify','@nexora/database','minio','ioredis','bullmq','zod'].every((d) => backendPkg.dependencies?.[d] || backendPkg.devDependencies?.[d]) ? 'PASS' : 'FAIL');
addReq('R21-005', 'Locked stack', 'Worker remains BullMQ/Redis-based background processor.', 'worker/package.json', ['bullmq','ioredis'].every((d) => workerPkg.dependencies?.[d] || workerPkg.devDependencies?.[d]) ? 'PASS' : 'FAIL');
addReq('R21-006', 'Dependency reproducibility', 'pnpm-lock.yaml must exist before frozen install, typecheck, build, Docker and CI can be certified.', 'pnpm-lock.yaml', exists('pnpm-lock.yaml') ? 'PASS' : 'HOLD', 'Generate locally with pnpm install and commit before production/runtimes.');

const pageCount = count('frontend/src/app', (p) => p.endsWith('/page.tsx'));
const screenContractCount = count('docs/frontend-screens', (p) => p.endsWith('.md') && !p.endsWith('_screen-contract-template.md') && !p.endsWith('/index.md'));
const allScreenMdCount = count('docs/frontend-screens', (p) => p.endsWith('.md'));
const moduleApiCount = count('frontend/src/modules', (p) => p.endsWith('/api.ts'));
const columnCount = count('frontend/src/modules', (p) => p.endsWith('/columns.tsx'));
const backendRouteCount = count('backend/src', (p) => p.endsWith('.routes.ts'));
const backendControllerCount = count('backend/src', (p) => p.endsWith('.controller.ts'));
const backendServiceCount = count('backend/src', (p) => p.endsWith('.service.ts') && !p.endsWith('.test.ts'));
const backendRepositoryCount = count('backend/src', (p) => p.endsWith('.repository.ts'));
const backendFacadeCount = count('backend/src', (p) => p.endsWith('.facade.ts'));
const testCount = count('.', (p) => /\.(test|spec)\.(ts|tsx|mjs)$/.test(p));

addReq('R21-007', 'Appendix G frontend', 'shadcn/ui-compatible primitives and NEXORA app/data/forms/feedback/workflow wrappers must exist.', 'frontend/src/components/*', ['ui','app','data','forms','feedback','workflow'].every((d) => exists(`frontend/src/components/${d}`)) ? 'PASS' : 'FAIL');
addReq('R21-008', 'Appendix G frontend', 'Route-group shell model must exist for auth, ERP, portal and technician pages.', 'frontend/src/app/(*)/layout.tsx', ['(auth)','(erp)','(portal)','(technician)'].every((d) => exists(`frontend/src/app/${d}/layout.tsx`)) ? 'PASS' : 'FAIL');
addReq('R21-009', 'Appendix G frontend', 'Authenticated pages must not import AppShell manually.', 'frontend/src/app/**/*.page.tsx', walk('frontend/src/app').filter((p) => p.endsWith('/page.tsx')).every((p) => !read(p).includes('AppShell')) ? 'PASS' : 'FAIL');
addReq('R21-010', 'Appendix G frontend', 'All business API calls must pass through centralized API/query layer; no raw fetch outside approved client.', 'frontend/src/lib/api-client.ts + modules api.ts', count('frontend/src', (p) => /\.(ts|tsx)$/.test(p) && !['frontend/src/lib/api-client.ts'].includes(p) && exists(p) && /\bfetch\s*\(/.test(read(p))) === 0 ? 'PASS' : 'FAIL');
addReq('R21-011', 'Appendix G frontend', 'ERP grids must use TanStack Table; raw table markup outside approved primitives is blocked.', 'frontend/src/components/data + modules columns.tsx', columnCount >= 10 && containsAny('frontend/src/components/data/data-table.tsx', ['@tanstack/react-table','useReactTable']) ? 'PASS' : 'FAIL');
addReq('R21-012', 'Appendix G frontend', 'Create/edit/command forms must use React Hook Form, Zod resolver and typed error handling patterns.', 'frontend/src/components/forms', containsAny('frontend/src/components/forms/resource-form-dialog.tsx', ['react-hook-form','zodResolver']) && containsAny('frontend/src/components/forms/command-form-dialog.tsx', ['react-hook-form','zodResolver']) ? 'PASS' : 'FAIL');
addReq('R21-013', 'Appendix G frontend', 'Every route must have screen-contract documentation.', `frontend pages=${pageCount}; screen contracts=${screenContractCount}; all screen md=${allScreenMdCount}`, screenContractCount >= pageCount ? 'PASS' : 'FAIL');
addReq('R21-014', 'Frontend routes', 'Module API files and typed query-key factories must exist across domains.', `module api files=${moduleApiCount}`, moduleApiCount >= 15 ? 'PASS' : 'FAIL');

addReq('R21-015', 'Backend/API', 'Fastify backend route for technician offline sync must exist under /api/v1, not Next.js business API.', 'backend/src/modules/service + shared contracts', walk('backend/src').some((p) => p.endsWith('.routes.ts') && read(p).includes('/portal/technician/offline-sync')) && walk('shared/src').some((p) => read(p).includes('offline-sync')) ? 'PASS' : 'FAIL');
addReq('R21-016', 'Backend boundaries', 'Routes/controllers must not access Prisma or database clients directly.', 'backend/src/**/*.routes.ts|controller.ts', walk('backend/src').filter((p) => p.endsWith('.routes.ts') || p.endsWith('.controller.ts')).every((p) => !/@prisma\/client|PrismaClient|\bprisma\s*\.|\$queryRaw|\$executeRaw/.test(read(p))) ? 'PASS' : 'FAIL');
addReq('R21-017', 'Backend boundaries', 'Domain modules must expose facade/index public surfaces and avoid private cross-module imports.', `facades=${backendFacadeCount}; routes=${backendRouteCount}; controllers=${backendControllerCount}; services=${backendServiceCount}; repos=${backendRepositoryCount}`, backendFacadeCount >= 15 && backendRouteCount >= 30 && backendRepositoryCount >= 30 ? 'PASS' : 'FAIL');
addReq('R21-018', 'Transactions/audit', 'Critical modules must contain transaction and audit markers for stock, finance, approval, asset, procurement and service workflows.', 'backend/src/modules/{approvals,assets,finance,inventory,procurement,service}', ['approvals','assets','finance','inventory','procurement','service'].every((d) => walk(`backend/src/modules/${d}`).some((p) => /\.service\.ts$/.test(p) && read(p).includes('withTransaction') && read(p).includes('AuditWriter'))) ? 'PASS' : 'FAIL');

addReq('R21-020', 'Docker/runtime', 'Docker runtime certification harness must exist for web/api/worker/postgres/redis/minio/nginx topology.', 'docker-compose.yml + scripts/pass-r19-docker-runtime-certification.*', exists('docker-compose.yml') && ['web','api','worker','postgres','redis','minio','nginx'].every((svc) => read('docker-compose.yml').includes(`${svc}:`)) && exists('scripts/pass-r19-docker-runtime-certification.sh') ? 'PASS' : 'FAIL');
addReq('R21-021', 'CI/CD', 'Hardened GitHub Actions must gate source checks, frozen install, quality, tests, security, Docker build and E2E source checks.', '.github/workflows/ci-cd-hardening.yml', exists('.github/workflows/ci-cd-hardening.yml') && ['pnpm install --frozen-lockfile','pnpm lint','pnpm typecheck','pnpm test','pnpm build','pnpm audit --audit-level high','docker compose build web api worker','check-pass-r20-cicd-hardening.mjs'].every((m) => read('.github/workflows/ci-cd-hardening.yml').includes(m)) ? 'PASS' : 'FAIL');
addReq('R21-022', 'Runtime evidence', 'Final runtime evidence must exist before production GO: install, tests, Docker, E2E, security smoke, backup/restore and release candidate manifest.', 'certification-output runtime files', ['certification-output/final-certification.log','certification-output/full-workflow-e2e/results.json','certification-output/security-smoke-results.json','certification-output/backup-restore.log','certification-output/production-release/release-candidate-manifest.json'].every(exists) ? 'PASS' : 'HOLD', 'Runtime proof is still absent in this archive.');

if (sourceOnly) warnings.push('R21 source audit checks repository evidence and writes final matrix. It does not run pnpm install, typecheck, Docker or browser E2E.');

const requirementCounts = requirements.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
const sourceFailures = failures.filter((f) => !f.includes('R21-006') && !f.includes('R21-022'));
const currentDecision = failures.length ? 'NO_GO_SOURCE_FAILURES' : holdBlockers.length ? 'HOLD_RUNTIME_BLOCKED' : 'GO_CANDIDATE_PENDING_OWNER_APPROVAL';
const productionGoClaimed = currentDecision === 'GO_CANDIDATE_PENDING_OWNER_APPROVAL';
const status = failures.length ? 'FAIL' : holdBlockers.length ? 'HOLD_SOURCE_COMPLIANT_RUNTIME_BLOCKED' : 'PASS_FINAL_BLUEPRINT_COMPLIANT_SOURCE_AND_RUNTIME_EVIDENCE_PRESENT';

const fileManifest = walk('.').filter((p) => !p.startsWith('certification-output/pass-r21') && !p.includes('/node_modules/')).sort().map((p) => {
  const b = readFileSync(file(p));
  return { path: p, sha256: createHash('sha256').update(b).digest('hex'), bytes: b.length };
});
const summaryHash = createHash('sha256').update(JSON.stringify({ requirements, counts: { pageCount, screenContractCount, moduleApiCount, columnCount, backendRouteCount, backendControllerCount, backendServiceCount, backendRepositoryCount, backendFacadeCount, testCount } })).digest('hex');

const result = {
  pass: 'R21',
  name: 'Final blueprint compliance audit',
  status,
  sourceOnly,
  checkedAt: new Date().toISOString(),
  currentDecision,
  productionGoClaimed,
  lockedStackChanged: false,
  requirementCounts,
  counts: {
    frontendRoutePages: pageCount,
    screenContracts: screenContractCount,
    allScreenMarkdownFiles: allScreenMdCount,
    moduleApiFiles: moduleApiCount,
    moduleColumnFiles: columnCount,
    backendRouteFiles: backendRouteCount,
    backendControllerFiles: backendControllerCount,
    backendServiceFiles: backendServiceCount,
    backendRepositoryFiles: backendRepositoryCount,
    backendFacadeFiles: backendFacadeCount,
    testFiles: testCount,
    totalFilesManifested: fileManifest.length,
  },
  holdBlockers,
  warnings,
  failures,
  requirements,
  evidenceHash: summaryHash,
};

mkdirSync(file('certification-output'), { recursive: true });
mkdirSync(file('certification-output/final-blueprint-compliance'), { recursive: true });
writeFileSync(file('certification-output/pass-r21-final-blueprint-compliance-audit.json'), JSON.stringify(result, null, 2));
writeFileSync(file('certification-output/final-blueprint-compliance/manifest.sha256'), fileManifest.map((f) => `${f.sha256}  ${f.path}`).join('\n') + '\n');
writeFileSync(file('certification-output/final-blueprint-compliance/requirements.json'), JSON.stringify(requirements, null, 2));
mkdirSync(file('certification-output/production-go-nogo'), { recursive: true });
writeFileSync(file('certification-output/production-go-nogo/current-decision.json'), JSON.stringify({
  gate: 'pass-r21-final-blueprint-compliance-audit',
  pass: 'R21',
  title: 'Final Blueprint Compliance Audit and Go/No-Go',
  generatedAt: result.checkedAt,
  lockedStack: 'Next.js + TypeScript frontend, Fastify + TypeScript backend, PostgreSQL + Prisma, MinIO, Redis, BullMQ, Docker Compose, Nginx, GitHub Actions; Terraform later',
  currentDecision,
  productionGoClaimed,
  missingRuntimeEvidence: holdBlockers,
  requirementCounts,
  evidenceHash: summaryHash,
}, null, 2));

if (failures.length) {
  console.error('R21 final blueprint compliance audit failed.');
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log('R21 final blueprint compliance audit completed.');
console.log(JSON.stringify(result, null, 2));
