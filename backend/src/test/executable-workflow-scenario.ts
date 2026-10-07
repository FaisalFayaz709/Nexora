import { describe, expect, it } from 'vitest';
import { RuntimeApiClient } from './api-client.js';
import { isRuntimeIntegrationEnabled, requireRuntimeEnv, runtimeTestTimeout } from './runtime-env.js';

export type RuntimeWorkflowMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface RuntimeWorkflowStep {
  readonly id: string;
  readonly method: RuntimeWorkflowMethod;
  readonly path: string;
  readonly body?: unknown;
  readonly idempotencyKey?: string;
  readonly allowedStatuses?: readonly number[];
  readonly captures?: readonly string[];
}

export interface RuntimeWorkflowDatabaseAssertion {
  readonly id: string;
  readonly description: string;
  readonly querySubject: string;
}

export interface ExecutableWorkflowScenario {
  readonly scenarioId: string;
  readonly title: string;
  readonly lockedBlueprintRequirement: string;
  readonly preconditions: readonly string[];
  readonly steps: readonly RuntimeWorkflowStep[];
  readonly databaseAssertions: readonly RuntimeWorkflowDatabaseAssertion[];
  readonly securityAssertions: readonly string[];
  readonly auditAssertions: readonly string[];
}

export interface ExecutableWorkflowResult {
  readonly scenarioId: string;
  readonly stepResults: readonly {
    readonly id: string;
    readonly method: RuntimeWorkflowMethod;
    readonly path: string;
    readonly status: number;
    readonly ok: boolean;
  }[];
}

function assertNoPlaceholder(value: string, fieldName: string) {
  expect(value, fieldName).not.toMatch(/todo|placeholder|tbd|not yet implemented/i);
}

export function assertExecutableWorkflowScenario(scenario: ExecutableWorkflowScenario) {
  expect(scenario.scenarioId).toMatch(/^[A-Z0-9][A-Z0-9._:-]+$/);
  assertNoPlaceholder(scenario.title, `${scenario.scenarioId} title`);
  assertNoPlaceholder(scenario.lockedBlueprintRequirement, `${scenario.scenarioId} blueprint requirement`);
  expect(scenario.preconditions.length, `${scenario.scenarioId} preconditions`).toBeGreaterThan(0);
  expect(scenario.steps.length, `${scenario.scenarioId} executable API steps`).toBeGreaterThan(0);
  expect(scenario.databaseAssertions.length, `${scenario.scenarioId} database assertions`).toBeGreaterThan(0);
  expect(scenario.auditAssertions.length, `${scenario.scenarioId} audit assertions`).toBeGreaterThan(0);

  for (const step of scenario.steps) {
    expect(step.id).toMatch(/^[A-Z0-9][A-Z0-9._:-]+$/);
    expect(step.path).toMatch(/^\/api\/v1\//);
    expect(step.allowedStatuses?.length ?? 0, `${scenario.scenarioId}/${step.id} allowed statuses`).toBeGreaterThan(0);
    if (step.method !== 'GET') {
      const isCommand = /\/(submit|approve|reject|return|send|cancel|receive|post|close|complete|assign|install|replace|retire|match|dispatch|start|check-in|check-out|validate|commit|rollback|create-rfq|publish|select|inspect|allocate|resolve|calculate|generate-work-order|read-all|rotate)(\/|$|-)/.test(step.path);
      const isCollectionCreate = step.method === 'POST' && !/:id/.test(step.path);
      expect(isCommand || isCollectionCreate, `${scenario.scenarioId}/${step.id} mutation must be an explicit command or collection create`).toBe(true);
    }
  }

  for (const assertion of scenario.databaseAssertions) {
    assertNoPlaceholder(assertion.description, `${scenario.scenarioId}/${assertion.id} database assertion`);
    expect(assertion.querySubject).toMatch(/^[A-Za-z][A-Za-z0-9]+$/);
  }
}

export async function executeApiWorkflowScenario(
  scenario: ExecutableWorkflowScenario,
  client = new RuntimeApiClient(),
): Promise<ExecutableWorkflowResult> {
  const stepResults = [];
  for (const step of scenario.steps) {
    const response = await client.request(step.method, step.path, {
      body: step.body,
      idempotencyKey: step.idempotencyKey,
    });
    const allowed = step.allowedStatuses ?? [200, 201, 202, 204];
    const ok = allowed.includes(response.status);
    stepResults.push({ id: step.id, method: step.method, path: step.path, status: response.status, ok });
    expect(response.status, `${scenario.scenarioId}/${step.id}`).toEqual(expect.any(Number));
    expect(response.status, `${scenario.scenarioId}/${step.id} must not be a server error`).toBeLessThan(500);
    expect(ok, `${scenario.scenarioId}/${step.id} expected one of ${allowed.join(', ')}, received ${response.status}`).toBe(true);
  }
  return { scenarioId: scenario.scenarioId, stepResults };
}

export function executableWorkflowSuite(title: string, scenarios: readonly ExecutableWorkflowScenario[]) {
  const runRuntime = isRuntimeIntegrationEnabled();

  describe(title, () => {
    it('defines machine-checkable executable workflow scenarios', () => {
      expect(scenarios.length).toBeGreaterThan(0);
      for (const scenario of scenarios) assertExecutableWorkflowScenario(scenario);
    });

    it.runIf(runRuntime)('has runtime environment for executable workflow scenarios', () => {
      requireRuntimeEnv(['DATABASE_URL', 'NEXORA_API_BASE_URL']);
    });

    for (const scenario of scenarios) {
      it.runIf(runRuntime)(`executes ${scenario.scenarioId}`, async () => {
        await executeApiWorkflowScenario(scenario);
      }, runtimeTestTimeout(60_000));
    }
  });
}
