import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const checked = [];

const file = (path) => join(root, path);
const exists = (path) => existsSync(file(path));
const read = (path) => readFileSync(file(path), 'utf8');

function requireFile(path) {
  checked.push(`file:${path}`);
  if (!exists(path)) failures.push(`Missing required file: ${path}`);
}

function requireText(path, marker, label = marker) {
  requireFile(path);
  if (exists(path) && !read(path).includes(marker)) failures.push(`Missing ${label} in ${path}`);
}

function requireRegex(path, regex, label) {
  requireFile(path);
  if (exists(path) && !regex.test(read(path))) failures.push(`Missing ${label} in ${path}`);
}

function requireScript(pkg, name, contains) {
  const value = String(pkg.scripts?.[name] ?? '');
  if (!value) failures.push(`package.json script missing: ${name}`);
  if (contains && !value.includes(contains)) failures.push(`package.json script ${name} does not include: ${contains}`);
}

function sectionForService(compose, service) {
  const match = compose.match(new RegExp(`(?:^|\\n)  ${service}:\\n([\\s\\S]*?)(?=\\n  [a-zA-Z0-9_-]+:|\\nnetworks:|\\nvolumes:|$)`));
  return match?.[1] ?? '';
}

for (const path of [
  'docker-compose.yml',
  'infrastructure/docker/backend.Dockerfile',
  'infrastructure/docker/frontend.Dockerfile',
  'infrastructure/docker/worker.Dockerfile',
  'infrastructure/nginx/nginx.conf',
  '.dockerignore',
  '.env.docker.example',
  'scripts/docker-runtime-certify.sh',
  'scripts/docker-runtime-certify.ps1',
  'scripts/final-certify.sh',
  'scripts/final-certify.ps1',
  'docs/production/RUNTIME_READINESS.md',
]) requireFile(path);

const compose = exists('docker-compose.yml') ? read('docker-compose.yml') : '';
const requiredServices = ['postgres', 'redis', 'minio', 'minio-init', 'migrator', 'api', 'worker', 'web', 'nginx'];
for (const service of requiredServices) {
  const serviceSection = sectionForService(compose, service);
  if (!serviceSection) {
    failures.push(`docker-compose.yml missing required service: ${service}`);
    continue;
  }
  checked.push(`service:${service}`);
  if (!/networks:\s*\[nexora\]/.test(serviceSection) && !/networks:\n\s+- nexora/.test(serviceSection)) {
    failures.push(`Service ${service} is not attached to the nexora network.`);
  }
}

for (const service of ['postgres', 'redis', 'minio', 'api', 'worker', 'web', 'nginx']) {
  const serviceSection = sectionForService(compose, service);
  if (serviceSection && !serviceSection.includes('healthcheck:')) failures.push(`Service ${service} missing healthcheck.`);
}

for (const [service, imageOrDockerfile] of [
  ['postgres', 'postgres:17-alpine'],
  ['redis', 'redis:7-alpine'],
  ['minio', 'minio/minio:latest'],
  ['minio-init', 'minio/mc:latest'],
  ['migrator', 'infrastructure/docker/backend.Dockerfile'],
  ['api', 'infrastructure/docker/backend.Dockerfile'],
  ['worker', 'infrastructure/docker/worker.Dockerfile'],
  ['web', 'infrastructure/docker/frontend.Dockerfile'],
  ['nginx', 'nginx:1.27-alpine'],
]) {
  const serviceSection = sectionForService(compose, service);
  if (serviceSection && !serviceSection.includes(imageOrDockerfile)) failures.push(`Service ${service} does not use expected image/dockerfile: ${imageOrDockerfile}`);
}

for (const marker of [
  'DATABASE_URL: postgresql://nexora:nexora@postgres:5432/nexora?schema=public',
  'REDIS_URL: redis://redis:6379',
  'MINIO_ENDPOINT: http://minio:9000',
  'MINIO_PRIVATE_BUCKET: nexora-private',
  'MINIO_PUBLIC_BUCKET: nexora-public',
  'AUTH_ACCESS_TOKEN_SECRET',
  'OPENAPI_DOCS_ENABLED: "false"',
]) {
  if (!compose.includes(marker)) failures.push(`docker-compose runtime env missing marker: ${marker}`);
}

