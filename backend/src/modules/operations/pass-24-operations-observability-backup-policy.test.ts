import { describe, expect, it } from 'vitest';
import {
  assertPass24OperationsReadinessCatalog,
  assertPass24ProductionOperationsGo,
  evaluatePass24OperationsDecision,
} from './pass-24-operations-observability-backup-policy.js';

describe('PASS 24 operations observability backup policy', () => {
  it('keeps the operations evidence catalog complete and production blocking', () => {
    expect(() => assertPass24OperationsReadinessCatalog()).not.toThrow();
  });

  it('refuses production GO when runtime evidence is missing', () => {
    const decision = evaluatePass24OperationsDecision({
      sourceGatePassed: true,
      lockfilePresent: false,
      frozenInstallPassed: false,
      dockerRuntimePassed: false,
      runtimeEvidencePresent: false,
      performanceEvidencePassed: false,
      backupRestoreEvidencePassed: false,
      observabilityEvidencePassed: false,
      queueBackpressureEvidencePassed: false,
      incidentDrEvidencePassed: false,
    });

    expect(decision.decision).toBe('HOLD_OPERATIONS_RUNTIME_EVIDENCE_REQUIRED');
    expect(decision.cannotClaimProductionReadiness).toBe(true);
    expect(decision.sourceGateIsNotRuntimeCertification).toBe(true);
  });

  it('allows GO only after every runtime operations evidence set passes', () => {
    expect(() => assertPass24ProductionOperationsGo({
      sourceGatePassed: true,
      lockfilePresent: true,
      frozenInstallPassed: true,
      dockerRuntimePassed: true,
      runtimeEvidencePresent: true,
      performanceEvidencePassed: true,
      backupRestoreEvidencePassed: true,
      observabilityEvidencePassed: true,
      queueBackpressureEvidencePassed: true,
      incidentDrEvidencePassed: true,
    })).not.toThrow();
  });
});
