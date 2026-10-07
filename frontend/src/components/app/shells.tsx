import type { ReactNode } from 'react';
import { AppShell } from './app-shell';
import { AuthGuard, PortalGuard, TechnicianGuard, TenantGuard } from './guards';
import { OfflineProvider } from './offline-provider';
import { PermissionContextProvider } from './permission-context';

export function ErpRouteShell({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <AuthGuard>
        <TenantGuard>
          <PermissionContextProvider>{children}</PermissionContextProvider>
        </TenantGuard>
      </AuthGuard>
    </AppShell>
  );
}

export function PortalShell({ children }: { children: ReactNode }) {
  return (
    <PortalGuard>
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto max-w-6xl p-6">{children}</main>
      </div>
    </PortalGuard>
  );
}

export function TechnicianPwaShell({ children }: { children: ReactNode }) {
  return (
    <TechnicianGuard>
      <OfflineProvider>
        <div className="min-h-screen bg-background text-foreground sm:bg-muted/30">
          <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center justify-between">
              <span className="text-sm font-semibold">NEXORA Technician</span>
              <span className="rounded-full border px-2 py-1 text-xs">Offline queue ready</span>
            </div>
          </header>
          <main className="mx-auto max-w-3xl p-4">{children}</main>
        </div>
      </OfflineProvider>
    </TechnicianGuard>
  );
}
