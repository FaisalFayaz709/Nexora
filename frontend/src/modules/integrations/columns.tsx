'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge, Button } from '@/components/ui';

export type IntegrationWebhookRow = {
  id: string;
  eventType: string;
  targetUrlHash: string;
  active: boolean;
  createdAt?: string;
};

export type IntegrationWebhookDeliveryRow = {
  id: string;
  webhookId: string;
  eventId?: string | null;
  status: string;
  attemptCount: number;
  createdAt?: string;
};

export function createIntegrationWebhookColumns(input: {
  onSelect: (id: string) => void;
  onToggleActive: (row: IntegrationWebhookRow) => void;
  actionPending?: boolean;
}): ColumnDef<IntegrationWebhookRow>[] {
  return [
    {
      accessorKey: 'eventType',
      header: 'Event',
      cell: ({ row }) => <span className="font-medium">{row.original.eventType}</span>,
    },
    {
      accessorKey: 'active',
      header: 'Status',
      cell: ({ row }) => <Badge variant={row.original.active ? 'default' : 'secondary'}>{row.original.active ? 'ACTIVE' : 'INACTIVE'}</Badge>,
    },
    {
      accessorKey: 'targetUrlHash',
      header: 'Target hash',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.targetUrlHash.slice(0, 16)}…</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => input.onSelect(row.original.id)}>
            Select
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={input.actionPending} onClick={() => input.onToggleActive(row.original)}>
            {row.original.active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];
}

export const integrationWebhookDeliveryColumns: ColumnDef<IntegrationWebhookDeliveryRow>[] = [
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <Badge variant={row.original.status === 'DELIVERED' ? 'default' : 'secondary'}>{row.original.status}</Badge>,
  },
  { accessorKey: 'attemptCount', header: 'Attempts' },
  {
    accessorKey: 'id',
    header: 'Delivery ID',
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span>,
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => row.original.createdAt ?? '—',
  },
];
