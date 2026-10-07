export const PASS_22_TESTING_COMPLETION = 'PASS_22_TESTING_COMPLETION' as const;

export type Pass22LayerStatus = 'SOURCE_LOCKED' | 'RUNTIME_PASSED' | 'RUNTIME_BLOCKED';

export interface Pass22LayerEvidence {
  readonly layer: string;
  readonly command: string;
  readonly sourceEvidence: readonly string[];
  readonly runtimeEvidencePath: string;
  readonly status: Pass22LayerStatus;
}

export interface Pass22ReleaseDecisionInput {
  readonly lockfilePresent: boolean;
  readonly frozenInstallPassed: boolean;
  readonly typecheckPassed: boolean;
  readonly lintPassed: boolean;
  readonly unitTestsPassed: boolean;
  readonly integrationTestsPassed: boolean;
  readonly workflowTestsPassed: boolean;
  readonly browserE2ePassed: boolean;
  readonly securityTestsPassed: boolean;
  readonly migrationTestsPassed: boolean;
  readonly performanceSmokePassed: boolean;
  readonly backupRestorePassed: boolean;
  readonly dockerRuntimePassed: boolean;
  readonly evidenceArtifactsRecorded: boolean;
}

export const PASS_22_REQUIRED_LAYER_EVIDENCE: readonly Pass22LayerEvidence[] = [
  { layer: 'UNIT_BUSINESS_RULES', command: 'pnpm test', sourceEvidence: ['backend service tests', 'shared contract tests'], runtimeEvidencePath: 'certification-output/pass-22/runtime/unit-tests.json', status: 'SOURCE_LOCKED' },
  { layer: 'REPOSITORY_POSTGRES_INTEGRATION', command: 'RUN_INTEGRATION_TESTS=1 pnpm test', sourceEvidence: ['repository integration tests', 'database schema tests'], runtimeEvidencePath: 'certification-output/pass-22/runtime/repository-integration.json', status: 'SOURCE_LOCKED' },
  { layer: 'FASTIFY_API_INTEGRATION', command: 'RUN_INTEGRATION_TESTS=1 pnpm --filter @nexora/backend test', sourceEvidence: ['module API integration tests'], runtimeEvidencePath: 'certification-output/pass-22/runtime/api-integration.json', status: 'SOURCE_LOCKED' },
  { layer: 'CROSS_MODULE_WORKFLOW_INTEGRATION', command: 'RUNTIME_CERTIFICATION=1 RUN_INTEGRATION_TESTS=1 pnpm --filter @nexora/backend test', sourceEvidence: ['executable workflow scenarios'], runtimeEvidencePath: 'certification-output/pass-22/runtime/workflow-integration.json', status: 'SOURCE_LOCKED' },
  { layer: 'FRONTEND_COMPONENT_AND_HOOKS', command: 'pnpm --filter @nexora/frontend test', sourceEvidence: ['frontend component and hook tests'], runtimeEvidencePath: 'certification-output/pass-22/runtime/frontend-tests.json', status: 'SOURCE_LOCKED' },
  { layer: 'BROWSER_E2E_FULL_STACK', command: 'RUN_BROWSER_E2E=1 pnpm test:e2e:browser', sourceEvidence: ['Playwright specs'], runtimeEvidencePath: 'certification-output/pass-22/runtime/browser-e2e.json', status: 'SOURCE_LOCKED' },
  { layer: 'SECURITY_ABUSE_AUTHORIZATION', command: 'SECURITY_SMOKE=1 pnpm security:smoke:certify', sourceEvidence: ['security smoke matrix'], runtimeEvidencePath: 'certification-output/pass-22/runtime/security-smoke.json', status: 'SOURCE_LOCKED' },
  { layer: 'MIGRATION_SCHEMA_EVOLUTION', command: 'pnpm db:validate && pnpm db:migrate:deploy && pnpm db:seed', sourceEvidence: ['Prisma schema/migration checks'], runtimeEvidencePath: 'certification-output/pass-22/runtime/migration-seed.json', status: 'SOURCE_LOCKED' },
  { layer: 'PERFORMANCE_CRITICAL_PATHS', command: 'RUN_PERFORMANCE_SMOKE=1 pnpm performance:smoke', sourceEvidence: ['performance runbook and smoke placeholders'], runtimeEvidencePath: 'certification-output/pass-22/runtime/performance-smoke.json', status: 'SOURCE_LOCKED' },
  { layer: 'BACKUP_RESTORE_OPERATIONAL_RECOVERY', command: 'bash scripts/backup-restore-certify.sh', sourceEvidence: ['backup restore certification script'], runtimeEvidencePath: 'certification-output/pass-22/runtime/backup-restore.log', status: 'SOURCE_LOCKED' },
];

const PASS_22_STRICT_RUNTIME_FIELDS: readonly (keyof Pass22ReleaseDecisionInput)[] = [
  'lockfilePresent',
  'frozenInstallPassed',
  'typecheckPassed',
  'lintPassed',
  'unitTestsPassed',
  'integrationTestsPassed',
  'workflowTestsPassed',
  'browserE2ePassed',
  'securityTestsPassed',
  'migrationTestsPassed',
  'performanceSmokePassed',
  'backupRestorePassed',
  'dockerRuntimePassed',
  'evidenceArtifactsRecorded',
];

export function assertPass22LayerEvidenceComplete(layers = PASS_22_REQUIRED_LAYER_EVIDENCE) {
  const layerNames = new Set(layers.map((layer) => layer.layer));
  for (const required of [
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
  ]) {
    if (!layerNames.has(required)) throw new Error(`PASS_22_TEST_LAYER_MISSING:${required}`);
  }
  for (const layer of layers) {
    if (!layer.command || !layer.runtimeEvidencePath || !layer.sourceEvidence.length) {
      throw new Error(`PASS_22_TEST_LAYER_INCOMPLETE:${layer.layer}`);
    }
  }
  return true;
}

export function evaluatePass22TestingReleaseDecision(input: Pass22ReleaseDecisionInput) {
  const missing = PASS_22_STRICT_RUNTIME_FIELDS.filter((field) => input[field] !== true);
  return {
    pass: PASS_22_TESTING_COMPLETION,
    status: missing.length === 0 ? 'GO_TESTING_RUNTIME_CERTIFIED' : 'HOLD_TESTING_RUNTIME_EVIDENCE_REQUIRED',
    missing,
    sourceGateIsNotRuntimeCertification: true,
    cannotClaimProductionReadiness: missing.length > 0,
  } as const;
}
