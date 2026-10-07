import { z } from 'zod';
import { NonEmptyStringSchema } from '../common';

export const C17_FULL_WORKFLOW_E2E_CERTIFICATION = 'C17_FULL_WORKFLOW_E2E_CERTIFICATION' as const;

export const E2ECertificationScenarioIds = [
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
] as const;

export type E2ECertificationScenarioId = (typeof E2ECertificationScenarioIds)[number];

export const E2ECertificationDomainSchema = z.enum([
  'SEED_DATA',
  'IDENTITY_ORGANIZATION_RBAC',
  'CRM_PROJECTS',
  'PROCUREMENT',
  'INVENTORY',
  'ASSETS',
  'FIELD_SERVICE',
  'MAINTENANCE',
  'FINANCE',
  'SECURITY',
  'DOCUMENTS_NOTIFICATIONS',
  'REPORTS_EXPORTS',
  'FRONTEND',
  'RELEASE_EVIDENCE',
]);
export type E2ECertificationDomain = z.infer<typeof E2ECertificationDomainSchema>;

export const E2ECertificationStatusSchema = z.enum([
  'NOT_STARTED',
  'READY_TO_RUN',
  'RUNNING',
  'PASSED',
  'FAILED',
  'BLOCKED',
]);
export type E2ECertificationStatus = z.infer<typeof E2ECertificationStatusSchema>;

export const E2ECertificationScenarioSchema = z.object({
  scenarioId: z.enum(E2ECertificationScenarioIds),
  title: NonEmptyStringSchema,
  domains: z.array(E2ECertificationDomainSchema).min(1),
  commandChain: z.array(NonEmptyStringSchema).min(1),
  requiredEvidence: z.array(NonEmptyStringSchema).min(1),
  criticalInvariants: z.array(NonEmptyStringSchema).min(1),
  runtimeRequired: z.boolean(),
  blocksProduction: z.boolean(),
});
export type E2ECertificationScenario = z.infer<typeof E2ECertificationScenarioSchema>;

export const E2ECertificationEvidenceSchema = z.object({
  scenarioId: z.enum(E2ECertificationScenarioIds),
  status: E2ECertificationStatusSchema,
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
  evidenceFiles: z.array(NonEmptyStringSchema),
  notes: z.array(NonEmptyStringSchema),
});
export type E2ECertificationEvidence = z.infer<typeof E2ECertificationEvidenceSchema>;

