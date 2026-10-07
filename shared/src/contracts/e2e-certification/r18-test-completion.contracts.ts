export const R18_TEST_COMPLETION = 'R18_TEST_COMPLETION' as const;

export const R18TestLayerIds = [
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
] as const;

export type R18TestLayerId = (typeof R18TestLayerIds)[number];

export const R18CriticalWorkflowIds = [
  'R18-PR-APPROVAL-RFQ-PO-GRN-STOCK',
  'R18-PROJECT-BOM-MATERIAL-REQUEST-PROCUREMENT',
  'R18-STOCK-RECEIPT-ASSET-INSTALLATION-QR',
  'R18-TICKET-WORK-ORDER-SERVICE-PARTS-CLOSE',
  'R18-INVOICE-APPROVAL-POST-PAYMENT-ALLOCATION',
  'R18-SUPPLIER-INVOICE-THREE-WAY-MATCH-PAYMENT',
  'R18-TECHNICIAN-OFFLINE-SYNC-REPLAY-CONFLICT',
  'R18-CROSS-TENANT-IDOR-MAKER-CHECKER',
  'R18-DOCUMENT-MINIO-REPORT-WORKER-EXPORT',
  'R18-FRONTEND-SHELL-FORM-GRID-WORKFLOW-STATES',
] as const;

export type R18CriticalWorkflowId = (typeof R18CriticalWorkflowIds)[number];

export interface R18TestLayerRequirement {
  readonly layerId: R18TestLayerId;
  readonly requiredEvidence: readonly string[];
  readonly sourceGate: string;
  readonly runtimeGate: string;
  readonly blocksProduction: boolean;
}

export interface R18CriticalWorkflowRequirement {
  readonly workflowId: R18CriticalWorkflowId;
  readonly domains: readonly string[];
  readonly mustProve: readonly string[];
  readonly requiredRuntimeEvidence: readonly string[];
  readonly blocksProduction: boolean;
}

