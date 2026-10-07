'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type OfflineQueueState = {
  pendingCommands: number;
  lastSyncAt: string | null;
  syncBlocked: boolean;
  setPendingCommands(count: number): void;
  markSynced(at?: string): void;
};

const OfflineQueueContext = createContext<OfflineQueueState | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [pendingCommands, setPendingCommands] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const value = useMemo<OfflineQueueState>(
    () => ({
      pendingCommands,
      lastSyncAt,
      syncBlocked: pendingCommands > 0 && !lastSyncAt,
      setPendingCommands,
      markSynced(at = new Date().toISOString()) {
        setLastSyncAt(at);
        setPendingCommands(0);
      },
    }),
    [lastSyncAt, pendingCommands],
  );

  return <OfflineQueueContext.Provider value={value}>{children}</OfflineQueueContext.Provider>;
}

export function useOfflineQueue() {
  const value = useContext(OfflineQueueContext);
  if (!value) throw new Error('OfflineProvider missing');
  return value;
}
