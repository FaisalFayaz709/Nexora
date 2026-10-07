#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const evidenceMode = process.argv.includes('--evidence') || process.argv.includes('--runtime-evidence');
const failures = [];
const warnings = [];
const checked = [];

function file(path) { return join(root, path); }
function exists(path) { return existsSync(file(path)); }
function read(path) { return readFileSync(file(path), 'utf8'); }
function walk(dir) {
  const abs = file(dir);
  const out = [];
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    const p = join(abs, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(relative(root, p).replace(/\\/g, '/')));
    else out.push(relative(root, p).replace(/\\/g, '/'));
  }
  return out;
}
function requireFile(path) {
  checked.push(`file:${path}`);
  if (!exists(path)) failures.push(`Missing R19 required file: ${path}`);
}
function requireText(path, marker) {
  requireFile(path);
  if (exists(path) && !read(path).includes(marker)) failures.push(`Missing marker in ${path}: ${marker}`);
}
function requireAnyText(path, markers, label) {
  requireFile(path);
  if (exists(path) && !markers.some((marker) => read(path).includes(marker))) failures.push(`Missing ${label} in ${path}; expected one of: ${markers.join(' | ')}`);
}
function sectionForService(compose, service) {
  const escaped = service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = compose.match(new RegExp(`(?:^|\\n)  ${escaped}:\\n([\\s\\S]*?)(?=\\n  [a-zA-Z0-9_-]+:|\\nnetworks:|\\nvolumes:|$)`));
  return match?.[1] ?? '';
}

const requiredFiles = [
  'docker-compose.yml',
  'infrastructure/docker/backend.Dockerfile',
  'infrastructure/docker/frontend.Dockerfile',
  'infrastructure/docker/worker.Dockerfile',
  'infrastructure/nginx/nginx.conf',
  'infrastructure/nginx/nginx.production.conf',
  '.dockerignore',
  '.env.docker.example',
  'scripts/pass-r19-docker-runtime-certification.sh',
  'scripts/pass-r19-docker-runtime-certification.ps1',
  'scripts/check-pass-r19-docker-runtime-certification.mjs',
  'docs/production/DOCKER_RUNTIME_CERTIFICATION_RUNBOOK.md',
  'docs/production/DOCKER_RUNTIME_EVIDENCE_MANIFEST_TEMPLATE.json',
  '.github/workflows/runtime-certification.yml',
];
for (const path of requiredFiles) requireFile(path);

const compose = exists('docker-compose.yml') ? read('docker-compose.yml') : '';
const requiredServices = ['postgres', 'redis', 'minio', 'minio-init', 'migrator', 'api', 'worker', 'web', 'nginx'];
for (const service of requiredServices) {
  const section = sectionForService(compose, service);
  if (!section) {
    failures.push(`docker-compose.yml missing required service: ${service}`);
    continue;
  }
  checked.push(`service:${service}`);
  if (!/networks:\s*\[nexora\]/.test(section) && !/networks:\n\s+- nexora/.test(section)) {
    failures.push(`Service ${service} is not attached to the nexora network.`);
  }
}
for (const service of ['postgres', 'redis', 'minio', 'api', 'worker', 'web', 'nginx']) {
  const section = sectionForService(compose, service);
  if (section && !section.includes('healthcheck:')) failures.push(`Service ${service} missing healthcheck.`);
}
const expectedImages = [
  ['postgres', 'postgres:17-alpine'],
  ['redis', 'redis:7-alpine'],
  ['minio', 'minio/minio:latest'],
  ['minio-init', 'minio/mc:latest'],
  ['migrator', 'infrastructure/docker/backend.Dockerfile'],
  ['api', 'infrastructure/docker/backend.Dockerfile'],
  ['worker', 'infrastructure/docker/worker.Dockerfile'],
  ['web', 'infrastructure/docker/frontend.Dockerfile'],
  ['nginx', 'nginx:1.27-alpine'],
];
for (const [service, marker] of expectedImages) {
  const section = sectionForService(compose, service);
  if (section && !section.includes(marker)) failures.push(`Service ${service} does not use expected image/dockerfile marker: ${marker}`);
}
for (const marker of [
  'DATABASE_URL: postgresql://nexora:nexora@postgres:5432/nexora?schema=public',
  'REDIS_URL: redis://redis:6379',
  'MINIO_ENDPOINT: http://minio:9000',
  'MINIO_PRIVATE_BUCKET: nexora-private',
  'MINIO_PUBLIC_BUCKET: nexora-public',
  'AUTH_ACCESS_TOKEN_SECRET',
  'OPENAPI_DOCS_ENABLED: "false"',
  'pnpm db:generate && pnpm db:migrate:deploy && pnpm db:migrate:status',
  'condition: service_healthy',
  'condition: service_completed_successfully',
  '${NEXORA_HTTP_PORT:-8080}:80',
  'postgres_data:',
  'redis_data:',
  'minio_data:',
  'driver: bridge',
]) {
  if (!compose.includes(marker)) failures.push(`docker-compose.yml missing runtime marker: ${marker}`);
}

