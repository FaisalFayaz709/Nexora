'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PaginationState, SortingState } from '@tanstack/react-table';

import { PermissionGate } from '@/components/app';
import { DataTable, DataToolbar } from '@/components/data';
import { ResourceFormDialog } from '@/components/forms';
import { Button } from '@/components/ui';
import { apiRequest, type ApiListEnvelope, type ApiQueryParams } from '@/lib/api-client';
import { createNexoraQueryKey } from '@/lib/query-client';
import { getResourceFormDefinition } from '@/modules/forms';
import { createEntityColumns, valueAtPath, type EntityColumnConfig, type EntityRow } from './columns';

export type EntityListProps = {
  title: string;
  endpoint: string;
  description?: string;
  columns?: EntityColumnConfig[];
  createLabel?: string;
  createPermission?: string;
  initialFilters?: ApiQueryParams | undefined;
  detailRouteBase?: string | undefined;
  editRouteBase?: string | undefined;
  createRoute?: string | undefined;
};

function splitEndpoint(endpoint: string): { path: string; query: ApiQueryParams } {
  const [path = endpoint, queryString] = endpoint.split('?');
  const query: ApiQueryParams = {};
  if (queryString) {
    const params = new URLSearchParams(queryString);
    params.forEach((value, key) => {
      query[key] = value;
    });
  }
  return { path: path.startsWith('/') ? path : `/${path}`, query };
}

function normalizeRouteBase(routeBase?: string) {
  if (!routeBase) return undefined;
  return routeBase.startsWith('/') ? routeBase : `/${routeBase}`;
}

function toApiQuery(input: {
  endpoint: string;
  pagination: PaginationState;
  sorting: SortingState;
  search: string;
  initialFilters?: ApiQueryParams | undefined;
}): { path: string; query: ApiQueryParams } {
  const { path, query: endpointQuery } = splitEndpoint(input.endpoint);
  const query: ApiQueryParams = {
    ...endpointQuery,
    ...input.initialFilters,
    page: input.pagination.pageIndex + 1,
    pageSize: input.pagination.pageSize,
  };

  const [firstSort] = input.sorting;
  if (firstSort) query.sort = `${firstSort.id}:${firstSort.desc ? 'desc' : 'asc'}`;
  if (input.search.trim()) query.q = input.search.trim();

  return { path, query };
}


function withPagination(endpoint: string, query: ApiQueryParams): { path: string; query: ApiQueryParams; href: string } {
  const { path, query: endpointQuery } = splitEndpoint(endpoint);
  const mergedQuery: ApiQueryParams = { ...endpointQuery, ...query };
  const params = new URLSearchParams();
  Object.entries(mergedQuery).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  const separator = endpoint.includes('?') ? '&' : '?';
  const href = params.toString() ? `${endpoint}${separator}${params.toString()}` : endpoint;
  return { path, query: mergedQuery, href };
}

function normalizeRows(value: unknown): EntityRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is EntityRow => Boolean(row) && typeof row === 'object');
}

function normalizePageCount(metaTotal: unknown, pageSize: number, rowCount: number) {
  const total = typeof metaTotal === 'number' ? metaTotal : rowCount;
  return Math.max(1, Math.ceil(total / pageSize));
}

