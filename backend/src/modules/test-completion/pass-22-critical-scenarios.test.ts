import { describe, expect, it } from 'vitest';
import { PASS_22_REQUIRED_LAYER_EVIDENCE } from './pass-22-testing-completion-policy.js';

describe('PASS_22 critical scenario runtime coverage policy', () => {
  it('keeps workflow integration as a production-blocking runtime layer', () => {
    const workflow = PASS_22_REQUIRED_LAYER_EVIDENCE.find((layer) => layer.layer === 'CROSS_MODULE_WORKFLOW_INTEGRATION');
    expect(workflow?.command).toContain('RUNTIME_CERTIFICATION=1');
    expect(workflow?.runtimeEvidencePath).toContain('workflow-integration');
    expect(workflow?.sourceEvidence).toContain('executable workflow scenarios');
  });
});
