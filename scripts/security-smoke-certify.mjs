#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';

const root = process.cwd();
const outputPath = path.join(root, 'certification-output', 'security-smoke-results.json');
const logPath = path.join(root, 'certification-output', 'security-smoke.log');
const apiBase = (process.env.NEXORA_API_BASE_URL ?? `http://127.0.0.1:${process.env.NEXORA_HTTP_PORT ?? '8080'}/api/v1`).replace(/\/$/, '');
const runSecuritySmoke = process.env.SECURITY_SMOKE === '1' || process.env.RUNTIME_CERTIFICATION === '1';

function now() { return new Date().toISOString(); }
function appendLog(message) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${message}\n`);
}
function runCommand(command, args, env = {}) {
  const startedAt = now();
  appendLog(`$ ${[command, ...args].join(' ')}`);
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', shell: false, env: { ...process.env, ...env } });
  appendLog(result.stdout ?? '');
  appendLog(result.stderr ?? '');
  return {
    command: [command, ...args].join(' '),
    status: result.status ?? 1,
    signal: result.signal,
    stdout: (result.stdout ?? '').slice(-12000),
    stderr: (result.stderr ?? '').slice(-12000),
    startedAt,
    finishedAt: now(),
  };
}

async function apiProbe(name, method, route, expected) {
  const startedAt = now();
  try {
    const response = await fetch(`${apiBase}${route}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `security-smoke-${crypto.randomUUID()}`,
      },
      body: method === 'GET' ? undefined : JSON.stringify({ securitySmoke: true }),
    });
    const ok = expected(response.status);
    return { name, method, route, status: response.status, ok, startedAt, finishedAt: now() };
  } catch (error) {
    return { name, method, route, status: 0, ok: false, error: error instanceof Error ? error.message : String(error), startedAt, finishedAt: now() };
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(logPath, `SECURITY_SMOKE_RESULTS\nGenerated: ${now()}\nAPI: ${apiBase}\n`);

if (!runSecuritySmoke) {
  console.error('Security smoke certification is runtime-blocking. Set SECURITY_SMOKE=1 or RUNTIME_CERTIFICATION=1 after Docker runtime is running. This script writes certification-output/security-smoke-results.json only when security smoke checks pass.');
  process.exit(2);
}

const commandResults = [
  runCommand('pnpm', ['security:check']),
];

const probes = [
  await apiProbe('live health is reachable', 'GET', '/health/live', (status) => status >= 200 && status < 500 && status !== 404 && status !== 405),
  await apiProbe('ready health is reachable', 'GET', '/health/ready', (status) => status >= 200 && status < 500 && status !== 404 && status !== 405),
  await apiProbe('unauthenticated current-user check is denied without bypass', 'GET', '/auth/me', (status) => status === 401 || status === 403),
  await apiProbe('mutation without auth has zero unauthorized bypasses', 'POST', '/payments', (status) => status === 401 || status === 403 || status === 400),
  await apiProbe('document listing without auth has zero unauthorized bypasses', 'GET', '/documents', (status) => status === 401 || status === 403),
];

const commandFailures = commandResults.filter((r) => r.status !== 0);
const probeFailures = probes.filter((r) => !r.ok);
const passed = commandFailures.length === 0 && probeFailures.length === 0;
const payload = {
  marker: 'SECURITY_SMOKE_RESULTS',
  generatedAt: now(),
  apiBase,
  passed,
  checks: [
    'pnpm security:check',
    'NEXORA_API_BASE_URL /health/live probe',
    'NEXORA_API_BASE_URL /health/ready probe',
    'auth endpoints deny unauthenticated access',
    'zero unauthorized bypasses for critical unauthenticated mutation probes',
  ],
  commandResults,
  probes,
  commandFailureCount: commandFailures.length,
  probeFailureCount: probeFailures.length,
};
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

if (!passed) {
  console.error('Security smoke certification FAILED. See certification-output/security-smoke-results.json and certification-output/security-smoke.log.');
  process.exit(1);
}
console.log('Security smoke certification PASSED. Evidence written to certification-output/security-smoke-results.json.');