export const R18TestLayerMatrix: readonly R18TestLayerRequirement[] = [
  {
    layerId: 'UNIT_BUSINESS_RULES',
    requiredEvidence: ['service policy tests', 'status transition tests', 'calculation tests'],
    sourceGate: 'backend/src/modules/**/*.service.test.ts and shared/src/**/*.test.ts',
    runtimeGate: 'pnpm test',
    blocksProduction: true,
  },
  {
    layerId: 'REPOSITORY_POSTGRES_INTEGRATION',
    requiredEvidence: ['Prisma repository integration tests', 'tenant filtering tests', 'transaction behavior tests'],
    sourceGate: 'backend/src/modules/**/*.integration.test.ts and database/tests/*.test.mjs',
    runtimeGate: 'RUN_INTEGRATION_TESTS=1 pnpm --filter @nexora/backend test',
    blocksProduction: true,
  },
  {
    layerId: 'FASTIFY_API_INTEGRATION',
    requiredEvidence: ['Fastify inject/API tests', 'validation and error-code tests', 'permission denial tests'],
    sourceGate: 'backend/src/modules/**/*integration.test.ts with API scenario ids',
    runtimeGate: 'RUN_INTEGRATION_TESTS=1 pnpm test',
    blocksProduction: true,
  },
  {
    layerId: 'CROSS_MODULE_WORKFLOW_INTEGRATION',
    requiredEvidence: ['PR-to-stock workflow tests', 'ticket-to-parts workflow tests', 'invoice-to-payment workflow tests'],
    sourceGate: 'backend/src/modules/test-completion/r18-critical-workflow-executable.integration.test.ts',
    runtimeGate: 'RUN_INTEGRATION_TESTS=1 RUNTIME_CERTIFICATION=1 pnpm --filter @nexora/backend test',
    blocksProduction: true,
  },
  {
    layerId: 'FRONTEND_COMPONENT_AND_HOOKS',
    requiredEvidence: ['DataTable tests', 'RHF/Zod form tests', 'API hook/idempotency tests', 'permission gate tests'],
    sourceGate: 'frontend/src/**/*.test.tsx and frontend/src/**/*.test.ts',
    runtimeGate: 'pnpm --filter @nexora/frontend test',
    blocksProduction: true,
  },
  {
    layerId: 'BROWSER_E2E_FULL_STACK',
    requiredEvidence: ['browser route trace', 'network command trace', 'workflow screenshots or traces'],
    sourceGate: 'tests/e2e/playwright/critical-workflows.spec.ts',
    runtimeGate: 'RUN_BROWSER_E2E=1 pnpm test:e2e:browser',
    blocksProduction: true,
  },
  {
    layerId: 'SECURITY_ABUSE_AUTHORIZATION',
    requiredEvidence: ['cross-tenant IDOR denial', 'maker-checker denial', 'portal scope denial', 'upload abuse denial'],
    sourceGate: 'backend/src/modules/security-hardening/*.test.ts',
    runtimeGate: 'RUN_INTEGRATION_TESTS=1 pnpm security:smoke:certify',
    blocksProduction: true,
  },
  {
    layerId: 'MIGRATION_SCHEMA_EVOLUTION',
    requiredEvidence: ['Prisma validate', 'migrate deploy', 'migration safety review', 'previous-snapshot migration test'],
    sourceGate: 'scripts/check-prisma-schema-migrations.mjs and database/tests/schema-foundation.test.mjs',
    runtimeGate: 'pnpm db:validate && pnpm db:migrate:deploy',
    blocksProduction: true,
  },
  {
    layerId: 'PERFORMANCE_CRITICAL_PATHS',
    requiredEvidence: ['stock ledger query budget', 'global search budget', 'concurrent receipt/reservation behavior'],
    sourceGate: 'backend/src/modules/operations/m21-performance-backup-observability-policy.test.ts',
    runtimeGate: 'RUN_PERFORMANCE_SMOKE=1 pnpm performance:smoke',
    blocksProduction: false,
  },
  {
    layerId: 'BACKUP_RESTORE_OPERATIONAL_RECOVERY',
    requiredEvidence: ['PostgreSQL backup', 'MinIO metadata/object restore', 'file reference verification'],
    sourceGate: 'scripts/backup-restore-certify.sh and docs/production/BACKUP_RESTORE_RUNBOOK.md',
    runtimeGate: 'pnpm backup-restore:certify',
    blocksProduction: true,
  },
] as const;

