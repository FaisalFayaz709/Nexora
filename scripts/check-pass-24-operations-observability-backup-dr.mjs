#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceOnly = process.argv.includes('--source-only');
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
function previousEvidence(path) {
  if (!hasFile(path)) { if (sourceOnly) return; return check(`previous pass evidence exists: ${path}`, false, `${path} is missing.`, { blocker: true }); }
  let status = read(path);
  try { const parsed = JSON.parse(status); status = parsed.status ?? parsed.result ?? status; } catch {}
  const failed = String(status).includes('FAIL');
  check(`previous pass evidence is not failed: ${path}`, !failed, `${path} status ${status}.`, { blocker: !sourceOnly && failed });
}

mkdirSync(pathOf('certification-output'), { recursive: true });

if (!sourceOnly) {
  check('root pnpm-lock.yaml exists for strict PASS 24 runtime certification', hasFile('pnpm-lock.yaml'), 'pnpm-lock.yaml is missing; generate it and run frozen install before claiming operations GO.', { blocker: true });
} else if (!hasFile('pnpm-lock.yaml')) {
  warnings.push('pnpm-lock.yaml is missing. PASS 24 source gate can pass, but operations/runtime GO remains HOLD.');
}

previousEvidence('certification-output/pass-23-runtime-deployment-certification.json');
runGate('PASS 23 runtime deployment source gate', ['scripts/check-pass-23-runtime-deployment-certification.mjs', '--source-only']);
runGate('R21 final blueprint compliance source gate', ['scripts/check-pass-r21-final-blueprint-compliance-audit.mjs', '--source-only']);

const requiredFiles = [
  'shared/src/contracts/operations/pass-24-operations-observability-backup.contracts.ts',
  'backend/src/modules/operations/pass-24-operations-observability-backup-policy.ts',
  'backend/src/modules/operations/pass-24-operations-observability-backup-policy.test.ts',
  'worker/src/processors/pass-24-operations-evidence-policy.ts',
  'frontend/src/modules/operations/pass-24-operations-readiness-workbench.tsx',
  'frontend/src/app/(erp)/operations/readiness/page.tsx',
  'docs/frontend-screens/erp-operations--readiness.md',
  'docs/contracts/capability-locks/pass-24-operations-observability-backup-dr.json',
  'docs/production/OPERATIONS_OBSERVABILITY_BACKUP_DR_RUNBOOK.md',
  'docs/production/OPERATIONS_RUNTIME_EVIDENCE_MANIFEST_TEMPLATE.json',
  'docs/production/INCIDENT_RESPONSE_RUNBOOK.md',
  'docs/production/BACKUP_RESTORE_DRILL_CHECKLIST.md',
  'scripts/check-pass-24-operations-observability-backup-dr.mjs',
  'scripts/pass-24-operations-observability-backup-dr-certify.sh',
  'scripts/pass-24-operations-observability-backup-dr-certify.ps1',
];
for (const f of requiredFiles) check(`PASS 24 required file exists: ${f}`, hasFile(f), `${f} is required.`);

const markers = [
  'PASS_24_OPERATIONS_OBSERVABILITY_BACKUP_DR',
  'PERFORMANCE_SLO',
  'DATABASE_QUERY_PLAN',
  'BACKUP_RETENTION',
  'RESTORE_DRILL',
  'OBJECT_STORAGE_RECOVERY',
  'REDIS_RECOVERY',
  'OBSERVABILITY_SIGNALS',
  'ALERTING_ONCALL',
  'HEALTH_READINESS_LIVENESS',
  'INCIDENT_RESPONSE',
  'DISASTER_RECOVERY',
  'ROLLBACK',
  'TENANT_EXPORT',
  'QUEUE_BACKPRESSURE',
  'HOLD_OPERATIONS_RUNTIME_EVIDENCE_REQUIRED',
  'GO_OPERATIONS_RUNTIME_CERTIFIED',
];
for (const p of [
  'shared/src/contracts/operations/pass-24-operations-observability-backup.contracts.ts',
  'backend/src/modules/operations/pass-24-operations-observability-backup-policy.ts',
]) includesAll(`PASS 24 core markers locked in ${p}`, p, markers);

