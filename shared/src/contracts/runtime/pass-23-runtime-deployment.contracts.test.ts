import { describe, expect, it } from 'vitest';
import { PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION_CONTRACT } from './pass-23-runtime-deployment.contracts.js';

describe('PASS_23 runtime deployment contract', () => {
  it('locks the coordinated Docker runtime topology and Fastify API boundary', () => {
    expect(PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION_CONTRACT.requiredRuntimeTopology).toContain('api');
    expect(PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION_CONTRACT.requiredRuntimeTopology).toContain('worker');
    expect(PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION_CONTRACT.requiredRuntimeTopology).toContain('nginx');
    expect(PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION_CONTRACT.lockedApiBoundary).toContain('/api/v1');
    expect(PASS_23_RUNTIME_DEPLOYMENT_CERTIFICATION_CONTRACT.sourceOnlyWarning).toContain('does not equal Docker/runtime GO');
  });
});