export const R18CriticalWorkflowMatrix: readonly R18CriticalWorkflowRequirement[] = [
  {
    workflowId: 'R18-PR-APPROVAL-RFQ-PO-GRN-STOCK',
    domains: ['procurement', 'approvals', 'inventory'],
    mustProve: ['approval state transition', 'maker-checker where configured', 'GRN + stock ledger transaction'],
    requiredRuntimeEvidence: ['API command trace', 'stock ledger rows', 'audit rows'],
    blocksProduction: true,
  },
  {
    workflowId: 'R18-PROJECT-BOM-MATERIAL-REQUEST-PROCUREMENT',
    domains: ['projects', 'procurement', 'inventory'],
    mustProve: ['BOM approval', 'material requirement creation', 'procurement handoff through facade'],
    requiredRuntimeEvidence: ['project timeline', 'material requirement row', 'procurement reference'],
    blocksProduction: true,
  },
  {
    workflowId: 'R18-STOCK-RECEIPT-ASSET-INSTALLATION-QR',
    domains: ['inventory', 'assets', 'service'],
    mustProve: ['serialized stock consumed', 'asset status changes to active', 'rotated QR token does not bypass authorization'],
    requiredRuntimeEvidence: ['serial history', 'asset history', 'QR denial/allow trace'],
    blocksProduction: true,
  },
  {
    workflowId: 'R18-TICKET-WORK-ORDER-SERVICE-PARTS-CLOSE',
    domains: ['service', 'inventory', 'assets'],
    mustProve: ['assigned technician only', 'service report required', 'parts consumption creates stock transaction'],
    requiredRuntimeEvidence: ['work order state trace', 'service report row', 'stock transaction row'],
    blocksProduction: true,
  },
  {
    workflowId: 'R18-INVOICE-APPROVAL-POST-PAYMENT-ALLOCATION',
    domains: ['finance', 'approvals'],
    mustProve: ['invoice approval/post command', 'balanced journal', 'idempotent payment allocation'],
    requiredRuntimeEvidence: ['invoice status trace', 'journal lines', 'single payment effect after retry'],
    blocksProduction: true,
  },
  {
    workflowId: 'R18-SUPPLIER-INVOICE-THREE-WAY-MATCH-PAYMENT',
    domains: ['procurement', 'finance'],
    mustProve: ['PO + GRN + supplier invoice comparison', 'matchStatus only', 'payable/payment posting'],
    requiredRuntimeEvidence: ['three-way match result', 'AP invoice row', 'payment allocation'],
    blocksProduction: true,
  },
  {
    workflowId: 'R18-TECHNICIAN-OFFLINE-SYNC-REPLAY-CONFLICT',
    domains: ['service', 'portal', 'inventory'],
    mustProve: ['tenant/technician scope', 'idempotent replay', 'stale/conflicting command rejection'],
    requiredRuntimeEvidence: ['offline-sync response', 'audit rows', 'dedupe rows'],
    blocksProduction: true,
  },
  {
    workflowId: 'R18-CROSS-TENANT-IDOR-MAKER-CHECKER',
    domains: ['identity', 'security', 'approvals', 'portals'],
    mustProve: ['cross-tenant reads denied', 'cross-tenant mutations denied', 'creator cannot self-approve high-risk transaction'],
    requiredRuntimeEvidence: ['403/404 traces', 'maker-checker rejection', 'audit log'],
    blocksProduction: true,
  },
  {
    workflowId: 'R18-DOCUMENT-MINIO-REPORT-WORKER-EXPORT',
    domains: ['documents', 'reports', 'worker'],
    mustProve: ['upload intent', 'complete upload', 'authorized download', 'report export worker output'],
    requiredRuntimeEvidence: ['MinIO object metadata', 'Document rows', 'ReportExecution row'],
    blocksProduction: true,
  },
  {
    workflowId: 'R18-FRONTEND-SHELL-FORM-GRID-WORKFLOW-STATES',
    domains: ['frontend', 'security'],
    mustProve: ['route-group shell', 'RHF/Zod form mapping', 'TanStack grid', 'forbidden/conflict/loading states'],
    requiredRuntimeEvidence: ['browser route trace', 'network trace', 'state screenshots/traces'],
    blocksProduction: true,
  },
] as const;

export const R18TestCompletionManifest = {
  pass: 'R18',
  name: 'Test Completion Pass',
  lockedArchitectureUnchanged: true,
  noStackReplacement: true,
  sourceGateIsNotRuntimeCertification: true,
  blocksProductionUntilRuntimeEvidence: true,
  testLayerCount: R18TestLayerMatrix.length,
  criticalWorkflowCount: R18CriticalWorkflowMatrix.length,
  requiredRuntimeEvidenceDirectory: 'certification-output/pass-r18-test-runtime',
  testLayers: R18TestLayerMatrix,
  criticalWorkflows: R18CriticalWorkflowMatrix,
} as const;

export function assertR18TestCompletionManifest() {
  if (R18TestLayerMatrix.length !== R18TestLayerIds.length) {
    throw new Error('R18 test layer matrix does not cover every required test layer.');
  }
  if (R18CriticalWorkflowMatrix.length !== R18CriticalWorkflowIds.length) {
    throw new Error('R18 critical workflow matrix does not cover every required critical workflow.');
  }
  for (const layer of R18TestLayerMatrix) {
    if (layer.requiredEvidence.length === 0 || !layer.sourceGate || !layer.runtimeGate) {
      throw new Error(`R18 layer ${layer.layerId} is missing source/runtime evidence.`);
    }
  }
  for (const workflow of R18CriticalWorkflowMatrix) {
    if (workflow.mustProve.length === 0 || workflow.requiredRuntimeEvidence.length === 0) {
      throw new Error(`R18 workflow ${workflow.workflowId} is missing runtime proof obligations.`);
    }
  }
}