includesAll('PASS 24 shared contracts define strict runtime evidence thresholds', 'shared/src/contracts/operations/pass-24-operations-observability-backup.contracts.ts', [
  'apiP95Ms', 'max(500)', 'apiErrorRatePct', 'max(1)', 'dbQueryP95Ms', 'max(250)', 'frontendLcpMs', 'max(2500)', 'reportExportP95Ms', 'max(30000)', 'rpoMinutes', 'max(15)', 'rtoMinutes', 'max(60)', 'backupRetentionDays', 'min(30)', 'Pass24OperationsReadinessRows',
]);
includesAll('PASS 24 backend policy refuses GO without runtime proof', 'backend/src/modules/operations/pass-24-operations-observability-backup-policy.ts', [
  'evaluatePass24OperationsDecision', 'sourceGateIsNotRuntimeCertification', 'cannotClaimProductionReadiness', 'lockfilePresent', 'frozenInstallPassed', 'dockerRuntimePassed', 'performanceEvidencePassed', 'backupRestoreEvidencePassed', 'observabilityEvidencePassed', 'queueBackpressureEvidencePassed', 'incidentDrEvidencePassed',
]);
includesAll('PASS 24 worker policy is evidence-only and blocks critical mutations', 'worker/src/processors/pass-24-operations-evidence-policy.ts', [
  'PASS_24_OPERATIONS_EVIDENCE_WORKER_POLICY', 'evidenceOnly', 'forbiddenCriticalMutationMarkers', 'stockBalance.update', 'journalEntry.create', 'approvalRequest.update', 'critical mutation payloads',
]);
includesAll('PASS 24 frontend workbench is read-only and uses shared manifest with DataTable', 'frontend/src/modules/operations/pass-24-operations-readiness-workbench.tsx', [
  'Pass24OperationsReadinessManifest', 'DataTable', 'Runtime evidence checklist', 'does not run backups', 'Blocks production GO',
]);
includesAll('PASS 24 runbook documents runtime evidence folder and strict GO rule', 'docs/production/OPERATIONS_OBSERVABILITY_BACKUP_DR_RUNBOOK.md', [
  'certification-output/pass-24-operations-observability-backup-dr', 'GO is allowed only when every required artifact exists', 'pnpm pass:24:check', 'pass-24-runtime-evidence-manifest.json',
]);
includesAll('PASS 24 runtime evidence template covers all operations domains', 'docs/production/OPERATIONS_RUNTIME_EVIDENCE_MANIFEST_TEMPLATE.json', [
  'performance', 'backupRestore', 'observability', 'queueBackpressure', 'incidentDr', 'apiP95Ms', 'postgresBackupChecksum', 'minioObjectManifestChecksum', 'requestIdTraceAttached', 'rollbackDrillPassed',
]);
includesAll('PASS 24 route map and navigation expose operations readiness', 'frontend/src/lib/route-map.ts', ["route: '/operations/readiness'", "backendEndpoints: ['/health/live', '/health/ready', '/audit-logs']"]);
includesAll('PASS 24 navigation includes operations readiness', 'frontend/src/modules/navigation/navigation-registry.ts', ["Operations Readiness", "href: '/operations/readiness'", "requiredPermission: 'audit.view'"]);
includesAll('PASS 24 is exported from shared and backend operations indexes', 'shared/src/contracts/operations/index.ts', ['pass-24-operations-observability-backup.contracts']);
includesAll('PASS 24 backend operations policy export exists', 'backend/src/modules/operations/index.ts', ['pass-24-operations-observability-backup-policy.js']);

const packageJson = JSON.parse(read('package.json'));
for (const script of [
  'pass:24:source-check',
  'pass:24:check',
  'pass:24:certify',
  'pass:24:certify:sh',
  'pass:24:certify:ps',
  'operations:readiness:check',
]) check(`package.json script exists: ${script}`, Boolean(packageJson.scripts?.[script]), `${script} missing.`);
check('verify:static includes PASS 24 source gate', String(packageJson.scripts?.['verify:static'] ?? '').includes('pass:24:source-check'), 'verify:static must include pass:24:source-check.');
check('verify includes PASS 24 source gate', String(packageJson.scripts?.verify ?? '').includes('pass:24:source-check'), 'verify must include pass:24:source-check.');

const sourceFiles = walk('.');
const frontendPages = sourceFiles.filter((p) => p.startsWith('frontend/src/app/') && p.endsWith('/page.tsx')).length;
const testFiles = sourceFiles.filter((p) => /\.(test|spec)\.(ts|tsx|mjs|js)$/.test(p)).length;
const productionDocs = sourceFiles.filter((p) => p.startsWith('docs/production/') && /PASS_24|BACKUP|RESTORE|OBSERVABILITY|DISASTER|RUNTIME/.test(p)).length;
check('PASS 24 frontend operations readiness page exists in route tree', frontendPages >= 338, `Expected at least 338 frontend page routes after PASS 24; found ${frontendPages}.`);
check('PASS 24 operation/testing source breadth preserved', testFiles >= 149, `Expected at least 149 test/spec files after PASS 24; found ${testFiles}.`);
check('PASS 24 production operations docs breadth exists', productionDocs >= 12, `Expected at least 12 production operations docs; found ${productionDocs}.`);

const result = {
  pass: 'PASS_24',
  name: 'Operations Observability Backup DR',
  sourceOnly,
  status: failures.length || blockers.length ? 'FAIL' : 'PASS_SOURCE_LEVEL_OVERALL_HOLD_PREVIOUS_RUNTIME',
  checkedAt: new Date().toISOString(),
  counts: {
    checks: checks.length,
    passed: checks.filter((c) => c.passed).length,
    failures: failures.length,
    blockers: blockers.length,
    warnings: warnings.length,
    frontendPages,
    testFiles,
    productionDocs,
    gateRuns: gateRuns.length,
  },
  warnings,
  failures,
  blockers,
  gateRuns,
};
writeFileSync(pathOf('certification-output/pass-24-operations-observability-backup-dr.json'), JSON.stringify(result, null, 2));
if (failures.length || blockers.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
