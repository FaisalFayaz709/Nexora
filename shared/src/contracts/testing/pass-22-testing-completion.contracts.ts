import { z } from 'zod';

export const PASS_22_TESTING_COMPLETION = 'PASS_22_TESTING_COMPLETION' as const;

export const Pass22TestLayerSchema = z.enum([
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

export type Pass22TestLayer = z.infer<typeof Pass22TestLayerSchema>;

export const Pass22RuntimeEvidenceSchema = z.object({
  layer: Pass22TestLayerSchema,
  command: z.string().min(3),
  requiredEnvironment: z.array(z.string()).default([]),
  evidencePath: z.string().min(3),
  blocksProduction: z.literal(true),
  runtimeExecuted: z.boolean(),
});

export const Pass22CriticalScenarioSchema = z.object({
  scenarioId: z.string().regex(/^PASS22-/),
  title: z.string().min(8),
  apiCoverage: z.array(z.string().startsWith('/api/v1/')).min(1),
  dataAssertions: z.array(z.string().min(5)).min(1),
  auditAssertions: z.array(z.string().min(5)).min(1),
  securityAssertions: z.array(z.string().min(5)).min(1),
  frontendCoverage: z.array(z.string().min(2)).min(1),
});

export const PASS_22_TEST_LAYERS: readonly Pass22TestLayer[] = [
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
];

export const PASS_22_CRITICAL_SCENARIOS = [
  {
    scenarioId: 'PASS22-LOGIN-CORE-PLATFORM',
    title: 'Login, membership resolution, RBAC, session and admin audit workflow',
    apiCoverage: ['/api/v1/auth/login', '/api/v1/auth/me', '/api/v1/users', '/api/v1/roles'],
    dataAssertions: ['Session is revocable and membership supplies organization/branch scope'],
    auditAssertions: ['Role, permission, user and session administrative changes create audit evidence'],
    securityAssertions: ['Unauthorized roles are denied and frontend checks are never the security authority'],
    frontendCoverage: ['/dashboard', '/administration/users', '/administration/roles'],
  },
  {
    scenarioId: 'PASS22-CUSTOMER-PROJECT-BOM-MATERIAL-REQUEST',
    title: 'Customer, site, project, BOM, budget and material request workflow',
    apiCoverage: ['/api/v1/customers', '/api/v1/customer-sites', '/api/v1/projects', '/api/v1/projects/:id/bom', '/api/v1/projects/:id/material-request'],
    dataAssertions: ['Project links customer/site/contract context and creates downstream material requirement'],
    auditAssertions: ['Project/BOM/material request status transitions are traceable'],
    securityAssertions: ['Project data remains tenant scoped and financial costing is permission gated'],
    frontendCoverage: ['/customers', '/projects', '/projects/[id]'],
  },
  {
    scenarioId: 'PASS22-PROCUREMENT-PR-RFQ-PO-GRN-STOCK',
    title: 'Purchase request through RFQ, supplier quotation, PO, GRN, inspection and stock ledger',
    apiCoverage: ['/api/v1/purchase-requests', '/api/v1/rfqs', '/api/v1/supplier-quotations', '/api/v1/purchase-orders', '/api/v1/goods-receipts'],
    dataAssertions: ['GRN accepted quantities update stock balance and immutable ledger without over receiving'],
    auditAssertions: ['PR approval, supplier selection, PO approval and GRN receive produce audit events'],
    securityAssertions: ['Maker-checker and vendor approval controls block unauthorized procurement actions'],
    frontendCoverage: ['/procurement/purchase-requests', '/procurement/rfqs', '/procurement/purchase-orders', '/procurement/grns'],
  },
  {
    scenarioId: 'PASS22-ASSET-INSTALLATION-QR-MAINTENANCE',
    title: 'Serialized stock installation into asset with QR, warranty and maintenance plan',
    apiCoverage: ['/api/v1/assets/register-from-stock', '/api/v1/assets/:id/install', '/api/v1/assets/:id/qr/rotate', '/api/v1/maintenance/plans'],
    dataAssertions: ['Installed serial no longer remains available stock and asset history records lifecycle events'],
    auditAssertions: ['Install, QR rotation, warranty and maintenance setup create audit/history evidence'],
    securityAssertions: ['QR token does not bypass authenticated authorization or tenant scope'],
    frontendCoverage: ['/assets', '/assets/[id]', '/maintenance/plans'],
  },
  {
    scenarioId: 'PASS22-TICKET-WORKORDER-SERVICE-PARTS-CLOSE',
    title: 'Ticket, SLA, work order, technician status, service report, parts and close workflow',
    apiCoverage: ['/api/v1/tickets', '/api/v1/work-orders', '/api/v1/work-orders/:id/service-report', '/api/v1/work-orders/:id/complete'],
    dataAssertions: ['Consumed service parts create stock transactions and asset service history'],
    auditAssertions: ['Assignment, technician status, report and closure actions are traceable'],
    securityAssertions: ['Only assigned technician/authorized service users can execute technician commands'],
    frontendCoverage: ['/tickets', '/work-orders', '/technician/jobs'],
  },
  {
    scenarioId: 'PASS22-FINANCE-INVOICE-POST-PAYMENT-AGING',
    title: 'Customer invoice approval, posting, payment allocation and AR aging workflow',
    apiCoverage: ['/api/v1/customer-invoices', '/api/v1/customer-invoices/:id/post', '/api/v1/payments', '/api/v1/finance/receivables'],
    dataAssertions: ['Payment allocation reconciles invoice balance and journal posting in one transaction'],
    auditAssertions: ['Invoice approve/post/send/cancel and payment actions create stable audit names'],
    securityAssertions: ['Idempotency prevents duplicate payment financial effects'],
    frontendCoverage: ['/customer-invoices', '/payments', '/finance/receivables'],
  },
  {
    scenarioId: 'PASS22-SUPPLIER-INVOICE-THREE-WAY-MATCH',
    title: 'Supplier invoice, PO, GRN, three-way match, AP approval and payment workflow',
    apiCoverage: ['/api/v1/supplier-invoices', '/api/v1/supplier-invoices/:id/match', '/api/v1/supplier-invoices/:id/approve', '/api/v1/finance/payables'],
    dataAssertions: ['Supplier invoice totals are checked against PO and GRN quantities before payment'],
    auditAssertions: ['Three-way match and supplier invoice approval produce finance audit evidence'],
    securityAssertions: ['Invoice amount greater than PO requires control handling before approval'],
    frontendCoverage: ['/supplier-invoices', '/finance/payables'],
  },
  {
    scenarioId: 'PASS22-DOCUMENT-MINIO-REPORT-WORKER',
    title: 'Document upload intent, MinIO completion, notification, report export and webhook worker workflow',
    apiCoverage: ['/api/v1/documents/upload-intent', '/api/v1/documents/complete-upload', '/api/v1/reports/exports', '/api/v1/integration-webhooks'],
    dataAssertions: ['Document metadata links to business subject and worker side effects are idempotent'],
    auditAssertions: ['Document completion, report export and webhook delivery attempts are traceable'],
    securityAssertions: ['Private bucket, MIME, extension, checksum and tenant object-key prefix controls are enforced'],
    frontendCoverage: ['/documents', '/reports', '/integrations/webhooks'],
  },
  {
    scenarioId: 'PASS22-PORTAL-SCOPES-OFFLINE-SYNC',
    title: 'Customer/vendor/technician portal scoping plus offline sync replay and conflict handling',
    apiCoverage: ['/api/v1/portal/customer/dashboard', '/api/v1/portal/vendor/dashboard', '/api/v1/portal/technician/offline-sync'],
    dataAssertions: ['Offline commands apply idempotently and reject stale/conflicting payload replays'],
    auditAssertions: ['Technician offline commands and portal confirmations create traceable records'],
    securityAssertions: ['Customer, vendor and technician users only see linked/assigned data'],
    frontendCoverage: ['/customer-portal/projects', '/vendor-portal/rfqs', '/technician/offline-queue'],
  },
  {
    scenarioId: 'PASS22-SECURITY-CROSS-TENANT-MAKER-CHECKER',
    title: 'Cross-tenant denial, privilege escalation prevention and maker-checker abuse suite',
    apiCoverage: ['/api/v1/audit-logs', '/api/v1/approvals/inbox', '/api/v1/workflow-rules/evaluate'],
    dataAssertions: ['Tenant-owned records never leak across organizationId boundaries'],
    auditAssertions: ['Denied high-risk operations and approval actions are auditable where policy requires'],
    securityAssertions: ['Creator cannot self approve high-risk transactions and IDOR attempts are denied'],
    frontendCoverage: ['/approvals', '/audit-logs', '/workflow-rules'],
  },
  {
    scenarioId: 'PASS22-FULL-LIFECYCLE-DASHBOARD-PROFITABILITY',
    title: 'Full lifecycle acceptance from customer demand to profitability dashboard evidence',
    apiCoverage: ['/api/v1/search', '/api/v1/calendar', '/api/v1/projects/:id/costing', '/api/v1/reports'],
    dataAssertions: ['Lifecycle records answer vendor, warehouse, technician, warranty, failure, cost and unpaid invoice questions'],
    auditAssertions: ['Timeline, audit and report evidence links every lifecycle stage'],
    securityAssertions: ['Reports, global search and dashboards are tenant/RBAC/branch filtered'],
    frontendCoverage: ['/dashboard', '/reports', '/search', '/calendar'],
  },
] as const;

export const PASS_22_RUNTIME_EVIDENCE: readonly z.infer<typeof Pass22RuntimeEvidenceSchema>[] = [
  { layer: 'UNIT_BUSINESS_RULES', command: 'pnpm test', requiredEnvironment: [], evidencePath: 'certification-output/pass-22/runtime/unit-tests.json', blocksProduction: true, runtimeExecuted: false },
  { layer: 'REPOSITORY_POSTGRES_INTEGRATION', command: 'RUN_INTEGRATION_TESTS=1 pnpm test', requiredEnvironment: ['DATABASE_URL'], evidencePath: 'certification-output/pass-22/runtime/repository-integration.json', blocksProduction: true, runtimeExecuted: false },
  { layer: 'FASTIFY_API_INTEGRATION', command: 'RUN_INTEGRATION_TESTS=1 pnpm --filter @nexora/backend test', requiredEnvironment: ['DATABASE_URL', 'REDIS_URL'], evidencePath: 'certification-output/pass-22/runtime/api-integration.json', blocksProduction: true, runtimeExecuted: false },
  { layer: 'CROSS_MODULE_WORKFLOW_INTEGRATION', command: 'RUNTIME_CERTIFICATION=1 RUN_INTEGRATION_TESTS=1 pnpm --filter @nexora/backend test', requiredEnvironment: ['DATABASE_URL', 'REDIS_URL', 'MINIO_ENDPOINT'], evidencePath: 'certification-output/pass-22/runtime/workflow-integration.json', blocksProduction: true, runtimeExecuted: false },
  { layer: 'FRONTEND_COMPONENT_AND_HOOKS', command: 'pnpm --filter @nexora/frontend test', requiredEnvironment: [], evidencePath: 'certification-output/pass-22/runtime/frontend-tests.json', blocksProduction: true, runtimeExecuted: false },
  { layer: 'BROWSER_E2E_FULL_STACK', command: 'RUN_BROWSER_E2E=1 pnpm test:e2e:browser', requiredEnvironment: ['NEXORA_WEB_BASE_URL', 'NEXORA_API_BASE_URL'], evidencePath: 'certification-output/pass-22/runtime/browser-e2e.json', blocksProduction: true, runtimeExecuted: false },
  { layer: 'SECURITY_ABUSE_AUTHORIZATION', command: 'SECURITY_SMOKE=1 pnpm security:smoke:certify', requiredEnvironment: ['NEXORA_API_BASE_URL'], evidencePath: 'certification-output/pass-22/runtime/security-smoke.json', blocksProduction: true, runtimeExecuted: false },
  { layer: 'MIGRATION_SCHEMA_EVOLUTION', command: 'pnpm db:validate && pnpm db:migrate:deploy && pnpm db:seed', requiredEnvironment: ['DATABASE_URL'], evidencePath: 'certification-output/pass-22/runtime/migration-seed.json', blocksProduction: true, runtimeExecuted: false },
  { layer: 'PERFORMANCE_CRITICAL_PATHS', command: 'RUN_PERFORMANCE_SMOKE=1 pnpm performance:smoke', requiredEnvironment: ['NEXORA_API_BASE_URL'], evidencePath: 'certification-output/pass-22/runtime/performance-smoke.json', blocksProduction: true, runtimeExecuted: false },
  { layer: 'BACKUP_RESTORE_OPERATIONAL_RECOVERY', command: 'bash scripts/backup-restore-certify.sh', requiredEnvironment: ['Docker Compose runtime'], evidencePath: 'certification-output/pass-22/runtime/backup-restore.log', blocksProduction: true, runtimeExecuted: false },
];

export function assertPass22TestCompletionCatalog() {
  PASS_22_TEST_LAYERS.forEach((layer) => Pass22TestLayerSchema.parse(layer));
  PASS_22_CRITICAL_SCENARIOS.forEach((scenario) => Pass22CriticalScenarioSchema.parse(scenario));
  PASS_22_RUNTIME_EVIDENCE.forEach((evidence) => Pass22RuntimeEvidenceSchema.parse(evidence));
  return {
    pass: PASS_22_TESTING_COMPLETION,
    layers: PASS_22_TEST_LAYERS.length,
    scenarios: PASS_22_CRITICAL_SCENARIOS.length,
    runtimeEvidenceItems: PASS_22_RUNTIME_EVIDENCE.length,
    sourceGateIsNotRuntimeCertification: true,
    blocksProductionUntilRuntimeEvidence: true,
  };
}