for (const path of ['scripts/pass-r19-docker-runtime-certification.sh', 'scripts/pass-r19-docker-runtime-certification.ps1']) {
  for (const marker of [
    'R19_DOCKER_RUNTIME_CERTIFICATION',
    'pnpm-lock.yaml',
    'corepack prepare pnpm@10.15.0 --activate',
    'pnpm install --frozen-lockfile',
    'pnpm verify:static',
    'pnpm lint',
    'pnpm typecheck',
    'pnpm db:validate',
    'pnpm db:generate',
    'pnpm build',
    'docker compose',
    'config',
    'build',
    'up -d postgres redis minio',
    'minio-init',
    'migrator',
    'api worker web nginx',
    '/healthz',
    '/api/v1/health/live',
    '/api/v1/health/ready',
    'R19_DOCKER_RUNTIME_MINIO_PROOF',
    'full-workflow:e2e:certify',
    'certification-output/docker-runtime-r19',
    'r19-runtime-evidence-manifest.json',
  ]) requireText(path, marker);
}

const pkg = exists('package.json') ? JSON.parse(read('package.json')) : { scripts: {} };
const requiredScripts = [
  'pass:r19:source-check',
  'pass:r19:certify',
  'pass:r19:certify:sh',
  'pass:r19:certify:ps',
  'docker:runtime:r19',
  'docker:runtime:r19:ps',
];
for (const script of requiredScripts) {
  if (!pkg.scripts?.[script]) failures.push(`package.json missing script: ${script}`);
}
if (!String(pkg.scripts?.['verify:static'] ?? '').includes('pass:r19:source-check')) failures.push('verify:static does not include pass:r19:source-check.');
if (!String(pkg.scripts?.verify ?? '').includes('pass:r19:source-check')) failures.push('verify does not include pass:r19:source-check.');

const ci = exists('.github/workflows/ci.yml') ? read('.github/workflows/ci.yml') : '';
if (!ci.includes('R19 docker runtime certification source gate')) failures.push('CI workflow missing R19 docker runtime certification source gate.');
const runtimeWorkflow = exists('.github/workflows/runtime-certification.yml') ? read('.github/workflows/runtime-certification.yml') : '';
for (const marker of ['workflow_dispatch', 'bash scripts/pass-r19-docker-runtime-certification.sh', 'actions/upload-artifact', 'certification-output']) {
  if (runtimeWorkflow && !runtimeWorkflow.includes(marker)) failures.push(`Runtime certification workflow missing marker: ${marker}`);
}

for (const marker of [
  'R19_DOCKER_RUNTIME_CERTIFICATION',
  'Docker Desktop must be running',
  'pnpm-lock.yaml',
  'certification-output/docker-runtime-r19',
  'HOLD until the runtime script completes on a machine with Docker',
]) requireText('docs/production/DOCKER_RUNTIME_CERTIFICATION_RUNBOOK.md', marker);

const dockerfiles = ['infrastructure/docker/backend.Dockerfile', 'infrastructure/docker/frontend.Dockerfile', 'infrastructure/docker/worker.Dockerfile'];
for (const path of dockerfiles) {
  requireText(path, 'corepack prepare pnpm@10.15.0 --activate');
  requireText(path, 'pnpm install --frozen-lockfile');
  requireAnyText(path, ['pnpm build', 'pnpm --filter @nexora/'], 'workspace build command');
}
requireAnyText('infrastructure/nginx/nginx.conf', ['/api/v1/', 'proxy_pass http://api:3001', 'proxy_pass http://nexora_api'], 'API proxy to Fastify backend');
requireAnyText('infrastructure/nginx/nginx.conf', ['proxy_pass http://web:3000', 'proxy_pass http://nexora_web'], 'web proxy to Next.js frontend');
requireAnyText('infrastructure/nginx/nginx.conf', ['/healthz'], 'Nginx healthz endpoint');

