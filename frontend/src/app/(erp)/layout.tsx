import type { ReactNode } from 'react';
import { ErpRouteShell } from '@/components/app';

export default function ErpLayout({ children }: { children: ReactNode }) {
  return <ErpRouteShell>{children}</ErpRouteShell>;
}
