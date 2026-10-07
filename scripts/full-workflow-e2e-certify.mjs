#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const outputDir = path.join(root, 'certification-output', 'full-workflow-e2e');
const lifecycleOutputDir = path.join(root, 'certification-output', 'full-lifecycle-e2e');
const runtimeResultsPath = path.join(lifecycleOutputDir, 'runtime-results.json');
// Runtime evidence target: certification-output/full-workflow-e2e/results.json

// Runtime switches intentionally used by final-certify.sh / final-certify.ps1.
const run = process.env.RUN_FULL_WORKFLOW_E2E === '1';
const strict = process.env.RUN_FULL_WORKFLOW_E2E_STRICT === '1';
const baseUrl = (process.env.NEXORA_API_BASE_URL ?? `http://127.0.0.1:${process.env.NEXORA_HTTP_PORT ?? '8080'}/api/v1`).replace(/\/$/, '');

const FULL_LIFECYCLE_E2E_RUNTIME_RESULTS_REQUIRED = true;
const PROBE_ONLY_PREPRODUCTION_CERTIFICATION_NOT_RELEASE_SIGNOFF = true;

const scenarioIds = [
  'C17-SEED-ROLES-ORGANIZATIONS-BRANCHES-CANONICAL-DATA',
  'C17-IDENTITY-ORG-RBAC-MFA-SESSION-WORKFLOW',
  'C17-CRM-PROJECT-PROCUREMENT-INVENTORY-FINANCE-HAPPY-PATH',
  'C17-PROCUREMENT-THREE-WAY-MATCH-TO-AP-JOURNAL-PAYMENT',
  'C17-INVENTORY-CONCURRENT-RECEIPT-RESERVATION-NO-OVERPOST',
  'C17-ASSET-INSTALLATION-QR-ROTATION-SERVICE-MAINTENANCE',
  'C17-FIELD-SERVICE-PARTS-CONSUMPTION-STOCK-ASSET-HISTORY',
  'C17-FINANCE-IDEMPOTENCY-REVERSE-NOT-EDIT-BALANCE-INVOICE',
  'C17-CROSS-TENANT-IDOR-MAKER-CHECKER-PORTAL-SCOPES',
  'C17-DOCUMENT-MINIO-NOTIFICATION-WORKER-REPORT-EXPORT',
  'C17-FRONTEND-E2E-WORKFLOW-NAVIGATION-STATE-GATES',
  'C17-CERTIFICATION-EVIDENCE-MANIFEST-BLOCKS-PRODUCTION',
];

