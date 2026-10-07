#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
const evidenceMode = process.argv.includes('--evidence') || process.argv.includes('--runtime-evidence');
const checks = [];
const failures = [];
const blockers = [];
const warnings = [];
const gateRuns = [];
function pathOf(p) { return join(root, p); }
function hasFile(p) { return existsSync(pathOf(p)); }
function read(p) { return readFileSync(pathOf(p), 'utf8'); }
function check(name, passed, message = '', options = {}) {
  checks.push({ name, passed, message, blocker: Boolean(options.blocker) });
  if (!passed) {
    const line = `${name}${message ? ` — ${message}` : ''}`;
    if (options.blocker) blockers.push(line);
    else failures.push(line);
  }
}
function includesAll(name, path, markers) {
  if (!hasFile(path)) return check(name, false, `Missing file: ${path}`);
  const body = read(path);
  const missing = markers.filter((m) => !body.includes(m));
  check(name, missing.length === 0, missing.length ? `Missing marker(s): ${missing.join(', ')}` : '');
}
function walk(dir) {
  const abs = pathOf(dir);
  const out = [];
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    if (['node_modules', '.next', 'dist', 'coverage', '.turbo'].includes(name)) continue;
    const p = join(abs, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(relative(root, p).split('\\').join('/')));
    else out.push(relative(root, p).split('\\').join('/'));
  }
  return out;
}
function runGate(name, args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 180000 });
  gateRuns.push({ name, args, status: result.status ?? 1 });
  check(name, result.status === 0, result.status === 0 ? '' : `${args.join(' ')} failed with status ${result.status}. ${(result.stderr || result.stdout || '').slice(0, 2400)}`);
}
function sectionForService(compose, service) {
  const escaped = service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = compose.match(new RegExp(`(?:^|\\n)  ${escaped}:\\n([\\s\\S]*?)(?=\\n  [a-zA-Z0-9_-]+:|\\nnetworks:|\\nvolumes:|$)`));
  return match?.[1] ?? '';
}

mkdirSync(pathOf('certification-output'), { recursive: true });
if (!sourceOnly && !evidenceMode) {
  check('root pnpm-lock.yaml exists for strict PASS 23 runtime certification', hasFile('pnpm-lock.yaml'), 'pnpm-lock.yaml is missing; generate it with pnpm install --lockfile-only and commit it before claiming runtime GO.', { blocker: true });
} else if (!hasFile('pnpm-lock.yaml')) {
  warnings.push('pnpm-lock.yaml is missing. PASS 23 source gate can pass, but Docker/runtime certification remains HOLD.');
}

runGate('PASS 22 testing completion source gate', ['scripts/check-pass-22-testing-completion.mjs', '--source-only']);
runGate('R19 docker runtime source gate', ['scripts/check-pass-r19-docker-runtime-certification.mjs', '--source-only']);
runGate('R20 CI/CD hardening source gate', ['scripts/check-pass-r20-cicd-hardening.mjs', '--source-only']);

const requiredFiles = [
  'docker-compose.yml',
  'infrastructure/docker/backend.Dockerfile',
  'infrastructure/docker/frontend.Dockerfile',
  'infrastructure/docker/worker.Dockerfile',
  'infrastructure/docker/docker-compose.release-candidate.yml',
  'infrastructure/nginx/nginx.conf',
  'infrastructure/nginx/nginx.production.conf',
  '.dockerignore',
  '.env.docker.example',
  '.github/workflows/runtime-certification.yml',
  '.github/workflows/runtime-deployment.yml',
  'scripts/check-pass-23-runtime-deployment-certification.mjs',
  'scripts/pass-23-runtime-deployment-certification-certify.sh',
  'scripts/pass-23-runtime-deployment-certification-certify.ps1',
  'docs/production/RUNTIME_DEPLOYMENT_CERTIFICATION_RUNBOOK.md',
  'docs/production/RUNTIME_DEPLOYMENT_EVIDENCE_MANIFEST_TEMPLATE.json',
  'docs/contracts/capability-locks/pass-23-runtime-deployment-certification.json',
  'backend/src/modules/runtime-deployment/pass-23-runtime-deployment-policy.ts',
  'shared/src/contracts/runtime/pass-23-runtime-deployment.contracts.ts',
];
for (const f of requiredFiles) check(`PASS 23 required file exists: ${f}`, hasFile(f), `${f} is required.`);

