import { describe, expect, it } from 'vitest';
import {
  assertR18TestCompletionManifest,
  R18CriticalWorkflowIds,
  R18CriticalWorkflowMatrix,
  R18TestCompletionManifest,
  R18TestLayerIds,
  R18TestLayerMatrix,
} from './r18-test-completion.contracts';

describe('R18 test completion manifest', () => {
  it('covers every required blueprint test layer and critical workflow', () => {
    expect(() => assertR18TestCompletionManifest()).not.toThrow();
    expect(R18TestLayerMatrix.map((layer) => layer.layerId)).toEqual(R18TestLayerIds);
    expect(R18CriticalWorkflowMatrix.map((workflow) => workflow.workflowId)).toEqual(R18CriticalWorkflowIds);
  });

  it('blocks production for every critical workflow until runtime evidence exists', () => {
    expect(R18TestCompletionManifest.sourceGateIsNotRuntimeCertification).toBe(true);
    expect(R18TestCompletionManifest.blocksProductionUntilRuntimeEvidence).toBe(true);
    for (const workflow of R18CriticalWorkflowMatrix) {
      expect(workflow.blocksProduction).toBe(true);
      expect(workflow.requiredRuntimeEvidence.length).toBeGreaterThan(0);
      expect(workflow.mustProve.join(' ')).not.toMatch(/todo|tbd|placeholder/i);
    }
  });
});
