'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui';
import { EmptyState, ErrorState, LoadingState } from '../feedback';

export interface DataTablePagination {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  total?: number | undefined;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean | undefined;
  error?: string | undefined;
  emptyTitle?: string | undefined;
  emptyDescription?: string | undefined;
  pagination?: DataTablePagination | undefined;
  onPaginationChange?: (pagination: PaginationState) => void;
  sorting?: SortingState | undefined;
  onSortingChange?: (sorting: SortingState) => void;
  columnVisibility?: VisibilityState | undefined;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  rowSelection?: RowSelectionState | undefined;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  error,
  emptyTitle = 'No records found',
  emptyDescription = 'Create a new record or adjust the current filters.',
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  columnVisibility,
  onColumnVisibilityChange,
  rowSelection,
  onRowSelectionChange,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    pageCount: pagination?.pageCount ?? -1,
    manualPagination: Boolean(pagination),
    manualSorting: Boolean(onSortingChange),
    getCoreRowModel: getCoreRowModel(),
    state: {
      pagination: pagination ? { pageIndex: pagination.pageIndex, pageSize: pagination.pageSize } : undefined,
      sorting,
      columnVisibility,
      rowSelection,
    },
    onPaginationChange: (updater) => {
      if (!pagination || !onPaginationChange) return;
      const next = typeof updater === 'function' ? updater({ pageIndex: pagination.pageIndex, pageSize: pagination.pageSize }) : updater;
      onPaginationChange(next);
    },
    onSortingChange: (updater) => {
      if (!onSortingChange) return;
      const next = typeof updater === 'function' ? updater(sorting ?? []) : updater;
      onSortingChange(next);
    },
    onColumnVisibilityChange: (updater) => {
      if (!onColumnVisibilityChange) return;
      const next = typeof updater === 'function' ? updater(columnVisibility ?? {}) : updater;
      onColumnVisibilityChange(next);
    },
    onRowSelectionChange: (updater) => {
      if (!onRowSelectionChange) return;
      const next = typeof updater === 'function' ? updater(rowSelection ?? {}) : updater;
      onRowSelectionChange(next);
    },
  });

  if (loading) return <LoadingState title="Loading grid" description="Fetching the latest permission-filtered records." />;
  if (error) return <ErrorState title="Could not load records" description={error} />;
  if (data.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 justify-start px-2"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="text-xs text-muted-foreground">
                          {header.column.getIsSorted() === 'asc' ? '↑' : header.column.getIsSorted() === 'desc' ? '↓' : '↕'}
                        </span>
                      </Button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {pagination ? <DataPagination pageIndex={pagination.pageIndex} pageSize={pagination.pageSize} pageCount={pagination.pageCount} total={pagination.total} onPageChange={(pageIndex) => onPaginationChange?.({ pageIndex, pageSize: pagination.pageSize })} /> : null}
    </div>
  );
}

export function DataPagination({ pageIndex, pageSize, pageCount, total, onPageChange }: { pageIndex: number; pageSize: number; pageCount: number; total?: number | undefined; onPageChange: (pageIndex: number) => void }) {
  return (
    <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>{typeof total === 'number' ? `${total} total records` : `Page size ${pageSize}`}</div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={pageIndex <= 0} onClick={() => onPageChange(pageIndex - 1)}>
          Previous
        </Button>
        <span>Page {pageIndex + 1} of {Math.max(pageCount, 1)}</span>
        <Button type="button" variant="outline" size="sm" disabled={pageIndex + 1 >= pageCount} onClick={() => onPageChange(pageIndex + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