for (const marker of [
  'pnpm db:generate && pnpm db:migrate:deploy && pnpm db:migrate:status',
  'condition: service_healthy',
  'condition: service_completed_successfully',
  '${NEXORA_HTTP_PORT:-8080}:80',
  'postgres_data:',
  'redis_data:',
  'minio_data:',
  'driver: bridge',
]) {
  if (!compose.includes(marker)) failures.push(`docker-compose.yml missing topology marker: ${marker}`);
}

const dockerfiles = [
  ['backend', 'infrastructure/docker/backend.Dockerfile', '@nexora/backend', '3001'],
  ['frontend', 'infrastructure/docker/frontend.Dockerfile', '@nexora/frontend', '3000'],
  ['worker', 'infrastructure/docker/worker.Dockerfile', '@nexora/worker', null],
];
for (const [name, path, packageName, port] of dockerfiles) {
  if (!exists(path)) continue;
  const body = read(path);
  for (const marker of [
    'FROM node:22-alpine',
    'corepack enable && corepack prepare pnpm@10.15.0 --activate',
    'COPY package.json pnpm-workspace.yaml pnpm-lock.yaml',
    'COPY frontend/package.json frontend/package.json',
    'COPY backend/package.json backend/package.json',
    'COPY worker/package.json worker/package.json',
    'COPY shared/package.json shared/package.json',
    'COPY database/package.json database/package.json',
    'RUN pnpm install --frozen-lockfile',
    `RUN pnpm --filter ${packageName} build`,
    `CMD ["pnpm", "--filter", "${packageName}", "start"]`,
  ]) {
    if (!body.includes(marker)) failures.push(`${name} Dockerfile missing marker: ${marker}`);
  }
  if (port && !body.includes(`EXPOSE ${port}`)) failures.push(`${name} Dockerfile missing exposed port ${port}.`);
}

const nginx = exists('infrastructure/nginx/nginx.conf') ? read('infrastructure/nginx/nginx.conf') : '';
for (const marker of [
  'server_tokens off',
  'client_max_body_size',
  'upstream nexora_web',
  'server web:3000',
  'upstream nexora_api',
  'server api:3001',
  'location = /healthz',
  'location /api/',
  'proxy_pass http://nexora_api',
  'proxy_pass http://nexora_web',
  'X-Request-Id',
  'X-Content-Type-Options',
  'X-Frame-Options',
]) {
  if (!nginx.includes(marker)) failures.push(`nginx.conf missing runtime/security marker: ${marker}`);
}

const sh = exists('scripts/docker-runtime-certify.sh') ? read('scripts/docker-runtime-certify.sh') : '';
for (const marker of [
  'REQUIRED FILE MISSING: pnpm-lock.yaml',
  'docker compose config',
  'docker compose down --remove-orphans',
  'docker compose build',
  'docker compose up -d postgres redis minio',
  'docker compose up minio-init',
  'docker compose up migrator',
  'docker compose up -d api worker web nginx',
  '/healthz',
  '/api/v1/health/live',
  '/api/v1/health/ready',
  'certification-output/docker-runtime',
  'docker-compose-logs.failure.txt',
]) {
  if (!sh.includes(marker)) failures.push(`docker-runtime-certify.sh missing marker: ${marker}`);
}

const ps = exists('scripts/docker-runtime-certify.ps1') ? read('scripts/docker-runtime-certify.ps1') : '';
for (const marker of [
  'pnpm-lock.yaml',
  'docker',
  'compose',
  'config',
  'build',
  'up',
  'minio-init',
  'migrator',
  '/healthz',
  '/api/v1/health/live',
  '/api/v1/health/ready',
  'certification-output/docker-runtime',
  'docker-compose-logs.failure.txt',
]) {
  if (!ps.includes(marker)) failures.push(`docker-runtime-certify.ps1 missing marker: ${marker}`);
}

