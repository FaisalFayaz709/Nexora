import type { ReactNode } from 'react';
import { TechnicianPwaShell } from '@/components/app';

export default function TechnicianLayout({ children }: { children: ReactNode }) {
  return <TechnicianPwaShell>{children}</TechnicianPwaShell>;
}