const compose = hasFile('docker-compose.yml') ? read('docker-compose.yml') : '';
const requiredServices = ['postgres', 'redis', 'minio', 'minio-init', 'migrator', 'api', 'worker', 'web', 'nginx'];
for (const service of requiredServices) {
  const section = sectionForService(compose, service);
  check(`docker-compose service exists: ${service}`, Boolean(section), `${service} missing from docker-compose.yml`);
  if (section) {
    check(`docker-compose service ${service} attached to nexora network`, /networks:\s*\[nexora\]/.test(section) || /networks:\n\s+- nexora/.test(section), `${service} must be on nexora network.`);
  }
}
for (const service of ['postgres', 'redis', 'minio', 'api', 'worker', 'web', 'nginx']) {
  const section = sectionForService(compose, service);
  check(`docker-compose service ${service} has healthcheck`, section.includes('healthcheck:'), `${service} missing healthcheck.`);
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
]) check(`docker-compose runtime marker present: ${marker}`, compose.includes(marker), `Missing ${marker}`);

for (const path of ['infrastructure/docker/backend.Dockerfile', 'infrastructure/docker/frontend.Dockerfile', 'infrastructure/docker/worker.Dockerfile']) {
  includesAll(`Dockerfile frozen workspace install: ${path}`, path, [
    'node:22-alpine',
    'corepack prepare pnpm@10.15.0 --activate',
    'COPY package.json pnpm-workspace.yaml pnpm-lock.yaml',
    'pnpm install --frozen-lockfile',
    'COPY . .',
  ]);
}
includesAll('backend Dockerfile builds Fastify workspace', 'infrastructure/docker/backend.Dockerfile', ['pnpm --filter @nexora/backend build', 'EXPOSE 3001']);
includesAll('frontend Dockerfile builds Next.js workspace', 'infrastructure/docker/frontend.Dockerfile', ['pnpm --filter @nexora/frontend build', 'EXPOSE 3000']);
includesAll('worker Dockerfile builds BullMQ worker workspace', 'infrastructure/docker/worker.Dockerfile', ['pnpm --filter @nexora/worker build']);
includesAll('nginx gateway routes web and Fastify API', 'infrastructure/nginx/nginx.conf', ['/healthz', 'location /api/', 'proxy_pass http://nexora_api', 'proxy_pass http://nexora_web']);
includesAll('release candidate overlay keeps production route through Nginx', 'infrastructure/docker/docker-compose.release-candidate.yml', ['NODE_ENV: production', 'OPENAPI_DOCS_ENABLED: "false"', 'nginx.production.conf']);

includesAll('PASS 23 runtime certification shell wrapper is strict and evidence-writing', 'scripts/pass-23-runtime-deployment-certification-certify.sh', [
  'PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION',
  'pnpm-lock.yaml',
  'corepack prepare pnpm@10.15.0 --activate',
  'pnpm install --frozen-lockfile',
  'pnpm verify:static',
  'pnpm lint',
  'pnpm typecheck',
  'pnpm test',
  'pnpm build',
  'pnpm db:validate',
  'docker compose',
  'up -d postgres redis minio',
  'minio-init',
  'migrator',
  'api worker web nginx',
  '/healthz',
  '/api/v1/health/live',
  '/api/v1/health/ready',
  'PASS_23_RUNTIME_MINIO_PROOF',
  'pass-23-runtime-evidence-manifest.json',
]);
includesAll('PASS 23 PowerShell wrapper is strict and evidence-writing', 'scripts/pass-23-runtime-deployment-certification-certify.ps1', [
  'PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION',
  'pnpm-lock.yaml',
  'corepack prepare pnpm@10.15.0 --activate',
  'pnpm install --frozen-lockfile',
  'pnpm verify:static',
  'pnpm lint',
  'pnpm typecheck',
  'docker compose',
  'PASS_23_RUNTIME_MINIO_PROOF',
  'pass-23-runtime-evidence-manifest.json',
]);

