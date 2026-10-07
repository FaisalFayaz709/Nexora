import {
  E2ECertificationScenarioIds,
  M20FullLifecycleManifest,
  M20LifecycleProofRows,
  M20RuntimeRequiredScenarios,
  type M20LifecycleEvidence,
  type M20LifecycleProofRow,
  type M20RuntimeRunResult,
} from '@nexora/shared';

export const M20_FULL_LIFECYCLE_E2E_RUNTIME_POLICY = 'M20_FULL_LIFECYCLE_E2E_RUNTIME_POLICY' as const;

export interface M20RuntimeGateEvidence {
  readonly architectureGatePassed: boolean;
  readonly contractGatePassed: boolean;
  readonly databaseGatePassed: boolean;
  readonly dockerRuntimePassed: boolean;
  readonly m19SecurityGatePassed: boolean;
  readonly browserE2EGatePassed: boolean;
  readonly allM0ToM19PreflightGatesPassed: boolean;
  readonly unresolvedCriticalFindings: number;
}

export interface M20RollbackProof {
  readonly scenarioName: string;
  readonly commandName: string;
  readonly failureInjected: boolean;
  readonly beforeSnapshotFile: string;
  readonly afterSnapshotFile: string;
  readonly stockLedgerUnchangedOrReversed: boolean;
  readonly journalUnchangedOrReversed: boolean;
  readonly approvalStateUnchanged: boolean;
  readonly assetHistoryUnchangedOrReversed: boolean;
  readonly auditRecorded: boolean;
}

export interface M20ChainContinuityFlags {
  readonly customerContractProjectLinked: boolean;
  readonly projectBomMaterialRequirementLinked: boolean;
  readonly procurementSourceChainLinked: boolean;
  readonly inventoryLedgerSerialBatchLinked: boolean;
  readonly assetInstallationQrWarrantyLinked: boolean;
  readonly serviceTicketWorkOrderReportLinked: boolean;
  readonly maintenanceExecutionLinked: boolean;
  readonly financeInvoiceJournalPaymentLinked: boolean;
  readonly documentNotificationReportEvidenceLinked: boolean;
  readonly portalPwaOfflineEvidenceLinked: boolean;
  readonly auditTraceLinked: boolean;
}

function fail(code: string, message: string): never {
  throw new Error(`${code}: ${message}`);
}

export function assertM20LifecycleCatalog(rows: readonly M20LifecycleProofRow[] = M20LifecycleProofRows): void {
  if (rows.length !== M20FullLifecycleManifest.lifecycleSegmentCount || rows.length < 12) {
    fail('M20-FULL-LIFECYCLE-HAPPY-PATH', 'M20 full lifecycle catalog must cover every locked ERP lifecycle segment.');
  }
  const segments = new Set<string>();
  for (const row of rows) {
    if (segments.has(row.segment)) fail(row.controlId, `Duplicate M20 segment ${row.segment}.`);
    segments.add(row.segment);
    if (!row.runtimeRequired || !row.blocksProduction) fail(row.controlId, 'Every M20 lifecycle row is runtime-required and production-blocking.');
    if (row.commandChain.length === 0 || row.requiredEvidence.length === 0 || row.criticalInvariants.length === 0) {
      fail(row.controlId, 'M20 lifecycle rows require commands, evidence and invariants.');
    }
  }
}

export function assertM20LifecycleEvidence(input: M20LifecycleEvidence): void {
  const requiredFields: readonly (keyof M20LifecycleEvidence)[] = [
    'runId',
    'organizationId',
    'branchId',
    'customerId',
    'contractId',
    'projectId',
    'bomId',
    'materialRequirementId',
    'purchaseRequestId',
    'rfqId',
    'supplierQuotationId',
    'purchaseOrderId',
    'goodsReceiptId',
    'stockTransactionId',
    'serialNumberId',
    'assetId',
    'qrTokenHashPrefix',
    'serviceTicketId',
    'workOrderId',
    'serviceReportId',
    'maintenancePlanId',
    'maintenanceExecutionId',
    'supplierInvoiceId',
    'journalEntryId',
    'paymentId',
    'documentId',
    'notificationId',
    'reportExecutionId',
    'auditTraceId',
  ];
  for (const key of requiredFields) {
    if (String(input[key] ?? '').length === 0) {
      fail('M20-FULL-LIFECYCLE-HAPPY-PATH', `Missing lifecycle evidence field ${String(key)}.`);
    }
  }
  if (input.qrTokenHashPrefix.length < 8) {
    fail('M20-ASSET-INSTALLATION-QR-WARRANTY-CONTINUITY', 'M20 evidence must store QR hash prefix only, never a raw token.');
  }
}

