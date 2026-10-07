import type {
  E2ECertificationEvidence,
  E2ECertificationScenario,
  E2ECertificationScenarioId,
} from '@nexora/shared';

export const C17_FULL_WORKFLOW_E2E_POLICY = 'C17_FULL_WORKFLOW_E2E_POLICY' as const;

export interface SeededRuntimeContextEvidence {
  readonly organizations: number;
  readonly branches: number;
  readonly users: number;
  readonly roles: number;
  readonly hasCanonicalCustomer: boolean;
  readonly hasCanonicalVendor: boolean;
  readonly hasCanonicalProducts: boolean;
  readonly hasCanonicalWarehouse: boolean;
  readonly hasCanonicalProject: boolean;
}

export interface RuntimeScenarioResult {
  readonly scenarioId: E2ECertificationScenarioId;
  readonly status: 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED';
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly evidenceFiles: readonly string[];
  readonly assertions: readonly string[];
}

export interface CriticalWorkflowCoverage {
  readonly scenarioIds: readonly E2ECertificationScenarioId[];
  readonly coversIdentity: boolean;
  readonly coversProcurement: boolean;
  readonly coversInventory: boolean;
  readonly coversAssets: boolean;
  readonly coversFieldService: boolean;
  readonly coversMaintenance: boolean;
  readonly coversFinance: boolean;
  readonly coversDocuments: boolean;
  readonly coversReports: boolean;
  readonly coversFrontend: boolean;
  readonly coversSecurity: boolean;
}

export interface IdempotentCommandProof {
  readonly commandName: string;
  readonly idempotencyKey: string | null;
  readonly firstRequestStatus: number;
  readonly retryRequestStatus: number;
  readonly duplicateSideEffectCount: number;
  readonly evidenceFile: string;
}

export interface TransactionalInvariantProof {
  readonly invariantName: string;
  readonly beforeSnapshotRecorded: boolean;
  readonly afterSnapshotRecorded: boolean;
  readonly stockLedgerBalanced: boolean;
  readonly journalBalanced: boolean;
  readonly noPartialStateAfterFailure: boolean;
  readonly evidenceFile: string;
}

export interface SecurityScopeProof {
  readonly crossTenantReadDenied: boolean;
  readonly crossTenantMutationDenied: boolean;
  readonly makerCheckerSelfApprovalDenied: boolean;
  readonly portalScopeEscapeDenied: boolean;
  readonly auditLogRecorded: boolean;
}

export interface SideEffectRuntimeProof {
  readonly documentUploadIntentUsed: boolean;
  readonly privateObjectKeyVerified: boolean;
  readonly notificationRecipientsDeduped: boolean;
  readonly workerProcessedOnlySideEffects: boolean;
  readonly reportExportProducedArtifact: boolean;
  readonly noCriticalStateMutationInBullMQ: boolean;
}

export interface FrontendWorkflowRuntimeProof {
  readonly publicApiOnly: boolean;
  readonly navigationRoutesRendered: readonly string[];
  readonly commandButtonsStatusGated: boolean;
  readonly permissionDeniedActionsHiddenOrDisabled: boolean;
  readonly idempotencyHeaderAttached: boolean;
  readonly tanStackInvalidationObserved: boolean;
}

export interface ProductionE2EReleaseGate {
  readonly architectureGatePassed: boolean;
  readonly contractGatePassed: boolean;
  readonly databaseGatePassed: boolean;
  readonly securityGatePassed: boolean;
  readonly dockerRuntimePassed: boolean;
  readonly totalCriticalScenarios: number;
  readonly passedCriticalScenarios: number;
  readonly skippedCriticalScenarios: number;
  readonly failedCriticalScenarios: number;
  readonly evidenceManifestChecksum: string | null;
}

function fail(code: E2ECertificationScenarioId, message: string): never {
  throw new Error(`${code}: ${message}`);
}

export function assertSeededRuntimeContext(input: SeededRuntimeContextEvidence): void {
  if (input.organizations < 2 || input.branches < 2 || input.users < 6 || input.roles < 6) {
    fail('C17-SEED-ROLES-ORGANIZATIONS-BRANCHES-CANONICAL-DATA', 'C17 runtime requires deterministic multi-tenant, multi-branch, multi-role seed data.');
  }
  if (!input.hasCanonicalCustomer || !input.hasCanonicalVendor || !input.hasCanonicalProducts || !input.hasCanonicalWarehouse || !input.hasCanonicalProject) {
    fail('C17-SEED-ROLES-ORGANIZATIONS-BRANCHES-CANONICAL-DATA', 'C17 runtime seed is missing customer, vendor, product, warehouse or project fixtures.');
  }
}

export function assertScenarioCoversLockedDomains(input: CriticalWorkflowCoverage): void {
  const required = [
    input.coversIdentity,
    input.coversProcurement,
    input.coversInventory,
    input.coversAssets,
    input.coversFieldService,
    input.coversMaintenance,
    input.coversFinance,
    input.coversDocuments,
    input.coversReports,
    input.coversFrontend,
    input.coversSecurity,
  ];
  if (input.scenarioIds.length < 12 || required.some((value) => !value)) {
    fail('C17-CERTIFICATION-EVIDENCE-MANIFEST-BLOCKS-PRODUCTION', 'Full workflow E2E certification must cover every critical ERP domain.');
  }
}