const lifecycleCommandChain = [
  { segment: 'runtime health', method: 'GET', route: '/health/live', expects: '200 readiness/liveness' },
  { segment: 'runtime readiness', method: 'GET', route: '/health/ready', expects: '200 readiness after postgres/redis/minio are available' },
  { segment: 'identity login', method: 'POST', route: '/auth/login', expects: '401/400/200 but not 404/405/5xx' },
  { segment: 'identity session context', method: 'GET', route: '/auth/me', expects: '401/200 but not 404/405/5xx' },
  { segment: 'organization branch setup', method: 'GET', route: '/branches', expects: 'tenant/RBAC protected endpoint exists' },
  { segment: 'customer', method: 'GET', route: '/customers', expects: 'customer master endpoint exists' },
  { segment: 'customer site', method: 'GET', route: '/customer-sites', expects: 'site endpoint exists' },
  { segment: 'project', method: 'GET', route: '/projects', expects: 'project endpoint exists' },
  { segment: 'project BOM', method: 'GET', route: '/projects/__e2e_project_id__/bom', expects: 'project BOM route exists' },
  { segment: 'purchase request', method: 'GET', route: '/purchase-requests', expects: 'PR endpoint exists' },
  { segment: 'RFQ', method: 'GET', route: '/rfqs', expects: 'RFQ endpoint exists' },
  { segment: 'purchase order', method: 'GET', route: '/purchase-orders', expects: 'PO endpoint exists' },
  { segment: 'goods receipt', method: 'GET', route: '/goods-receipts', expects: 'GRN endpoint exists' },
  { segment: 'inventory stock', method: 'GET', route: '/inventory/stock', expects: 'stock balance endpoint exists' },
  { segment: 'inventory ledger', method: 'GET', route: '/inventory/ledger', expects: 'immutable ledger endpoint exists' },
  { segment: 'asset lifecycle', method: 'GET', route: '/assets', expects: 'asset endpoint exists' },
  { segment: 'asset QR', method: 'GET', route: '/asset-qr/__e2e_token__', expects: 'QR route exists and remains authorization controlled' },
  { segment: 'service ticket', method: 'GET', route: '/tickets', expects: 'ticket endpoint exists' },
  { segment: 'work order', method: 'GET', route: '/work-orders', expects: 'work-order endpoint exists' },
  { segment: 'maintenance plan', method: 'GET', route: '/maintenance/plans', expects: 'maintenance plan endpoint exists' },
  { segment: 'maintenance schedule', method: 'GET', route: '/maintenance/schedule', expects: 'maintenance schedule endpoint exists' },
  { segment: 'supplier invoice', method: 'GET', route: '/supplier-invoices', expects: 'supplier invoice endpoint exists' },
  { segment: 'payments', method: 'GET', route: '/payments', expects: 'payment endpoint exists' },
  { segment: 'documents', method: 'GET', route: '/documents', expects: 'document endpoint exists' },
  { segment: 'notifications', method: 'GET', route: '/notifications', expects: 'notification endpoint exists' },
  { segment: 'reports', method: 'GET', route: '/reports', expects: 'report endpoint exists' },
  { segment: 'report export', method: 'POST', route: '/reports/exports', expects: 'async report export endpoint exists' },
  { segment: 'search', method: 'GET', route: '/search', expects: 'permission-filtered global search endpoint exists' },
  { segment: 'calendar', method: 'GET', route: '/calendar', expects: 'permission-filtered calendar endpoint exists' },
];

function now() {
  return new Date().toISOString();
}

function writeJson(fileName, value, dir = outputDir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

async function probe({ method, route, segment, expects }) {
  const startedAt = now();
  const url = `${baseUrl}${route}`;
  const headers = {
    'Content-Type': 'application/json',
    'Idempotency-Key': `full-lifecycle-e2e-${crypto.randomUUID()}`,
  };
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method === 'GET' ? undefined : JSON.stringify({ certification: 'FULL_LIFECYCLE_E2E_PROBE_ONLY' }),
    });
    const endpointRecognized = response.status > 0 && response.status < 500 && response.status !== 404 && response.status !== 405;
    return { segment, method, route, url, expects, status: response.status, endpointRecognized, ok: endpointRecognized, startedAt, finishedAt: now() };
  } catch (error) {
    return { segment, method, route, url, expects, status: 0, endpointRecognized: false, ok: false, error: error instanceof Error ? error.message : String(error), startedAt, finishedAt: now() };
  }
}

function loadStrictRuntimeResults() {
  if (!fs.existsSync(runtimeResultsPath)) {
    throw new Error(
      `Strict full lifecycle E2E runtime evidence is missing: ${path.relative(root, runtimeResultsPath)}. ` +
      'Run the executable browser/API workflow suite and write this results file before production sign-off.',
    );
  }
  const parsed = JSON.parse(fs.readFileSync(runtimeResultsPath, 'utf8'));
  if (parsed.status !== 'PASSED') throw new Error('Strict full lifecycle E2E status is not PASSED.');
  const failed = parsed.failedScenarioIds ?? [];
  const skipped = parsed.skippedScenarioIds ?? [];
  if (failed.length > 0 || skipped.length > 0) {
    throw new Error('Strict full lifecycle E2E must have zero failed and zero skipped critical scenarios.');
  }
  for (const scenarioId of scenarioIds) {
    if (!Array.isArray(parsed.passedScenarioIds) || !parsed.passedScenarioIds.includes(scenarioId)) {
      throw new Error(`Strict full lifecycle E2E evidence is missing passed scenario: ${scenarioId}`);
    }
  }
  if (String(parsed.evidenceManifestChecksum ?? '').length < 32) {
    throw new Error('Strict full lifecycle E2E evidence manifest checksum is missing or too short.');
  }
  return parsed;
}

