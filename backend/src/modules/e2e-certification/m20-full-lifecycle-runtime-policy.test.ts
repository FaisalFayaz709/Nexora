import { describe, expect, it } from 'vitest';
import { E2ECertificationScenarioIds, M20LifecycleProofRows, M20RuntimeRequiredScenarios } from '@nexora/shared';
import {
  assertM20ChainContinuity,
  assertM20LifecycleCatalog,
  assertM20LifecycleEvidence,
  assertM20RollbackProof,
  assertM20RuntimeGates,
  assertM20RuntimeRunResult,
  m20FullLifecycleChecklist,
} from './m20-full-lifecycle-runtime-policy.js';

describe('M20 full lifecycle E2E runtime certification policy', () => {
  it('validates the full lifecycle catalog and blocks production until runtime proof exists', () => {
    expect(() => assertM20LifecycleCatalog(M20LifecycleProofRows)).not.toThrow();
    expect(m20FullLifecycleChecklist().runtimeScenarios).toHaveLength(M20RuntimeRequiredScenarios.length);
  });

  it('requires customer→contract→project→procurement→inventory→asset→service→maintenance→finance evidence continuity', () => {
    expect(() => assertM20LifecycleEvidence({
      runId: 'm20-run-001',
      organizationId: 'org-001',
      branchId: 'branch-001',
      customerId: 'customer-001',
      contractId: 'contract-001',
      projectId: 'project-001',
      bomId: 'bom-001',
      materialRequirementId: 'mr-001',
      purchaseRequestId: 'pr-001',
      rfqId: 'rfq-001',
      supplierQuotationId: 'quote-001',
      purchaseOrderId: 'po-001',
      goodsReceiptId: 'grn-001',
      stockTransactionId: 'stock-txn-001',
      serialNumberId: 'serial-001',
      assetId: 'asset-001',
      qrTokenHashPrefix: 'abcdef123456',
      serviceTicketId: 'ticket-001',
      workOrderId: 'wo-001',
      serviceReportId: 'sr-001',
      maintenancePlanId: 'mp-001',
      maintenanceExecutionId: 'me-001',
      supplierInvoiceId: 'si-001',
      journalEntryId: 'je-001',
      paymentId: 'pay-001',
      documentId: 'doc-001',
      notificationId: 'note-001',
      reportExecutionId: 'report-001',
      auditTraceId: 'audit-001',
    })).not.toThrow();
  });

  it('rejects a broken cross-module lifecycle chain', () => {
    expect(() => assertM20ChainContinuity({
      customerContractProjectLinked: true,
      projectBomMaterialRequirementLinked: true,
      procurementSourceChainLinked: true,
      inventoryLedgerSerialBatchLinked: true,
      assetInstallationQrWarrantyLinked: true,
      serviceTicketWorkOrderReportLinked: true,
      maintenanceExecutionLinked: true,
      financeInvoiceJournalPaymentLinked: false,
      documentNotificationReportEvidenceLinked: true,
      portalPwaOfflineEvidenceLinked: true,
      auditTraceLinked: true,
    })).toThrow('M20-CUSTOMER-CONTRACT-PROJECT-CONTINUITY');
  });

  it('requires all C17 scenario IDs to pass with zero skipped or failed scenarios', () => {
    expect(() => assertM20RuntimeRunResult({
      runId: 'm20-runtime-001',
      startedAt: '2026-09-06T18:30:00.000Z',
      finishedAt: '2026-09-06T18:45:00.000Z',
      status: 'PASSED',
      passedScenarioIds: [...E2ECertificationScenarioIds],
      failedScenarioIds: [],
      skippedScenarioIds: [],
      evidenceFiles: [
        'certification-output/full-lifecycle-e2e/customer-project.json',
        'certification-output/full-lifecycle-e2e/procurement-finance.json',
        'certification-output/full-lifecycle-e2e/inventory-asset.json',
        'certification-output/full-lifecycle-e2e/service-maintenance.json',
        'certification-output/full-lifecycle-e2e/documents-reports.json',
        'certification-output/full-lifecycle-e2e/portal-offline.json',
        'certification-output/full-lifecycle-e2e/security-abuse.json',
        'certification-output/full-lifecycle-e2e/release-manifest.json',
      ],
      evidenceManifestChecksum: '0123456789abcdef0123456789abcdef',
    })).not.toThrow();
  });

  it('blocks production when Docker/browser/security/runtime gates are not passed', () => {
    expect(() => assertM20RuntimeGates({
      architectureGatePassed: true,
      contractGatePassed: true,
      databaseGatePassed: true,
      dockerRuntimePassed: false,
      m19SecurityGatePassed: true,
      browserE2EGatePassed: true,
      allM0ToM19PreflightGatesPassed: true,
      unresolvedCriticalFindings: 0,
    })).toThrow('M20-PRODUCTION-RELEASE-BLOCKER-EVIDENCE-MANIFEST');
  });

  it('requires rollback proof for failed critical mutations with no partial state', () => {
    expect(() => assertM20RollbackProof({
      scenarioName: 'payment post failure injection',
      commandName: 'POST /api/v1/finance/payments/:id/post',
      failureInjected: true,
      beforeSnapshotFile: 'certification-output/full-lifecycle-e2e/payment-before.json',
      afterSnapshotFile: 'certification-output/full-lifecycle-e2e/payment-after.json',
      stockLedgerUnchangedOrReversed: true,
      journalUnchangedOrReversed: true,
      approvalStateUnchanged: true,
      assetHistoryUnchangedOrReversed: true,
      auditRecorded: true,
    })).not.toThrow();
  });
});
