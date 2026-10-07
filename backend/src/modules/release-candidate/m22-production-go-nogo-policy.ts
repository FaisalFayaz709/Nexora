import {
  M22ProductionGateCatalog,
  M22ProductionGateIds,
  type M22ApprovalChain,
  type M22GateEvidence,
  type M22ProductionDecisionRecord,
  type M22RuntimeEvidenceSummary,
} from '@nexora/shared';

export const M22_PRODUCTION_GO_NOGO_POLICY = 'M22_PRODUCTION_GO_NOGO_POLICY' as const;

function fail(gateId: string, message: string): never {
  throw new Error(`${gateId}: ${message}`);
}

export function assertM22GateCatalog(): void {
  if (M22ProductionGateCatalog.length !== M22ProductionGateIds.length) {
    fail('M22-FINAL-PRODUCTION-GO-NOGO-DECISION', 'M22 gate catalog must map every required gate exactly once.');
  }
  const ids = new Set<string>();
  for (const gate of M22ProductionGateCatalog) {
    if (ids.has(gate.gateId)) fail(gate.gateId, 'Duplicate M22 production gate.');
    ids.add(gate.gateId);
    if (!gate.runtimeRequired || !gate.blocksProduction) {
      fail(gate.gateId, 'Every M22 production gate must be runtime-required and production-blocking.');
    }
    if (gate.requiredEvidence.length === 0 || gate.blockingConditions.length === 0 || gate.requiredCommands.length === 0) {
      fail(gate.gateId, 'Every M22 gate requires evidence, blocking conditions and commands.');
    }
  }
}

export function assertM22EvidenceBinder(evidence: readonly M22GateEvidence[]): void {
  const remaining = new Set<string>(M22ProductionGateIds);
  for (const item of evidence) {
    remaining.delete(item.gateId);
    if (item.status !== 'PASSED') {
      fail(item.gateId, `M22 production evidence must be PASSED, received ${item.status}.`);
    }
    if (item.evidenceFiles.length === 0) {
      fail(item.gateId, 'Every M22 production gate must attach evidence files.');
    }
  }
  if (remaining.size > 0) {
    fail('M22-FINAL-PRODUCTION-GO-NOGO-DECISION', `Missing M22 evidence for: ${Array.from(remaining).join(', ')}`);
  }
}

export function assertM22LockedComplianceCarryForward(input: {
  architectureGatePassed: boolean;
  contractGatePassed: boolean;
  databaseFoundationGatePassed: boolean;
  auditM0M17Passed: boolean;
  priorM21PreflightPassed: boolean;
  lockedStackDeviationCount: number;
  lockedSpecDeviationCount: number;
}): void {
  const gates = input.architectureGatePassed && input.contractGatePassed && input.databaseFoundationGatePassed && input.auditM0M17Passed && input.priorM21PreflightPassed;
  if (!gates || input.lockedStackDeviationCount !== 0 || input.lockedSpecDeviationCount !== 0) {
    fail('M22-LOCKED-SPEC-ARCHITECTURE-STACK-BASELINE', 'Locked spec, architecture and stack must carry forward with zero deviations.');
  }
}

export function assertM22RuntimeEvidenceZeroDefect(input: M22RuntimeEvidenceSummary): void {
  const required = input.pnpmLockfilePresent && input.frozenInstallPassed && input.staticGatesPassed && input.migrationsPassed && input.seedPassed && input.dockerRuntimePassed && input.fullLifecycleE2ePassed && input.securitySmokePassed && input.makerCheckerPassed && input.performanceSloPassed && input.backupRestorePassed && input.observabilityPassed && input.postDeploymentSmokePassed && input.rollbackWindowPrepared;
  if (!required) {
    fail('M22-FINAL-PRODUCTION-GO-NOGO-DECISION', 'All runtime, database, Docker, security, performance, backup, observability and post-deployment evidence must pass.');
  }
  if (input.failedCriticalScenarios !== 0 || input.skippedCriticalScenarios !== 0) {
    fail('M22-FULL-LIFECYCLE-E2E-ZERO-FAIL-SKIP', 'Final GO requires zero failed and zero skipped critical runtime scenarios.');
  }
  if (input.unresolvedCriticalDefects !== 0) {
    fail('M22-FINAL-PRODUCTION-GO-NOGO-DECISION', 'Final GO requires zero unresolved critical defects.');
  }
  if (input.unresolvedHighRisksWithoutApproval !== 0) {
    fail('M22-DOCUMENTED-RISKS-OWNER-APPROVALS', 'High risks must be resolved or explicitly approved before GO.');
  }
}

export function assertM22ApprovalChain(input: M22ApprovalChain): void {
  const approved = input.productOwnerApproval && input.engineeringOwnerApproval && input.securityOwnerApproval && input.operationsOwnerApproval && input.rollbackOwnerNamed && input.dataBackupOwnerNamed && input.goNoGoMeetingRecorded;
  if (!approved) {
    fail('M22-DOCUMENTED-RISKS-OWNER-APPROVALS', 'Product, engineering, security, operations, rollback, backup and meeting approval evidence are required.');
  }
}

export function assertM22ProductionDecision(input: M22ProductionDecisionRecord): void {
  assertM22RuntimeEvidenceZeroDefect(input.runtimeEvidence);
  assertM22ApprovalChain(input.approvals);
  if (!input.releaseCandidateId || !input.sourceArchiveChecksum || !input.manifestChecksum || !input.evidenceBinderPath) {
    fail('M22-FINAL-PRODUCTION-GO-NOGO-DECISION', 'Release candidate ID, source checksum, manifest checksum and evidence binder path are mandatory.');
  }
  if (input.decision !== 'GO') {
    fail('M22-FINAL-PRODUCTION-GO-NOGO-DECISION', `Final production decision must be GO, received ${input.decision}.`);
  }
}

export function m22ProductionGoNoGoChecklist() {
  return M22ProductionGateCatalog.map((gate) => ({
    gateId: gate.gateId,
    domain: gate.domain,
    title: gate.title,
    requiredEvidence: [...gate.requiredEvidence],
    blockingConditions: [...gate.blockingConditions],
    requiredCommands: [...gate.requiredCommands],
    blocksProduction: gate.blocksProduction,
  }));
}
