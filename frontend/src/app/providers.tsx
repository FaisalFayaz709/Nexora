'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { AuthProvider } from '@/modules/auth/auth-provider';
import { createNexoraQueryClient } from '@/lib/query-client';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => createNexoraQueryClient());
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
