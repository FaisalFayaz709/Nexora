import type { ColumnDef } from '@tanstack/react-table';
import { RowActionsMenu, type DataRowAction } from '@/components/data';
import { StatusBadge } from '@/components/workflow';

export type EntityRow = Record<string, unknown>;

export type EntityColumnConfig = {
  key: string;
  label: string;
  sortable?: boolean;
  hidden?: boolean;
};

export function valueAtPath(row: EntityRow, path: string): unknown {
  return path.split('.').reduce<unknown>((current, part) => {
    if (current && typeof current === 'object' && part in current) {
      return (current as EntityRow)[part];
    }
    return undefined;
  }, row);
}

function stableColumnId(key: string) {
  return key.replace(/[^a-zA-Z0-9_]+/g, '_');
}

function isStatusColumn(column: EntityColumnConfig) {
  const key = column.key.toLowerCase();
  const label = column.label.toLowerCase();
  return key === 'status' || key.endsWith('status') || label === 'status' || label.endsWith(' status');
}

function formatEntityValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const record = value as EntityRow;
    const preferred = record.name ?? record.title ?? record.code ?? record.id;
    if (preferred !== undefined && preferred !== null) return String(preferred);
  }
  return String(value);
}

export function createEntityColumns(columnConfig: EntityColumnConfig[], options: { getRowActions?: (row: EntityRow) => DataRowAction[] } = {}): ColumnDef<EntityRow>[] {
  const columns: ColumnDef<EntityRow>[] = columnConfig.map((column) => ({
    id: stableColumnId(column.key),
    header: column.label,
    accessorFn: (row) => valueAtPath(row, column.key),
    enableSorting: column.sortable ?? true,
    cell: ({ getValue }) => {
      const value = getValue();
      if (isStatusColumn(column) && typeof value === 'string') return <StatusBadge status={value} />;
      return <span className="break-words text-sm text-foreground">{formatEntityValue(value)}</span>;
    },
  }));

  columns.push({
    id: 'row_actions',
    header: () => <span className="sr-only">Row actions</span>,
    enableSorting: false,
    cell: ({ row }) => <RowActionsMenu actions={options.getRowActions?.(row.original)} />,
  });

  return columns;
}