export function assertCriticalWorkflowCatalog(catalog: readonly E2ECertificationScenario[]): void {
  if (catalog.length < 12) {
    fail('C17-CERTIFICATION-EVIDENCE-MANIFEST-BLOCKS-PRODUCTION', 'The C17 scenario catalog must contain all critical runtime workflow families.');
  }
  const blockers = catalog.filter((scenario) => scenario.blocksProduction && scenario.runtimeRequired);
  if (blockers.length !== catalog.length) {
    fail('C17-CERTIFICATION-EVIDENCE-MANIFEST-BLOCKS-PRODUCTION', 'Every C17 scenario must be runtime-required and production-blocking.');
  }
}

export function assertIdempotentCommandProof(input: IdempotentCommandProof): void {
  if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
    fail('C17-FINANCE-IDEMPOTENCY-REVERSE-NOT-EDIT-BALANCE-INVOICE', `${input.commandName} requires an Idempotency-Key in E2E certification.`);
  }
  if (input.firstRequestStatus >= 400 || input.retryRequestStatus >= 500 || input.duplicateSideEffectCount !== 0 || input.evidenceFile.length === 0) {
    fail('C17-FINANCE-IDEMPOTENCY-REVERSE-NOT-EDIT-BALANCE-INVOICE', `${input.commandName} must prove safe retry without duplicate side effects.`);
  }
}

export function assertTransactionalInvariantProof(input: TransactionalInvariantProof): void {
  if (!input.beforeSnapshotRecorded || !input.afterSnapshotRecorded || input.evidenceFile.length === 0) {
    fail('C17-CRM-PROJECT-PROCUREMENT-INVENTORY-FINANCE-HAPPY-PATH', `${input.invariantName} needs before/after runtime evidence.`);
  }
  if (!input.stockLedgerBalanced || !input.journalBalanced || !input.noPartialStateAfterFailure) {
    fail('C17-INVENTORY-CONCURRENT-RECEIPT-RESERVATION-NO-OVERPOST', `${input.invariantName} must prove balanced ledgers and no partial transactional state.`);
  }
}

export function assertSecurityScopeProof(input: SecurityScopeProof): void {
  if (!input.crossTenantReadDenied || !input.crossTenantMutationDenied || !input.makerCheckerSelfApprovalDenied || !input.portalScopeEscapeDenied || !input.auditLogRecorded) {
    fail('C17-CROSS-TENANT-IDOR-MAKER-CHECKER-PORTAL-SCOPES', 'C17 must deny and audit tenant, maker-checker and portal-scope abuse cases.');
  }
}

export function assertDocumentWorkerReportProof(input: SideEffectRuntimeProof): void {
  if (!input.documentUploadIntentUsed || !input.privateObjectKeyVerified || !input.notificationRecipientsDeduped || !input.reportExportProducedArtifact) {
    fail('C17-DOCUMENT-MINIO-NOTIFICATION-WORKER-REPORT-EXPORT', 'Document, notification and report-export runtime evidence is incomplete.');
  }
  if (!input.workerProcessedOnlySideEffects || !input.noCriticalStateMutationInBullMQ) {
    fail('C17-DOCUMENT-MINIO-NOTIFICATION-WORKER-REPORT-EXPORT', 'BullMQ must be limited to side effects, never critical stock, finance or approval state mutation.');
  }
}

export function assertFrontendBrowserWorkflowProof(input: FrontendWorkflowRuntimeProof): void {
  if (!input.publicApiOnly || input.navigationRoutesRendered.length < 8 || !input.commandButtonsStatusGated || !input.permissionDeniedActionsHiddenOrDisabled) {
    fail('C17-FRONTEND-E2E-WORKFLOW-NAVIGATION-STATE-GATES', 'Frontend workflow certification requires API-only navigation and visible state/permission gates.');
  }
  if (!input.idempotencyHeaderAttached || !input.tanStackInvalidationObserved) {
    fail('C17-FRONTEND-E2E-WORKFLOW-NAVIGATION-STATE-GATES', 'Frontend runtime proof must include idempotency headers and TanStack invalidation after mutations.');
  }
}

export function assertEvidenceArtifactRecorded(evidence: E2ECertificationEvidence): void {
  if (evidence.status !== 'PASSED' || evidence.evidenceFiles.length === 0 || evidence.notes.length === 0) {
    fail(evidence.scenarioId, 'Each C17 scenario requires a PASSED result with attached evidence files and notes.');
  }
}

export function assertProductionE2EReleaseGate(input: ProductionE2EReleaseGate): void {
  if (!input.architectureGatePassed || !input.contractGatePassed || !input.databaseGatePassed || !input.securityGatePassed || !input.dockerRuntimePassed) {
    fail('C17-CERTIFICATION-EVIDENCE-MANIFEST-BLOCKS-PRODUCTION', 'Production release requires architecture, contract, database, security and Docker runtime gates.');
  }
  if (input.totalCriticalScenarios <= 0 || input.passedCriticalScenarios !== input.totalCriticalScenarios || input.failedCriticalScenarios !== 0 || input.skippedCriticalScenarios !== 0) {
    fail('C17-CERTIFICATION-EVIDENCE-MANIFEST-BLOCKS-PRODUCTION', 'All critical C17 scenarios must pass with zero skipped or failed scenarios.');
  }
  if (!input.evidenceManifestChecksum || input.evidenceManifestChecksum.length < 32) {
    fail('C17-CERTIFICATION-EVIDENCE-MANIFEST-BLOCKS-PRODUCTION', 'A checksumed evidence manifest is required for C17 release certification.');
  }
}
