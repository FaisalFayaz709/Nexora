import type { ColumnDef } from '@tanstack/react-table';

export type FormRegistryRow = {
  resourceKey: string;
  endpoint: string;
  standard: string;
};

export const formRegistryColumns: ColumnDef<FormRegistryRow>[] = [
  { id: 'resourceKey', header: 'Resource key', accessorKey: 'resourceKey' },
  { id: 'endpoint', header: 'Endpoint', accessorKey: 'endpoint' },
  { id: 'standard', header: 'Form standard', accessorKey: 'standard' },
];
