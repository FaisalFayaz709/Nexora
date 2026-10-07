#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const startedAt = new Date().toISOString();
const steps = [];

function run(name, command, args, options = {}) {
  const started = new Date().toISOString();
  console.log(`\n[R1] ${name}`);
  console.log(`$ ${[command, ...args].join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options
  });
  const step = {
    name,
    command: [command, ...args].join(' '),
    startedAt: started,
    finishedAt: new Date().toISOString(),
    status: result.status === 0 ? 'PASS' : 'FAIL',
    exitCode: result.status ?? 1
  };
  steps.push(step);
  if (result.status !== 0) {
    writeEvidence('FAIL', `${name} failed`, step.exitCode);
    process.exit(step.exitCode);
  }
}

function writeEvidence(status, message, exitCode = 0) {
  const output = {
    pass: 'R1',
    name: 'Dependency and lockfile repair',
    status,
    message,
    startedAt,
    finishedAt: new Date().toISOString(),
    lockfilePresent: existsSync(resolve(root, 'pnpm-lock.yaml')),
    steps
  };
  mkdirSync(resolve(root, 'certification-output'), { recursive: true });
  writeFileSync(resolve(root, 'certification-output/pass-r1-dependency-lockfile-repair.json'), `${JSON.stringify(output, null, 2)}\n`);
  return exitCode;
}

run('R1 source-preparation gate', 'node', ['scripts/check-pass-r1-dependency-lockfile-repair.mjs', '--source-only']);
run('Enable Corepack', 'corepack', ['enable']);
run('Activate pnpm 10.15.0', 'corepack', ['prepare', 'pnpm@10.15.0', '--activate']);
run('Verify pnpm version', 'pnpm', ['--version']);

if (!existsSync(resolve(root, 'pnpm-lock.yaml'))) {
  run('Generate real root pnpm-lock.yaml', 'pnpm', ['install', '--lockfile-only']);
} else {
  console.log('\n[R1] pnpm-lock.yaml already exists; verifying it without regeneration.');
}

run('Lockfile policy gate', 'node', ['scripts/check-lockfile-policy.mjs']);
run('Frozen root workspace install', 'pnpm', ['install', '--frozen-lockfile']);
run('Dependency foundation gate', 'pnpm', ['dependencies:check']);
run('Lint gate', 'pnpm', ['lint']);
run('Typecheck gate', 'pnpm', ['typecheck']);
run('Test gate', 'pnpm', ['test']);
run('Prisma validation gate', 'pnpm', ['db:validate']);
run('Build gate', 'pnpm', ['build']);

writeEvidence('PASS', 'PASS R1 completed: real pnpm-lock.yaml exists and dependency-backed gates passed.');
console.log('\nPASS R1 completed: real pnpm-lock.yaml exists and dependency-backed gates passed.');
