'use client';

import type { Table } from '@tanstack/react-table';
import { Checkbox, Label } from '../ui';

export function ColumnVisibilityMenu<TData>({ table }: { table: Table<TData> }) {
  return (
    <div className="rounded-md border bg-card p-3 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Columns</p>
      <div className="space-y-2">
        {table.getAllLeafColumns().filter((column) => column.getCanHide()).map((column) => (
          <Label key={column.id} className="flex items-center gap-2 text-sm">
            <Checkbox checked={column.getIsVisible()} onChange={(event) => column.toggleVisibility(event.currentTarget.checked)} />
            {column.id}
          </Label>
        ))}
      </div>
    </div>
  );
}
