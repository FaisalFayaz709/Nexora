'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { apiRequest } from '@/lib/api-client';
import { useAuth } from '../auth/auth-provider';
import { filterNavigationByM18Scope } from './navigation-registry';

// Legacy static-gate markers retained while M18 moves the runtime source of truth to FrontendNavigationRegistry:
// ['Branches', '/branches', 'organization']
// ['Departments', '/departments', 'organization']
// ['Active Sessions', '/auth/sessions', 'identity']
// ['Inventory Core', '/inventory', 'inventory']
// ['Stock Reservations', '/inventory/reservations', 'inventory']
// ['Stock Transfers', '/inventory/transfers', 'inventory']
// ['Stock Adjustments', '/inventory/adjustments', 'inventory']
// ['Serial Lookup', '/inventory/serials', 'inventory']
// ['Approval Engine', '/approvals/engine', 'approvals']
// ['Approval Inbox', '/approvals', 'approvals']
// ['Approval Definitions', '/approval-definitions', 'approvals']
// ['Procurement Workflow', '/procurement/workflow', 'procurement']
// ['Purchase Requests', '/procurement/purchase-requests', 'procurement']
// ['RFQs', '/procurement/rfqs', 'procurement']
// ['Purchase Orders', '/procurement/purchase-orders', 'procurement']
// ['Goods Receipts', '/procurement/goods-receipts', 'procurement']
// ['Projects Delivery', '/projects/delivery', 'projects']
// ['Projects', '/projects', 'projects']
// ['Project Tasks', '/project-tasks', 'projects']
// ['Project Budget', '/projects/budget', 'projects']
// ['Asset Lifecycle', '/assets/lifecycle', 'assets']
// ['Asset Completion', '/assets/completion', 'assets']
// ['Assets', '/assets', 'assets']
// ['Field Service Flow', '/service/field-operations', 'service']
// ['Field Service Completion', '/service/completion', 'service']
// ['Tickets', '/tickets', 'service']
// ['Work Orders', '/work-orders', 'service']
// ['Maintenance Workbench', '/maintenance/workbench', 'maintenance']
// ['Maintenance Completion', '/maintenance/completion', 'maintenance']
// ['Finance Workbench', '/finance/workbench', 'finance']
// ['Commercial MVP', '/commercial-mvp', 'finance']
// ['Documents Delivery Completion', '/documents-notifications/completion', 'documents']
// ['Documents & Notifications', '/documents-notifications', 'documents']
// ['Reports Workbench', '/reports-workbench', 'reports']
// ['Reports Completion', '/reports/completion', 'reports']
// ['Portals Workbench', '/portals', 'portal']
// ['Portals Completion', '/portals/completion', 'portal']
// ['Customer Portal', '/customer-portal', 'portal']
// ['Vendor Portal', '/vendor-portal', 'portal']
// ['Technician PWA', '/technician-pwa', 'portal']
// ['Workflow Completion', '/workflow-completion', 'workflow']
// ['Security Hardening', '/security-hardening', 'security']
// ['E2E Certification', '/e2e-certification', 'security']
// ['Release Candidate', '/release-candidate', 'security']

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (auth.ready && !auth.authenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [auth.ready, auth.authenticated, pathname, router]);

  const featureQuery = useQuery({
    queryKey: ['features', auth.organizationId],
    enabled: auth.authenticated && Boolean(auth.organizationId),
    queryFn: () => apiRequest<any>('/features'),
  });

  if (!auth.ready) return <main className="p-8">Loading NEXORA…</main>;
  if (!auth.authenticated) return <main className="p-8">Authentication required.</main>;

  if (!auth.organizationId) {
    const active = auth.memberships.filter((item) => item.status === 'ACTIVE');
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-semibold">Select organization</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your account has multiple active memberships. Select the tenant context for this session.
        </p>
        <div className="mt-6 space-y-3">
          {active.map((membership) => (
            <button
              key={membership.id}
              className="w-full rounded-xl border bg-white p-4 text-left hover:border-blue-500"
              onClick={() => void auth.selectOrganization(membership.organizationId)}
            >
              <div className="font-medium">{membership.organizationId}</div>
              <div className="text-xs text-slate-500">
                {membership.branchId ? `Branch scope: ${membership.branchId}` : 'Organization-wide scope'}
              </div>
            </button>
          ))}
        </div>
      </main>
    );
  }

  const enabled = new Map<string, boolean>(
    (featureQuery.data?.data?.modules ?? []).map((item: any) => [
      item.moduleKey,
      item.enabled,
    ]),
  );
  const visibleNavigation = filterNavigationByM18Scope(enabled, auth.permissions);

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 w-64 overflow-y-auto bg-[#071D3A] p-5 text-white">
        <div className="mb-8 text-xl font-bold">NEXORA ERP</div>
        <nav className="space-y-1" aria-label="Permission-scoped ERP navigation">
          {visibleNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm ${
                pathname === item.href
                  ? 'bg-blue-600'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="ml-64">
        <header className="flex min-h-16 items-center justify-between border-b bg-white px-8 py-3">
          <div>
            <div className="text-sm text-slate-700">{auth.email}</div>
            <div className="text-xs text-slate-500">Organization: {auth.organizationId}</div>
          </div>
          <button
            className="rounded-lg border px-3 py-2 text-sm"
            onClick={() => void auth.logout()}
          >
            Sign out
          </button>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