if (!run) {
  console.error('Full lifecycle E2E certification is runtime-blocking. Set RUN_FULL_WORKFLOW_E2E=1 and NEXORA_API_BASE_URL, or rely on the default http://127.0.0.1:${NEXORA_HTTP_PORT:-8080}/api/v1 after docker compose is up.');
  process.exit(2);
}

const probes = [];
for (const command of lifecycleCommandChain) {
  probes.push(await probe(command));
}

const failedProbes = probes.filter((item) => !item.ok);
const probeManifestHash = crypto.createHash('sha256').update(JSON.stringify({ probes, scenarioIds, lifecycleCommandChain })).digest('hex');

writeJson('api-probes.json', probes);
writeJson('command-chain.json', lifecycleCommandChain);

let strictRuntimeResults = null;
let strictError = null;
if (strict) {
  try {
    strictRuntimeResults = loadStrictRuntimeResults();
  } catch (error) {
    strictError = error instanceof Error ? error.message : String(error);
  }
}

const status = failedProbes.length === 0 && strictRuntimeResults ? 'PASSED' : failedProbes.length === 0 ? 'READY_TO_RUN' : 'FAILED';
const results = scenarioIds.map((scenarioId) => ({
  scenarioId,
  status,
  startedAt: probes[0]?.startedAt ?? now(),
  finishedAt: now(),
  evidenceFiles: [
    'certification-output/full-workflow-e2e/api-probes.json',
    'certification-output/full-workflow-e2e/command-chain.json',
    ...(strictRuntimeResults ? ['certification-output/full-lifecycle-e2e/runtime-results.json'] : []),
  ],
  notes: strictRuntimeResults
    ? ['Strict runtime evidence manifest passed with zero failed and zero skipped scenarios.']
    : ['API route probe completed; strict full lifecycle command assertions are still required before production sign-off.'],
}));

writeJson('results.json', results);
writeJson('manifest.json', {
  generatedAt: now(),
  baseUrl,
  scenarioCount: results.length,
  routeProbeCount: probes.length,
  failedProbeCount: failedProbes.length,
  strictRuntimeEvidenceRequired: FULL_LIFECYCLE_E2E_RUNTIME_RESULTS_REQUIRED,
  strictRuntimeEnabled: strict,
  strictRuntimeEvidenceFile: path.relative(root, runtimeResultsPath),
  strictRuntimeEvidenceLoaded: Boolean(strictRuntimeResults),
  strictRuntimeError: strictError,
  probeOnlyIsNotReleaseSignoff: PROBE_ONLY_PREPRODUCTION_CERTIFICATION_NOT_RELEASE_SIGNOFF,
  evidenceManifestChecksum: strictRuntimeResults?.evidenceManifestChecksum ?? probeManifestHash,
  productionReady: failedProbes.length === 0 && Boolean(strictRuntimeResults),
});

if (failedProbes.length > 0) {
  console.error(`Full lifecycle E2E route probe FAILED: ${failedProbes.length} route(s) were missing, method-blocked or unreachable.`);
  process.exit(1);
}

if (!strictRuntimeResults) {
  console.error('Full lifecycle E2E route probe passed, but production certification remains blocked until strict runtime-results.json evidence exists with zero failed and zero skipped critical scenarios.');
  if (strictError) console.error(strictError);
  process.exit(2);
}

console.log(`Full lifecycle E2E certification PASSED for ${results.length} critical scenario families.`);
console.log(`Evidence written to ${path.relative(root, outputDir)}.`);