const expectedRuntimeEvidence = [
  'certification-output/docker-runtime-r19/r19-docker-runtime-certification.log',
  'certification-output/docker-runtime-r19/docker-compose.config.yml',
  'certification-output/docker-runtime-r19/docker-compose-ps.txt',
  'certification-output/docker-runtime-r19/nginx-healthz.txt',
  'certification-output/docker-runtime-r19/api-live.json',
  'certification-output/docker-runtime-r19/api-ready.json',
  'certification-output/docker-runtime-r19/web-home.html',
  'certification-output/docker-runtime-r19/minio-upload-download-proof.txt',
  'certification-output/docker-runtime-r19/docker-compose-logs.tail.txt',
  'certification-output/docker-runtime-r19/r19-runtime-evidence-manifest.json',
];
const missingRuntimeEvidence = expectedRuntimeEvidence.filter((path) => !exists(path));
const lockfileMissing = !exists('pnpm-lock.yaml');
if (lockfileMissing) warnings.push('pnpm-lock.yaml is missing; live frozen install and Docker build cannot be certified from this archive yet.');
if (sourceOnly && missingRuntimeEvidence.length) warnings.push('Runtime evidence files are absent because this was a source-only R19 gate, not a Docker execution.');
if (!sourceOnly && missingRuntimeEvidence.length) failures.push(`Missing R19 runtime evidence files: ${missingRuntimeEvidence.join(', ')}`);

const sourceCounts = {
  frontendPages: walk('frontend/src/app').filter((p) => p.endsWith('/page.tsx')).length,
  backendRoutes: walk('backend/src').filter((p) => p.endsWith('.routes.ts')).length,
  dockerfiles: dockerfiles.filter(exists).length,
  composeServices: requiredServices.filter((service) => sectionForService(compose, service)).length,
};

let status;
if (failures.length) status = 'FAIL';
else if (sourceOnly) status = 'PASS_SOURCE_LEVEL_DOCKER_RUNTIME_CERTIFICATION_READY';
else if (missingRuntimeEvidence.length || lockfileMissing) status = 'HOLD_RUNTIME_EVIDENCE_INCOMPLETE';
else status = 'PASS_DOCKER_RUNTIME_CERTIFIED_WITH_EVIDENCE';

const result = {
  pass: 'R19',
  name: 'Docker Runtime Certification',
  sourceOnly,
  evidenceMode,
  status,
  checkedAt: new Date().toISOString(),
  lockedStackChanged: false,
  requiredDockerTopology: requiredServices,
  sourceCounts,
  expectedRuntimeEvidence,
  missingRuntimeEvidence,
  lockfileMissing,
  enforcedRules: [
    'Docker topology includes web, api, worker, postgres, redis, minio, minio-init, migrator and nginx.',
    'Docker runtime certification script performs frozen install, static gates, lint, typecheck, Prisma validation/generation, build, compose config/build/up and health checks.',
    'Runtime health must prove Nginx /healthz, Fastify /api/v1/health/live, Fastify /api/v1/health/ready and Next.js web entrypoint are reachable.',
    'MinIO bucket creation and upload/download proof are part of runtime evidence.',
    'Full workflow E2E certification is wired into the R19 runtime chain.',
    'Source-only R19 cannot claim production readiness or Docker runtime success.',
  ],
  warnings,
  failures,
  limitations: sourceOnly ? [
    'This sandbox has no Docker CLI and no pnpm binary; runtime was not executed here.',
    'Generate and commit a real pnpm-lock.yaml before running R19 certification.',
    'Production remains HOLD until local/CI R19 runtime evidence exists and R20/R21 are completed.',
  ] : [],
};
mkdirSync(file('certification-output'), { recursive: true });
writeFileSync(file('certification-output/pass-r19-docker-runtime-certification.json'), `${JSON.stringify(result, null, 2)}\n`);
if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