includesAll('PASS 23 runbook documents source-only HOLD and GO evidence', 'docs/production/RUNTIME_DEPLOYMENT_CERTIFICATION_RUNBOOK.md', [
  'PASS 23 Runtime Deployment Certification Runbook',
  'pnpm-lock.yaml',
  'certification-output/pass-23-runtime-deployment',
  'GO only when every runtime evidence file is present',
]);
includesAll('PASS 23 backend policy refuses GO without runtime evidence', 'backend/src/modules/runtime-deployment/pass-23-runtime-deployment-policy.ts', [
  'evaluatePass23RuntimeDeploymentDecision',
  'HOLD_RUNTIME_EVIDENCE_REQUIRED',
  'NO_GO_RUNTIME_DEPLOYMENT_FAILED',
  'GO_RUNTIME_DEPLOYMENT_CERTIFIED',
  'sourceGateIsNotRuntimeCertification',
  'cannotClaimProductionReadiness',
  'pnpmLockfilePresent',
  'frozenInstallPassed',
  'dockerComposeBuildPassed',
  'minioUploadDownloadProofPassed',
  'securitySmokePassed',
]);
includesAll('PASS 23 shared contract locks API boundary and topology', 'shared/src/contracts/runtime/pass-23-runtime-deployment.contracts.ts', [
  'PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION_CONTRACT',
  'postgres',
  'redis',
  'minio',
  'worker',
  'nginx',
  'Fastify /api/v1 remains the ERP business API',
  'Source-level PASS 23 does not equal Docker/runtime GO',
]);

const pkg = hasFile('package.json') ? JSON.parse(read('package.json')) : { scripts: {} };
for (const script of [
  'pass:23:source-check',
  'pass:23:check',
  'pass:23:certify',
  'pass:23:certify:sh',
  'pass:23:certify:ps',
  'runtime:deployment:check',
  'runtime:deployment:certify',
]) check(`package.json script exists: ${script}`, Boolean(pkg.scripts?.[script]), `${script} missing.`);
check('verify:static includes PASS 23 source gate', String(pkg.scripts?.['verify:static'] ?? '').includes('pass:23:source-check'), 'verify:static must include pass:23:source-check.');
check('verify includes PASS 23 source gate', String(pkg.scripts?.verify ?? '').includes('pass:23:source-check'), 'verify must include pass:23:source-check.');

const runtimeWorkflow = hasFile('.github/workflows/runtime-certification.yml') ? read('.github/workflows/runtime-certification.yml') : '';
for (const marker of ['PASS 23 runtime deployment source gate', 'bash scripts/pass-23-runtime-deployment-certification-certify.sh', 'actions/upload-artifact', 'pass-23-runtime-deployment-certification-evidence']) {
  check(`runtime certification workflow marker present: ${marker}`, runtimeWorkflow.includes(marker), `Missing ${marker}`);
}
const pass23Workflow = hasFile('.github/workflows/runtime-deployment.yml') ? read('.github/workflows/runtime-deployment.yml') : '';
for (const marker of ['PASS 23 Runtime Deployment Certification', 'workflow_dispatch', 'docker', 'pnpm install --frozen-lockfile', 'bash scripts/pass-23-runtime-deployment-certification-certify.sh']) {
  check(`PASS 23 workflow marker present: ${marker}`, pass23Workflow.includes(marker), `Missing ${marker}`);
}