const finalSh = exists('scripts/final-certify.sh') ? read('scripts/final-certify.sh') : '';
for (const marker of [
  'RUN_INTEGRATION_TESTS=1',
  'RUNTIME_CERTIFICATION=1',
  'pnpm install --frozen-lockfile',
  'pnpm verify:static',
  'pnpm lint',
  'pnpm typecheck',
  'pnpm db:validate',
  'pnpm db:generate',
  'pnpm build',
  'docker compose config',
  'docker compose up -d postgres redis minio',
  'pnpm db:migrate:deploy',
  'docker compose up -d api worker web nginx',
  'pnpm test',
]) {
  if (!finalSh.includes(marker)) failures.push(`final-certify.sh missing runtime chain marker: ${marker}`);
}

const envExample = exists('.env.docker.example') ? read('.env.docker.example') : '';
for (const marker of [
  'DATABASE_URL=',
  'REDIS_URL=',
  'MINIO_ENDPOINT=',
  'MINIO_ACCESS_KEY=',
  'MINIO_SECRET_KEY=',
  'MINIO_PRIVATE_BUCKET=',
  'AUTH_ACCESS_TOKEN_SECRET=',
  'AUTH_MFA_ENCRYPTION_KEY=',
  'OPENAPI_DOCS_ENABLED=',
]) {
  if (!envExample.includes(marker)) failures.push(`.env.docker.example missing marker: ${marker}`);
}

const pkg = exists('package.json') ? JSON.parse(read('package.json')) : { scripts: {} };
for (const [scriptName, contains] of [
  ['docker:config', 'docker compose config'],
  ['docker:runtime:check', 'scripts/check-docker-runtime-topology.mjs'],
  ['docker:runtime:certify', 'scripts/docker-runtime-certify.sh'],
  ['docker:runtime:certify:ps', 'scripts/docker-runtime-certify.ps1'],
  ['runtime:certify', 'scripts/docker-runtime-certify.sh'],
  ['pass:m17:certify', 'scripts/pass-m17-docker-runtime-certify.sh'],
  ['final:certify', 'scripts/final-certify.sh'],
]) requireScript(pkg, scriptName, contains);

if (!String(pkg.scripts?.['verify:static'] ?? '').includes('docker-runtime:check')) failures.push('verify:static does not include docker-runtime:check.');
if (!String(pkg.scripts?.verify ?? '').includes('docker-runtime:check')) failures.push('verify does not include docker-runtime:check.');

const ci = exists('.github/workflows/ci.yml') ? read('.github/workflows/ci.yml') : '';
for (const marker of ['pnpm install --frozen-lockfile', 'pnpm verify:static', 'pnpm lint', 'pnpm typecheck', 'pnpm test', 'pnpm db:validate', 'pnpm build']) {
  if (!ci.includes(marker)) failures.push(`CI workflow missing marker: ${marker}`);
}

const lockfileExists = exists('pnpm-lock.yaml');
if (!lockfileExists) {
  warnings.push('M1 remains blocked: pnpm-lock.yaml is absent, so live Docker build/runtime certification is not claimed by this static topology pass.');
}

const payload = {
  gate: 'pass-m17-docker-runtime-topology',
  pass: 'M17',
  title: 'Docker Runtime Certification Topology and Evidence Gate',
  status: failures.length ? 'FAILED' : 'PASSED_STATIC_TOPOLOGY_CERTIFICATION_READY',
  completedAt: new Date().toISOString(),
  lockedRuntimeTopology: requiredServices,
  checkedCount: checked.length,
  lockfileExists,
  runtimeCertification: lockfileExists ? 'READY_FOR_LIVE_DOCKER_CERTIFICATION' : 'PENDING_M1_REAL_PNPM_LOCKFILE',
  liveDockerExecutedHere: false,
  liveDockerExecutionReason: 'This gate is intentionally static/source-level; live docker compose build/up is performed by scripts/docker-runtime-certify.* on a machine with Docker and a real lockfile.',
  warnings,
  failures,
};
mkdirSync(join(root, 'certification-output'), { recursive: true });
writeFileSync(join(root, 'certification-output/pass-m17-docker-runtime-topology-certification.json'), `${JSON.stringify(payload, null, 2)}\n`);

if (failures.length) {
  console.error('PASS M17 Docker runtime topology gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS M17 Docker runtime topology gate PASSED: ${requiredServices.length} services, 3 Dockerfiles, nginx routing, runtime certifier scripts and CI markers verified.`);
for (const warning of warnings) console.log(`WARNING: ${warning}`);