export const E2ECertificationScenarioCatalog: readonly E2ECertificationScenario[] = [
  {
    scenarioId: 'C17-SEED-ROLES-ORGANIZATIONS-BRANCHES-CANONICAL-DATA',
    title: 'Canonical runtime seed provides two organizations, branches, roles, users and workflow master data',
    domains: ['SEED_DATA', 'IDENTITY_ORGANIZATION_RBAC'],
    commandChain: ['seed organizations', 'seed branches', 'seed users/roles', 'seed product/vendor/customer/project data'],
    requiredEvidence: ['seed log', 'role matrix snapshot', 'tenant/branch fixture map'],
    criticalInvariants: ['Every runtime scenario uses deterministic seeded records', 'No test relies on production data'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    scenarioId: 'C17-IDENTITY-ORG-RBAC-MFA-SESSION-WORKFLOW',
    title: 'Identity, organization selection, RBAC, MFA and session revocation workflow',
    domains: ['IDENTITY_ORGANIZATION_RBAC', 'SECURITY'],
    commandChain: ['login', 'select organization', 'enforce permission', 'refresh session', 'revoke session'],
    requiredEvidence: ['auth API trace', 'permission denial trace', 'revoked session trace'],
    criticalInvariants: ['Tenant context is resolved from membership', 'Privileges are evaluated server-side'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    scenarioId: 'C17-CRM-PROJECT-PROCUREMENT-INVENTORY-FINANCE-HAPPY-PATH',
    title: 'Customer/project demand flows into procurement, stock receipt, asset readiness and finance posting',
    domains: ['CRM_PROJECTS', 'PROCUREMENT', 'INVENTORY', 'ASSETS', 'FINANCE'],
    commandChain: ['create customer', 'create project', 'create BOM/material requirement', 'create PR', 'approve PR', 'create PO', 'receive GRN', 'post stock', 'record invoice', 'post finance'],
    requiredEvidence: ['API command trace', 'stock ledger evidence', 'invoice balance evidence', 'project costing evidence'],
    criticalInvariants: ['Operational and financial state changes are transactional', 'No workflow state is changed through free status patching'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    scenarioId: 'C17-PROCUREMENT-THREE-WAY-MATCH-TO-AP-JOURNAL-PAYMENT',
    title: 'Supplier invoice three-way match creates payable, journal entry and idempotent supplier payment',
    domains: ['PROCUREMENT', 'INVENTORY', 'FINANCE'],
    commandChain: ['match PO/GRN/invoice', 'create AP', 'post journal', 'pay supplier', 'retry payment idempotently'],
    requiredEvidence: ['match result', 'payable row', 'balanced journal', 'single payment after retry'],
    criticalInvariants: ['PO + GRN + Supplier Invoice mismatches are blocked/flagged', 'Journal entries are balanced'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    scenarioId: 'C17-INVENTORY-CONCURRENT-RECEIPT-RESERVATION-NO-OVERPOST',
    title: 'Concurrent inventory receipt and reservation attempts cannot over-receive or over-reserve stock',
    domains: ['INVENTORY', 'PROCUREMENT', 'CRM_PROJECTS'],
    commandChain: ['parallel receive goods', 'parallel reserve stock', 'validate available quantity', 'inspect stock ledger'],
    requiredEvidence: ['concurrency test output', 'stock balance before/after', 'rejected duplicate/over-limit command trace'],
    criticalInvariants: ['No negative stock balance', 'No over-receipt beyond PO quantity', 'No over-reservation across projects'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    scenarioId: 'C17-ASSET-INSTALLATION-QR-ROTATION-SERVICE-MAINTENANCE',
    title: 'Serialized asset installation links stock, customer site, QR token, warranty and maintenance plan',
    domains: ['ASSETS', 'INVENTORY', 'MAINTENANCE', 'FIELD_SERVICE'],
    commandChain: ['register serialized asset from stock', 'install asset', 'rotate QR token', 'resolve QR', 'schedule maintenance'],
    requiredEvidence: ['asset history', 'serial/stock link', 'QR token version trace', 'maintenance due record'],
    criticalInvariants: ['Asset install consumes/links the correct stock serial', 'Expired/rotated QR tokens do not resolve'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    scenarioId: 'C17-FIELD-SERVICE-PARTS-CONSUMPTION-STOCK-ASSET-HISTORY',
    title: 'Work order completion with spare parts consumes stock and writes asset service history atomically',
    domains: ['FIELD_SERVICE', 'INVENTORY', 'ASSETS', 'DOCUMENTS_NOTIFICATIONS'],
    commandChain: ['assign work order', 'accept', 'start travel', 'arrive onsite', 'start work', 'create service report', 'consume parts', 'complete work order'],
    requiredEvidence: ['work order state trace', 'service report', 'stock transaction', 'asset history event'],
    criticalInvariants: ['Parts consumption and work-order completion commit together', 'Customer confirmation policy is enforced before closure'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    scenarioId: 'C17-FINANCE-IDEMPOTENCY-REVERSE-NOT-EDIT-BALANCE-INVOICE',
    title: 'Finance idempotency, invoice balances, period control and reversal-only correction are certified',
    domains: ['FINANCE', 'SECURITY'],
    commandChain: ['post invoice', 'allocate payment', 'retry payment', 'reverse journal', 'close/open period check'],
    requiredEvidence: ['idempotency proof', 'invoice balance snapshot', 'reversal journal pair', 'period guard result'],
    criticalInvariants: ['Retry-sensitive finance commands are idempotent', 'Posted ledgers are reversed, not edited in place'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    scenarioId: 'C17-CROSS-TENANT-IDOR-MAKER-CHECKER-PORTAL-SCOPES',
    title: 'Cross-tenant IDOR, maker-checker separation and customer/vendor/technician portal scopes are denied correctly',
    domains: ['SECURITY', 'IDENTITY_ORGANIZATION_RBAC', 'FRONTEND'],
    commandChain: ['attempt cross-tenant read', 'attempt cross-tenant mutation', 'attempt self-approval', 'attempt portal out-of-scope access'],
    requiredEvidence: ['403/404 denial traces', 'audit log traces', 'maker-checker rejection', 'portal scope rejection'],
    criticalInvariants: ['User cannot approve own high-risk command', 'Portal users cannot escape assigned resources'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    scenarioId: 'C17-DOCUMENT-MINIO-NOTIFICATION-WORKER-REPORT-EXPORT',
    title: 'Document upload/download, notification fan-out, email outbox, worker side effects and report export are certified',
    domains: ['DOCUMENTS_NOTIFICATIONS', 'REPORTS_EXPORTS'],
    commandChain: ['create upload intent', 'complete upload', 'download with authorization', 'enqueue notification', 'enqueue report export', 'verify generated artifact'],
    requiredEvidence: ['MinIO object metadata', 'document version row', 'notification recipient list', 'worker log', 'report export file'],
    criticalInvariants: ['Browser never writes directly to MinIO without backend upload intent', 'BullMQ-is-only-used-for-side-effects-not-stock-finance-approval-critical-state'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    scenarioId: 'C17-FRONTEND-E2E-WORKFLOW-NAVIGATION-STATE-GATES',
    title: 'Frontend workflow pages navigate, render state gates and call public API command endpoints only',
    domains: ['FRONTEND', 'SECURITY'],
    commandChain: ['open dashboard', 'navigate workflow pages', 'verify disabled/visible commands', 'submit command with Idempotency-Key'],
    requiredEvidence: ['browser route trace', 'network command trace', 'button state snapshot', 'no server-only frontend import report'],
    criticalInvariants: ['Frontend uses public API only', 'UI state gates follow status, permission and scope'],
    runtimeRequired: true,
    blocksProduction: true,
  },
  {
    scenarioId: 'C17-CERTIFICATION-EVIDENCE-MANIFEST-BLOCKS-PRODUCTION',
    title: 'Certification evidence manifest blocks production until all critical runtime workflows pass',
    domains: ['RELEASE_EVIDENCE'],
    commandChain: ['collect logs', 'collect scenario JSON', 'verify zero skipped critical scenarios', 'publish release evidence'],
    requiredEvidence: ['certification-output/full-workflow-e2e/results.json', 'console log', 'manifest checksum', 'release decision'],
    criticalInvariants: ['No skipped critical scenario can be marked production-ready', 'All generated evidence is checksumed'],
    runtimeRequired: true,
    blocksProduction: true,
  },
] as const;

export const E2ECertificationManifest = {
  pass: 'C17',
  name: 'Full Workflow E2E Certification',
  lockedArchitectureUnchanged: true,
  noStackReplacement: true,
  runtimeCertificationRequiredBeforeProduction: true,
  scenarioCount: E2ECertificationScenarioCatalog.length,
  scenarios: E2ECertificationScenarioCatalog,
} as const;
