'use client';

import { useQuery } from '@tanstack/react-query';

import { DataTable } from '@/components/data';
import { ErrorState, LoadingState } from '@/components/feedback';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { apiRequest, type ApiSingleEnvelope } from '@/lib/api-client';
import { createNexoraQueryKey } from '@/lib/query-client';
import { createEntityColumns, type EntityRow } from '@/modules/masters/columns';

function normalizeRows(value: unknown): EntityRow[] {
  if (Array.isArray(value)) return value.filter((row): row is EntityRow => Boolean(row) && typeof row === 'object');
  if (value && typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    const rows = candidate.quotations ?? candidate.items ?? candidate.rows ?? candidate.data;
    if (Array.isArray(rows)) return rows.filter((row): row is EntityRow => Boolean(row) && typeof row === 'object');
  }
  return [];
}

const comparisonColumns = createEntityColumns([
  { key: 'vendorId', label: 'Vendor' },
  { key: 'quoteRef', label: 'Quote ref' },
  { key: 'total', label: 'Cost' },
  { key: 'deliveryDays', label: 'Delivery' },
  { key: 'warrantyMonths', label: 'Warranty' },
  { key: 'status', label: 'Status' },
]);

export function RfqComparisonPanel({ rfqId }: { rfqId: string }) {
  const query = useQuery({
    queryKey: createNexoraQueryKey('procurement-rfq-comparison', rfqId),
    queryFn: () => apiRequest<ApiSingleEnvelope<unknown>>(`/rfqs/${rfqId}/comparison`, { method: 'GET' }),
  });

  if (query.isLoading) return <LoadingState title="Loading RFQ comparison" description="Fetching the deterministic comparison read model from Fastify /api/v1." />;
  if (query.error) return <ErrorState title="Unable to load RFQ comparison" description={query.error instanceof Error ? query.error.message : 'The backend rejected the comparison request.'} />;

  const rows = normalizeRows(query.data?.data);

  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>RFQ quotation comparison</CardTitle>
          <CardDescription>
            Deterministic supplier comparison by cost, delivery and warranty. Selection remains a human command action, not AI and not a frontend-only calculation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-mono text-xs text-muted-foreground">Fastify /api/v1 source: /rfqs/{rfqId}/comparison</p>
          <DataTable<EntityRow, unknown>
            columns={comparisonColumns}
            data={rows}
            emptyTitle="No supplier quotation comparison rows"
            emptyDescription="Record supplier quotations for this RFQ, then return here. Supplier selection must use /supplier-quotations/:id/select."
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" asChild><a href={`/procurement/rfqs/${rfqId}`}>Back to RFQ</a></Button>
            <Button type="button" variant="outline" asChild><a href="/procurement/supplier-quotations/create">Record supplier quotation</a></Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
