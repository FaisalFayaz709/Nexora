import { describe, expect, it } from 'vitest';
import {
  PASS_22_CRITICAL_SCENARIOS,
  PASS_22_RUNTIME_EVIDENCE,
  PASS_22_TEST_LAYERS,
  PASS_22_TESTING_COMPLETION,
  assertPass22TestCompletionCatalog,
} from './pass-22-testing-completion.contracts.js';

describe('PASS_22_TESTING_COMPLETION shared contracts', () => {
  it('locks every blueprint testing layer', () => {
    expect(PASS_22_TESTING_COMPLETION).toBe('PASS_22_TESTING_COMPLETION');
    expect(PASS_22_TEST_LAYERS).toEqual([
      'UNIT_BUSINESS_RULES',
      'REPOSITORY_POSTGRES_INTEGRATION',
      'FASTIFY_API_INTEGRATION',
      'CROSS_MODULE_WORKFLOW_INTEGRATION',
      'FRONTEND_COMPONENT_AND_HOOKS',
      'BROWSER_E2E_FULL_STACK',
      'SECURITY_ABUSE_AUTHORIZATION',
      'MIGRATION_SCHEMA_EVOLUTION',
      'PERFORMANCE_CRITICAL_PATHS',
      'BACKUP_RESTORE_OPERATIONAL_RECOVERY',
    ]);
  });

  it('locks critical lifecycle scenarios and source-only honesty', () => {
    const result = assertPass22TestCompletionCatalog();
    expect(result.layers).toBe(10);
    expect(result.scenarios).toBeGreaterThanOrEqual(11);
    expect(result.sourceGateIsNotRuntimeCertification).toBe(true);
    expect(result.blocksProductionUntilRuntimeEvidence).toBe(true);
    expect(PASS_22_CRITICAL_SCENARIOS.map((s) => s.scenarioId)).toContain('PASS22-PROCUREMENT-PR-RFQ-PO-GRN-STOCK');
    expect(PASS_22_CRITICAL_SCENARIOS.map((s) => s.scenarioId)).toContain('PASS22-FULL-LIFECYCLE-DASHBOARD-PROFITABILITY');
  });

  it('requires runtime evidence for every layer before production GO', () => {
    for (const evidence of PASS_22_RUNTIME_EVIDENCE) {
      expect(evidence.blocksProduction).toBe(true);
      expect(evidence.runtimeExecuted).toBe(false);
      expect(evidence.evidencePath).toContain('certification-output/pass-22/runtime/');
    }
  });
});