function endpointLabel(endpoint: string) {
  return splitEndpoint(endpoint).path.replace(/^\//, '').replaceAll('/', ' / ');
}

const defaultColumns: EntityColumnConfig[] = [
  { key: 'id', label: 'ID' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Created' },
];

export function EntityList({
  title,
  endpoint,
  description = 'Tenant-scoped NEXORA list screen using the centralized API/query layer and reusable grid foundation.',
  columns = defaultColumns,
  createLabel = 'Create',
  createPermission,
  initialFilters,
  detailRouteBase,
  editRouteBase,
  createRoute,
}: EntityListProps) {
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<EntityRow | null>(null);
  const normalizedDetailRoute = normalizeRouteBase(detailRouteBase);
  const normalizedEditRoute = normalizeRouteBase(editRouteBase ?? detailRouteBase);

  const queryInput = useMemo(
    () => toApiQuery({ endpoint, pagination, sorting, search, initialFilters }),
    [endpoint, pagination, sorting, search, initialFilters],
  );

  const query = useQuery({
    queryKey: createNexoraQueryKey('frontend-grid', endpoint, queryInput.query),
    queryFn: () => apiRequest<ApiListEnvelope<EntityRow>>(queryInput.path, { method: 'GET', query: queryInput.query }),
  });

  const formDefinition = useMemo(() => getResourceFormDefinition(endpoint, title), [endpoint, title]);
  const tableColumns = useMemo(() => createEntityColumns(columns, { getRowActions: (row) => {
    const rowIdValue = valueAtPath(row, 'id');
    const rowId = typeof rowIdValue === 'string' ? rowIdValue : undefined;
    const detailHref = rowId && normalizedDetailRoute ? `${normalizedDetailRoute}/${rowId}` : undefined;
    const editHref = rowId && normalizedEditRoute ? `${normalizedEditRoute}/${rowId}/edit` : undefined;
    return [
      detailHref
        ? { label: 'Review detail', href: detailHref }
        : { label: 'Review detail', disabled: true, reason: 'Dedicated detail pages are enabled in the business-master R10 surfaces only.' },
      rowId
        ? { label: 'Quick edit', onSelect: () => setEditingRow(row) }
        : { label: 'Quick edit', disabled: true, reason: 'Cannot edit without a stable id from the backend.' },
      editHref
        ? { label: 'Open edit page', href: editHref }
        : { label: 'Open edit page', disabled: true, reason: 'A route-level edit page is not configured for this resource.' },
    ];
  } }), [columns, normalizedDetailRoute, normalizedEditRoute]);
  const rows = normalizeRows(query.data?.data);
  const total = query.data?.meta?.total;
  const pageCount = normalizePageCount(total, pagination.pageSize, rows.length);

  const createActions = (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(true)} title="Open the React Hook Form + shared Zod create dialog for this resource.">
        {createLabel}
      </Button>
      {createRoute ? (
        <Button type="button" variant="outline" size="sm" asChild title="Open the full route-level create workflow.">
          <a href={createRoute}>Create page</a>
        </Button>
      ) : null}
    </>
  );

  const toolbarActions = createPermission ? (
    <PermissionGate
      permission={createPermission}
      fallback={<Button type="button" variant="outline" size="sm" disabled title="You do not have permission to create this resource.">{createLabel}</Button>}
    >
      {createActions}
    </PermissionGate>
  ) : createActions;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>
        <p className="mt-1 font-mono text-xs text-slate-500">Fastify /api/v1 source: {endpointLabel(endpoint)}</p>
      </div>

      <DataToolbar
        searchLabel={`Search ${title}`}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPagination((current) => ({ ...current, pageIndex: 0 }));
        }}
        actions={toolbarActions}
      />

      <ResourceFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" definition={formDefinition} />
      <ResourceFormDialog
        open={Boolean(editingRow)}
        onOpenChange={(open) => { if (!open) setEditingRow(null); }}
        mode="edit"
        definition={formDefinition}
        recordId={typeof editingRow?.id === 'string' ? editingRow.id : undefined}
        initialValues={editingRow ?? undefined}
      />

      <DataTable<EntityRow, unknown>
        columns={tableColumns}
        data={rows}
        loading={query.isLoading}
        error={query.error instanceof Error ? query.error.message : undefined}
        emptyTitle={`No ${title.toLowerCase()} found`}
        emptyDescription="No tenant-visible records matched the current filters, or the backend returned an empty page."
        pagination={{
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          pageCount,
          total: typeof total === 'number' ? total : rows.length,
        }}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
      />
    </section>
  );
}
