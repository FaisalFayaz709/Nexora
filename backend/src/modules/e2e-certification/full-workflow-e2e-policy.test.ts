import { describe, expect, it } from 'vitest';
import { E2ECertificationScenarioCatalog } from '@nexora/shared';
import {
  assertCriticalWorkflowCatalog,
  assertDocumentWorkerReportProof,
  assertEvidenceArtifactRecorded,
  assertFrontendBrowserWorkflowProof,
  assertIdempotentCommandProof,
  assertProductionE2EReleaseGate,
  assertScenarioCoversLockedDomains,
  assertSecurityScopeProof,
  assertSeededRuntimeContext,
  assertTransactionalInvariantProof,
} from './full-workflow-e2e-policy.js';

describe('C17 full workflow E2E certification policy', () => {
  it('C17-SEED-ROLES-ORGANIZATIONS-BRANCHES-CANONICAL-DATA', () => {
    expect(() => assertSeededRuntimeContext({ organizations: 2, branches: 3, users: 8, roles: 8, hasCanonicalCustomer: true, hasCanonicalVendor: true, hasCanonicalProducts: true, hasCanonicalWarehouse: true, hasCanonicalProject: true })).not.toThrow();
    expect(() => assertSeededRuntimeContext({ organizations: 1, branches: 1, users: 2, roles: 2, hasCanonicalCustomer: true, hasCanonicalVendor: true, hasCanonicalProducts: true, hasCanonicalWarehouse: true, hasCanonicalProject: true })).toThrow('C17-SEED-ROLES-ORGANIZATIONS-BRANCHES-CANONICAL-DATA');
  });

  it('C17-CERTIFICATION-EVIDENCE-MANIFEST-BLOCKS-PRODUCTION requires full scenario coverage', () => {
    expect(() => assertCriticalWorkflowCatalog(E2ECertificationScenarioCatalog)).not.toThrow();
    expect(() => assertScenarioCoversLockedDomains({ scenarioIds: E2ECertificationScenarioCatalog.map((item) => item.scenarioId), coversIdentity: true, coversProcurement: true, coversInventory: true, coversAssets: true, coversFieldService: true, coversMaintenance: true, coversFinance: true, coversDocuments: true, coversReports: true, coversFrontend: true, coversSecurity: true })).not.toThrow();
  });

  it('C17-FINANCE-IDEMPOTENCY-REVERSE-NOT-EDIT-BALANCE-INVOICE', () => {
    expect(() => assertIdempotentCommandProof({ commandName: 'pay supplier', idempotencyKey: 'c17-payment-001', firstRequestStatus: 201, retryRequestStatus: 200, duplicateSideEffectCount: 0, evidenceFile: 'certification-output/full-workflow-e2e/payment.json' })).not.toThrow();
    expect(() => assertIdempotentCommandProof({ commandName: 'pay supplier', idempotencyKey: null, firstRequestStatus: 201, retryRequestStatus: 201, duplicateSideEffectCount: 1, evidenceFile: '' })).toThrow('C17-FINANCE-IDEMPOTENCY-REVERSE-NOT-EDIT-BALANCE-INVOICE');
  });

  it('C17-INVENTORY-CONCURRENT-RECEIPT-RESERVATION-NO-OVERPOST transaction invariants', () => {
    expect(() => assertTransactionalInvariantProof({ invariantName: 'stock and finance post together', beforeSnapshotRecorded: true, afterSnapshotRecorded: true, stockLedgerBalanced: true, journalBalanced: true, noPartialStateAfterFailure: true, evidenceFile: 'certification-output/full-workflow-e2e/ledger.json' })).not.toThrow();
    expect(() => assertTransactionalInvariantProof({ invariantName: 'over-reservation failure', beforeSnapshotRecorded: true, afterSnapshotRecorded: false, stockLedgerBalanced: false, journalBalanced: true, noPartialStateAfterFailure: false, evidenceFile: '' })).toThrow('C17-INVENTORY-CONCURRENT-RECEIPT-RESERVATION-NO-OVERPOST');
  });

  it('C17-CROSS-TENANT-IDOR-MAKER-CHECKER-PORTAL-SCOPES', () => {
    expect(() => assertSecurityScopeProof({ crossTenantReadDenied: true, crossTenantMutationDenied: true, makerCheckerSelfApprovalDenied: true, portalScopeEscapeDenied: true, auditLogRecorded: true })).not.toThrow();
    expect(() => assertSecurityScopeProof({ crossTenantReadDenied: true, crossTenantMutationDenied: false, makerCheckerSelfApprovalDenied: true, portalScopeEscapeDenied: true, auditLogRecorded: true })).toThrow('C17-CROSS-TENANT-IDOR-MAKER-CHECKER-PORTAL-SCOPES');
  });

  it('C17-DOCUMENT-MINIO-NOTIFICATION-WORKER-REPORT-EXPORT', () => {
    expect(() => assertDocumentWorkerReportProof({ documentUploadIntentUsed: true, privateObjectKeyVerified: true, notificationRecipientsDeduped: true, workerProcessedOnlySideEffects: true, reportExportProducedArtifact: true, noCriticalStateMutationInBullMQ: true })).not.toThrow();
    expect(() => assertDocumentWorkerReportProof({ documentUploadIntentUsed: true, privateObjectKeyVerified: true, notificationRecipientsDeduped: true, workerProcessedOnlySideEffects: false, reportExportProducedArtifact: true, noCriticalStateMutationInBullMQ: false })).toThrow('C17-DOCUMENT-MINIO-NOTIFICATION-WORKER-REPORT-EXPORT');
  });

  it('C17-FRONTEND-E2E-WORKFLOW-NAVIGATION-STATE-GATES', () => {
    expect(() => assertFrontendBrowserWorkflowProof({ publicApiOnly: true, navigationRoutesRendered: ['/', '/workflow-completion', '/procurement/workflow', '/inventory', '/assets/lifecycle', '/service/field-operations', '/maintenance/workbench', '/finance/workbench'], commandButtonsStatusGated: true, permissionDeniedActionsHiddenOrDisabled: true, idempotencyHeaderAttached: true, tanStackInvalidationObserved: true })).not.toThrow();
    expect(() => assertFrontendBrowserWorkflowProof({ publicApiOnly: false, navigationRoutesRendered: ['/'], commandButtonsStatusGated: false, permissionDeniedActionsHiddenOrDisabled: false, idempotencyHeaderAttached: false, tanStackInvalidationObserved: false })).toThrow('C17-FRONTEND-E2E-WORKFLOW-NAVIGATION-STATE-GATES');
  });

  it('C17-CERTIFICATION-EVIDENCE-MANIFEST-BLOCKS-PRODUCTION', () => {
    expect(() => assertEvidenceArtifactRecorded({ scenarioId: 'C17-CERTIFICATION-EVIDENCE-MANIFEST-BLOCKS-PRODUCTION', status: 'PASSED', evidenceFiles: ['certification-output/full-workflow-e2e/results.json'], notes: ['all critical workflows passed'] })).not.toThrow();
    expect(() => assertProductionE2EReleaseGate({ architectureGatePassed: true, contractGatePassed: true, databaseGatePassed: true, securityGatePassed: true, dockerRuntimePassed: true, totalCriticalScenarios: E2ECertificationScenarioCatalog.length, passedCriticalScenarios: E2ECertificationScenarioCatalog.length, skippedCriticalScenarios: 0, failedCriticalScenarios: 0, evidenceManifestChecksum: '0123456789abcdef0123456789abcdef' })).not.toThrow();
  });
});
