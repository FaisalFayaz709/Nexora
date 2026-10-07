export const PASS_R17_BACKEND_BOUNDARY_TRANSACTION_AUDIT = 'PASS_R17_BACKEND_BOUNDARY_TRANSACTION_AUDIT' as const;

export type BackendBoundaryRuleSeverity = 'blocker' | 'advisory';

export interface BackendBoundaryRule {
  readonly id: string;
  readonly severity: BackendBoundaryRuleSeverity;
  readonly requirement: string;
  readonly sourceExpectation: string;
}

export const backendBoundaryTransactionRules: readonly BackendBoundaryRule[] = [
  {
    id: 'R17-ROUTE-CONTROLLER-NO-DB',
    severity: 'blocker',
    requirement: 'Routes and controllers never access Prisma, TransactionClient, raw SQL or database clients directly.',
    sourceExpectation: 'Only repositories import the runtime prisma client; services may coordinate transactions through withTransaction.',
  },
  {
    id: 'R17-CROSS-MODULE-FACADE-ONLY',
    severity: 'blocker',
    requirement: 'A backend module cannot import another module repository, controller or private service.',
    sourceExpectation: 'Synchronous cross-domain collaboration imports only the target module public index/facade surface.',
  },
  {
    id: 'R17-CRITICAL-TRANSACTION-BOUNDARY',
    severity: 'blocker',
    requirement: 'Critical stock, approval, asset, work-order, finance and accounting state changes stay inside PostgreSQL transactions.',
    sourceExpectation: 'Critical command services use withTransaction or a transactional facade such as NumberSequenceFacade.withBusinessNumber.',
  },
  {
    id: 'R17-NO-ASYNC-SOURCE-OF-TRUTH',
    severity: 'blocker',
    requirement: 'BullMQ/events cannot be the source of truth for stock balances, invoice balances, approval state, accounting postings or work-order close state.',
    sourceExpectation: 'Queues are limited to non-critical after-commit work such as PDFs, email, notifications, exports, analytics and webhooks.',
  },
  {
    id: 'R17-TENANT-BRANCH-AUDIT',
    severity: 'blocker',
    requirement: 'Tenant-owned mutations enforce organization scope, branch/resource scope where applicable and emit stable audit actions.',
    sourceExpectation: 'Services resolve TenantRequestContext, pass organizationId to repositories/facades and append AuditWriter events for critical commands.',
  },
  {
    id: 'R17-FRONTEND-BACKEND-SEPARATION',
    severity: 'blocker',
    requirement: 'Frontend remains a Next.js TypeScript client/presentation layer and never imports backend/database/server-only code.',
    sourceExpectation: 'Frontend calls Fastify /api/v1 through centralized API/query clients only.',
  },
];

export const criticalTransactionalWorkflows = [
  'purchase approval',
  'purchase order approval',
  'goods receipt',
  'stock transfer dispatch/receive',
  'stock adjustment posting',
  'stock count variance posting',
  'asset installation/replacement/retirement',
  'work-order completion with service report and parts consumption',
  'customer invoice approval/post/cancel',
  'supplier invoice three-way match/approval',
  'payment posting and allocation',
  'journal posting',
  'landed-cost posting',
  'tax transaction recording',
  'bank reconciliation close',
  'technician offline-sync command application',
] as const;

export function isCriticalTransactionalWorkflow(workflow: string): boolean {
  const normalized = workflow.trim().toLowerCase();
  return criticalTransactionalWorkflows.some((item) => item === normalized);
}
