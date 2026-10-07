import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const startedAt = new Date().toISOString();
const gates = [
  ['operations-platform', 'scripts/check-operations-platform.mjs'],
  ['commercial-mvp', 'scripts/check-commercial-mvp-completion.mjs'],
  ['security-hardening', 'scripts/check-security-hardening.mjs'],
  ['full-workflow-e2e', 'scripts/check-full-workflow-e2e.mjs'],
  ['production-release', 'scripts/check-production-release.mjs'],
  ['runtime-readiness', 'scripts/check-runtime-readiness.mjs'],
];

const results = [];
for (const [name, script] of gates) {
  if (!existsSync(join(root, script))) {
    results.push({ name, script, status: 'failed', stdout: '', stderr: `Missing gate script: ${script}` });
    continue;
  }
  const run = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  results.push({
    name,
    script,
    status: run.status === 0 ? 'passed' : 'failed',
    exitCode: run.status,
    stdout: run.stdout.trim(),
    stderr: run.stderr.trim(),
  });
}

const failed = results.filter((result) => result.status !== 'passed');
const payload = {
  gate: 'final-runtime-core-controls:check',
  startedAt,
  completedAt: new Date().toISOString(),
  lockedStack: 'Next.js + TypeScript frontend, Fastify + TypeScript backend, PostgreSQL + Prisma, MinIO, Redis, BullMQ, Docker Compose, Nginx, GitHub Actions',
  note: 'Static/source/runtime-readiness gates only. Final runtime certification still requires pnpm-lock.yaml, frozen install, live services, migrations, dependency-backed tests and Docker runtime.',
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  results,
};
mkdirSync(join(root, 'certification-output'), { recursive: true });
writeFileSync(join(root, 'certification-output/final-runtime-core-controls-check.json'), `${JSON.stringify(payload, null, 2)}\n`);

if (failed.length > 0) {
  console.error('Final runtime core-controls gate FAILED');
  for (const result of failed) {
    console.error(`- ${result.name}: ${result.stderr || result.stdout || 'no output'}`);
  }
  process.exit(1);
}

console.log(`Final runtime core-controls gate PASSED: ${results.length} gates passed; final runtime certification remains dependency/runtime gated.`);