export function assertM20ChainContinuity(flags: M20ChainContinuityFlags): void {
  const checks = [
    flags.customerContractProjectLinked,
    flags.projectBomMaterialRequirementLinked,
    flags.procurementSourceChainLinked,
    flags.inventoryLedgerSerialBatchLinked,
    flags.assetInstallationQrWarrantyLinked,
    flags.serviceTicketWorkOrderReportLinked,
    flags.maintenanceExecutionLinked,
    flags.financeInvoiceJournalPaymentLinked,
    flags.documentNotificationReportEvidenceLinked,
    flags.portalPwaOfflineEvidenceLinked,
    flags.auditTraceLinked,
  ];
  if (checks.some((passed) => !passed)) {
    fail('M20-CUSTOMER-CONTRACT-PROJECT-CONTINUITY', 'M20 lifecycle chain has a broken cross-module source link.');
  }
}

export function assertM20RuntimeRunResult(input: M20RuntimeRunResult): void {
  const expectedScenarioIds = new Set(E2ECertificationScenarioIds);
  if (input.status !== 'PASSED') fail('M20-PRODUCTION-RELEASE-BLOCKER-EVIDENCE-MANIFEST', 'M20 runtime status must be PASSED before release.');
  if (input.failedScenarioIds.length > 0 || input.skippedScenarioIds.length > 0) {
    fail('M20-PRODUCTION-RELEASE-BLOCKER-EVIDENCE-MANIFEST', 'M20 blocks production when any scenario failed or was skipped.');
  }
  for (const scenarioId of expectedScenarioIds) {
    if (!input.passedScenarioIds.includes(scenarioId)) {
      fail('M20-PRODUCTION-RELEASE-BLOCKER-EVIDENCE-MANIFEST', `Missing passed scenario ${scenarioId}.`);
    }
  }
  if (input.evidenceFiles.length < M20RuntimeRequiredScenarios.length || input.evidenceManifestChecksum.length < 32) {
    fail('M20-PRODUCTION-RELEASE-BLOCKER-EVIDENCE-MANIFEST', 'M20 requires a checksumed evidence manifest and evidence files for all runtime scenarios.');
  }
}

export function assertM20RuntimeGates(input: M20RuntimeGateEvidence): void {
  const gates = [
    input.architectureGatePassed,
    input.contractGatePassed,
    input.databaseGatePassed,
    input.dockerRuntimePassed,
    input.m19SecurityGatePassed,
    input.browserE2EGatePassed,
    input.allM0ToM19PreflightGatesPassed,
  ];
  if (gates.some((passed) => !passed) || input.unresolvedCriticalFindings > 0) {
    fail('M20-PRODUCTION-RELEASE-BLOCKER-EVIDENCE-MANIFEST', 'M20 production release remains blocked until every gate and critical finding is closed.');
  }
}

export function assertM20RollbackProof(input: M20RollbackProof): void {
  if (!input.failureInjected || input.beforeSnapshotFile.length === 0 || input.afterSnapshotFile.length === 0 || !input.auditRecorded) {
    fail('M20-TRANSACTION-ROLLBACK-NO-PARTIAL-STATE', `${input.commandName} requires failure injection, before/after snapshots and audit proof.`);
  }
  if (!input.stockLedgerUnchangedOrReversed || !input.journalUnchangedOrReversed || !input.approvalStateUnchanged || !input.assetHistoryUnchangedOrReversed) {
    fail('M20-TRANSACTION-ROLLBACK-NO-PARTIAL-STATE', `${input.commandName} left partial critical state after failure.`);
  }
}

export function m20FullLifecycleChecklist() {
  return {
    policy: M20_FULL_LIFECYCLE_E2E_RUNTIME_POLICY,
    pass: M20FullLifecycleManifest.pass,
    lifecycleSegmentCount: M20FullLifecycleManifest.lifecycleSegmentCount,
    runtimeScenarioCount: M20FullLifecycleManifest.requiredRuntimeScenarioCount,
    controls: M20LifecycleProofRows.map((row) => row.controlId),
    runtimeScenarios: M20RuntimeRequiredScenarios,
    productionBlockedUntilRuntimeCertified: true,
  } as const;
}
