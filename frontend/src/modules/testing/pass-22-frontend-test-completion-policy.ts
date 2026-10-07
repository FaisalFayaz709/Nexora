export const PASS_22_FRONTEND_TEST_COMPLETION = 'PASS_22_TESTING_COMPLETION_FRONTEND' as const;

export interface Pass22FrontendScreenTestObligation {
  readonly route: string;
  readonly requiredChecks: readonly string[];
}

export const PASS_22_FRONTEND_SCREEN_TEST_OBLIGATIONS: readonly Pass22FrontendScreenTestObligation[] = [
  { route: '/dashboard', requiredChecks: ['AppShell', 'TenantGuard', 'role dashboard widgets', 'loading/empty/error states'] },
  { route: '/procurement/purchase-requests', requiredChecks: ['TanStack Table', 'React Hook Form command dialog', 'permission-gated row actions'] },
  { route: '/inventory/stock-ledger', requiredChecks: ['immutable ledger grid', 'server-side pagination', 'filters'] },
  { route: '/projects', requiredChecks: ['create/detail/edit workflow', 'BOM/budget commands', 'timeline'] },
  { route: '/assets', requiredChecks: ['QR commands', 'lifecycle status badges', 'warranty/RMA actions'] },
  { route: '/work-orders', requiredChecks: ['technician status commands', 'service report parts field arrays', 'SLA state'] },
  { route: '/customer-invoices', requiredChecks: ['invoice items field arrays', 'post/send/cancel commands', 'idempotency notice'] },
  { route: '/reports', requiredChecks: ['report export job', 'saved views', 'permission-sensitive fields'] },
  { route: '/customer-portal/projects', requiredChecks: ['PortalShell', 'linked customer scope', 'no internal ERP navigation'] },
  { route: '/vendor-portal/rfqs', requiredChecks: ['PortalShell', 'linked vendor scope', 'quotation submit workflow'] },
  { route: '/technician/offline-queue', requiredChecks: ['TechnicianPwaShell', 'OfflineProvider', 'sync/replay/conflict states'] },
];

export function assertPass22FrontendTestObligations() {
  if (PASS_22_FRONTEND_SCREEN_TEST_OBLIGATIONS.length < 10) {
    throw new Error('PASS_22_FRONTEND_TEST_OBLIGATIONS_INCOMPLETE');
  }
  for (const obligation of PASS_22_FRONTEND_SCREEN_TEST_OBLIGATIONS) {
    if (!obligation.route.startsWith('/')) throw new Error(`PASS_22_INVALID_ROUTE:${obligation.route}`);
    if (obligation.requiredChecks.length < 3) throw new Error(`PASS_22_WEAK_FRONTEND_TEST_OBLIGATION:${obligation.route}`);
  }
  return true;
}
