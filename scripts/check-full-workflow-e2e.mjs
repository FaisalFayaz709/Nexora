import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const file = (p) => path.join(root, p);
const exists = (p) => fs.existsSync(file(p));
const text = (p) => fs.readFileSync(file(p), 'utf8');
const requireFile = (p) => { if (!exists(p)) errors.push(`Missing required full-workflow E2E file: ${p}`); };
const requireText = (p, marker) => { if (!exists(p)) errors.push(`Missing file for marker ${marker}: ${p}`); else if (!text(p).includes(marker)) errors.push(`Missing marker in ${p}: ${marker}`); };

for (const p of [
  'shared/src/contracts/e2e-certification/e2e-certification-manifest.ts',
  'shared/src/contracts/e2e-certification/index.ts',
  'backend/src/modules/e2e-certification/full-workflow-e2e-policy.ts',
  'backend/src/modules/e2e-certification/full-workflow-e2e-policy.test.ts',
  'backend/src/modules/e2e-certification/full-workflow-e2e.integration.test.ts',
  'frontend/src/modules/e2e-certification/full-workflow-certification-center.tsx',
  'frontend/src/app/(erp)/e2e-certification/page.tsx',
  'tests/e2e/full-workflow-e2e-certification.md',
  'scripts/full-workflow-e2e-certify.mjs',
  'scripts/full-workflow-e2e-certify.sh',
  'scripts/full-workflow-e2e-certify.ps1',
  'docs/compliance/FULL_WORKFLOW_E2E.md',
]) requireFile(p);

requireText('package.json', 'full-workflow:e2e:check');
requireText('package.json', 'full-workflow:e2e:certify');
requireText('shared/src/contracts/index.ts', "export * from './e2e-certification';");
requireText('frontend/src/modules/navigation/app-shell.tsx', "['E2E Certification', '/e2e-certification', 'security']");
requireText('frontend/src/modules/e2e-certification/full-workflow-certification-center.tsx', 'E2ECertificationScenarioCatalog');
requireText('.github/workflows/ci.yml', 'pnpm verify:static');

for (const marker of [
  'C17_FULL_WORKFLOW_E2E_CERTIFICATION',
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
  'BullMQ-is-only-used-for-side-effects-not-stock-finance-approval-critical-state',
]) requireText('shared/src/contracts/e2e-certification/e2e-certification-manifest.ts', marker);

for (const marker of [
  'assertSeededRuntimeContext',
  'assertScenarioCoversLockedDomains',
  'assertCriticalWorkflowCatalog',
  'assertIdempotentCommandProof',
  'assertTransactionalInvariantProof',
  'assertSecurityScopeProof',
  'assertDocumentWorkerReportProof',
  'assertFrontendBrowserWorkflowProof',
  'assertEvidenceArtifactRecorded',
  'assertProductionE2EReleaseGate',
]) requireText('backend/src/modules/e2e-certification/full-workflow-e2e-policy.ts', marker);

for (const marker of [
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
]) requireText('backend/src/modules/e2e-certification/full-workflow-e2e.integration.test.ts', marker);

requireText('scripts/full-workflow-e2e-certify.mjs', 'RUN_FULL_WORKFLOW_E2E');
requireText('scripts/full-workflow-e2e-certify.mjs', 'NEXORA_API_BASE_URL');
requireText('scripts/full-workflow-e2e-certify.mjs', 'certification-output/full-workflow-e2e/results.json');

const frontendRoot = file('frontend/src');
const prohibited = [
  '@nexora/database',
  'backend/src',
  'database/prisma',
  'from \'minio\'',
  'from "minio"',
  'from \'bullmq\'',
  'from "bullmq"',
  'from \'ioredis\'',
  'from "ioredis"',
];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      const rel = path.relative(root, full);
      const body = fs.readFileSync(full, 'utf8');
      for (const marker of prohibited) {
        if (body.includes(marker)) errors.push(`Frontend server-only import marker ${marker} found in ${rel}`);
      }
    }
  }
}
if (exists('frontend/src')) walk(frontendRoot);

if (errors.length) {
  console.error('Full workflow E2E gate FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Full workflow E2E gate PASSED');
console.log('Full workflow E2E certification matrix, runner and production-blocking evidence gates are present.');