const expectedRuntimeEvidence = [
  'certification-output/pass-23-runtime-deployment/pass-23-runtime-deployment-certification.log',
  'certification-output/pass-23-runtime-deployment/docker-compose.config.yml',
  'certification-output/pass-23-runtime-deployment/docker-compose-ps.txt',
  'certification-output/pass-23-runtime-deployment/nginx-healthz.txt',
  'certification-output/pass-23-runtime-deployment/api-live.json',
  'certification-output/pass-23-runtime-deployment/api-ready.json',
  'certification-output/pass-23-runtime-deployment/web-home.html',
  'certification-output/pass-23-runtime-deployment/minio-upload-download-proof.txt',
  'certification-output/pass-23-runtime-deployment/docker-compose-logs.tail.txt',
  'certification-output/pass-23-runtime-deployment/pass-23-runtime-evidence-manifest.json',
];
const missingEvidence = expectedRuntimeEvidence.filter((p) => !hasFile(p));
if (sourceOnly && missingEvidence.length) warnings.push('Live PASS 23 runtime evidence files are absent in source-only mode. This is expected until local/CI Docker certification runs.');
if (evidenceMode || (!sourceOnly && !hasFile('pnpm-lock.yaml'))) {
  if (missingEvidence.length && evidenceMode) failures.push(`Missing PASS 23 runtime evidence files: ${missingEvidence.join(', ')}`);
}

const sourceCounts = {
  frontendPages: walk('frontend/src/app').filter((p) => p.endsWith('/page.tsx')).length,
  backendRoutes: walk('backend/src').filter((p) => p.endsWith('.routes.ts')).length,
  dockerfiles: ['infrastructure/docker/backend.Dockerfile', 'infrastructure/docker/frontend.Dockerfile', 'infrastructure/docker/worker.Dockerfile'].filter(hasFile).length,
  composeServices: requiredServices.filter((service) => sectionForService(compose, service)).length,
  workflows: walk('.github/workflows').filter((p) => p.endsWith('.yml') || p.endsWith('.yaml')).length,
};

const result = {
  pass: 'PASS_23',
  name: 'Docker, Deployment, CI/CD and Runtime Certification',
  sourceOnly,
  evidenceMode,
  status: failures.length || blockers.length ? 'FAIL' : sourceOnly ? 'PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME' : 'PASS_SOURCE_LEVEL_RUNTIME_EVIDENCE_PENDING',
  checkedAt: new Date().toISOString(),
  counts: {
    checks: checks.length,
    passed: checks.filter((c) => c.passed).length,
    failures: failures.length,
    blockers: blockers.length,
    warnings: warnings.length,
    ...sourceCounts,
    missingRuntimeEvidence: missingEvidence.length,
  },
  gates: gateRuns,
  enforcedRules: [
    'Runtime topology keeps web, api, worker, postgres, redis, minio, minio-init, migrator and nginx as one Docker Compose deployment.',
    'Dockerfiles use the root pnpm workspace and frozen lockfile install.',
    'Nginx remains the gateway; Fastify /api/v1 remains the business API.',
    'Migrations run through the migrator service before api/worker/web are certified.',
    'MinIO buckets and upload/download proof are required for runtime GO.',
    'Source-only PASS 23 cannot claim production runtime readiness.',
  ],
  warnings,
  failures,
  blockers,
  checks,
  limitations: [
    'This source gate does not execute pnpm install, Docker build, Docker Compose up, migrations, seed, live health checks, MinIO proof, E2E or security smoke in the sandbox.',
    'Final GO remains blocked until pnpm-lock.yaml and local/CI runtime evidence are produced.',
  ],
};
writeFileSync(pathOf('certification-output/pass-23-runtime-deployment-certification.json'), JSON.stringify(result, null, 2));
writeFileSync(pathOf('certification-output/PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION_LOG.txt'), `${result.status}\nChecks run: ${result.counts.checks}\nChecks passed: ${result.counts.passed}\nFailures: ${failures.length}\nBlockers: ${blockers.length}\nCompose services: ${sourceCounts.composeServices}\nWorkflows: ${sourceCounts.workflows}\nMissing runtime evidence: ${missingEvidence.length}\n`);
if (failures.length || blockers.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
