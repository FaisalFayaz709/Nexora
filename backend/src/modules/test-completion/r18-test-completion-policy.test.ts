import { describe, expect, it } from 'vitest';
import {
  R18_TEST_COMPLETION_POLICY,
  assertR18CriticalWorkflowCoverage,
  assertR18NoMissingTestLayers,
  assertR18SourceGateCannotClaimProductionReady,
} from './r18-test-completion-policy';

describe('R18 backend test completion policy', () => {
  // sourceGateIsNotRuntimeCertification: true
  // blocksProductionUntilRuntimeEvidence: true
  it('covers blueprint test layers and critical workflow families', () => {
    expect(() => assertR18NoMissingTestLayers()).not.toThrow();
    expect(() => assertR18CriticalWorkflowCoverage()).not.toThrow();
    expect(R18_TEST_COMPLETION_POLICY.testLayers.length).toBeGreaterThanOrEqual(10);
    expect(R18_TEST_COMPLETION_POLICY.criticalWorkflows.length).toBeGreaterThanOrEqual(10);
  });

  it('prevents source-only evidence from becoming production-ready signoff', () => {
    expect(() => assertR18SourceGateCannotClaimProductionReady({
      runtimeExecuted: false,
      failed: 0,
      skippedCritical: 0,
    })).toThrow('cannot claim production readiness');
  });
});
