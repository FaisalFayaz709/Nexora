import { describe, expect, it } from 'vitest';
import { isFinalRuntimeCertification, isRuntimeIntegrationEnabled, requireRuntimeEnv } from './runtime-env.js';

export const runtimeAcceptanceCertificationMarkers = {
  integrationSwitch: 'RUN_INTEGRATION_TESTS',
  finalCertificationSwitch: 'RUNTIME_CERTIFICATION',
  pendingAutomationMarker: 'Runtime acceptance automation pending',
} as const;

export interface RuntimeAcceptanceExecutableEvidence {
  readonly type: 'api' | 'database' | 'workflow' | 'security' | 'concurrency' | 'frontend';
  readonly commands: readonly string[];
  readonly assertions: readonly string[];
}

export interface RuntimeAcceptanceRequirement {
  readonly name: string;
  readonly evidence: string;
  readonly scenarioId?: string;
  readonly executableEvidence?: RuntimeAcceptanceExecutableEvidence;
}

export interface RuntimeAcceptanceSuiteInput {
  readonly title: string;
  readonly requirements: readonly RuntimeAcceptanceRequirement[];
  readonly requiredEnv?: readonly Parameters<typeof requireRuntimeEnv>[0][number][];
}

export const runRuntimeAcceptance = isRuntimeIntegrationEnabled();

function looksPlaceholder(value: string) {
  return /not\s+yet\s+implemented|todo|placeholder|tbd/i.test(value);
}

function enforceM4ExecutableAcceptance() {
  return process.env.M4_ENFORCE_EXECUTABLE_ACCEPTANCE === '1';
}

export function runtimeAcceptanceSuite(input: RuntimeAcceptanceSuiteInput) {
  const requiredEnv = input.requiredEnv ?? ['DATABASE_URL', 'NEXORA_API_BASE_URL'];

  describe(input.title, () => {
    it('declares executable runtime acceptance requirements and evidence', () => {
      expect(input.requirements.length).toBeGreaterThan(0);
      for (const requirement of input.requirements) {
        expect(requirement.name.length).toBeGreaterThan(10);
        expect(requirement.evidence.length).toBeGreaterThan(10);
        expect(looksPlaceholder(requirement.name)).toBe(false);
        expect(looksPlaceholder(requirement.evidence)).toBe(false);
      }
    });

    it.runIf(runRuntimeAcceptance)('has the runtime environment needed by this acceptance suite', () => {
      requireRuntimeEnv(requiredEnv);
    });

    it.runIf(isFinalRuntimeCertification())('does not allow declarative acceptance specs to masquerade as final certification', () => {
      const missingScenarioIds = input.requirements.filter((requirement) => !requirement.scenarioId);
      if (missingScenarioIds.length > 0) {
        throw new Error(
          `${input.title} has ${missingScenarioIds.length} declarative acceptance requirement(s). ` +
          'A completion pass must replace them with executable scenario tests before final runtime certification.',
        );
      }
    });

    it.runIf(isFinalRuntimeCertification() && enforceM4ExecutableAcceptance())('requires machine-checkable M4 executable evidence, not narrative evidence only', () => {
      const missingExecutableEvidence = input.requirements.filter((requirement) => {
        const evidence = requirement.executableEvidence;
        return !evidence || evidence.commands.length === 0 || evidence.assertions.length === 0;
      });
      if (missingExecutableEvidence.length > 0) {
        throw new Error(
          `${input.title} has ${missingExecutableEvidence.length} narrative-only acceptance requirement(s). ` +
          'M4 requires executableEvidence.commands plus executableEvidence.assertions or a dedicated executableWorkflowSuite scenario.',
        );
      }
    });
  });
}
