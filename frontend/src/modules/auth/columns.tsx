import type { EntityColumnConfig } from '@/modules/masters/columns';

export const sessionColumns: EntityColumnConfig[] = [
  { key: 'device', label: 'Device' },
  { key: 'ip', label: 'IP' },
  { key: 'expiresAt', label: 'Expires' },
  { key: 'revokedAt', label: 'Revoked' },
];

export const authColumnSets = {
  sessionColumns,
} as const;
