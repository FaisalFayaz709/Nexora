'use client';

import { useQuery } from '@tanstack/react-query';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { ActivityTimeline, AuditTimeline } from '@/components/workflow';
import { apiGet } from '@/lib/api-client';
import { createNexoraQueryKey } from '@/lib/query-client';
import { AssetCommandPanel } from './asset-command-panel';
import type { AssetScopedSurfaceConfig } from './asset-resource-config';

function endpointFor(surface: AssetScopedSurfaceConfig, assetId: string) {
  return surface.endpointTemplate.replace(':id', assetId);
}

function preview(value: unknown) {
  if (!value) return 'No data returned yet.';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

export function AssetScopedSurface({ assetId, surface }: { assetId: string; surface: AssetScopedSurfaceConfig }) {
  const endpoint = endpointFor(surface, assetId);
  const query = useQuery({ queryKey: createNexoraQueryKey('asset-scoped-surface', assetId, surface.key), queryFn: () => apiGet<unknown>(endpoint), enabled: surface.readModel });
  if (surface.readModel && query.isLoading) return <LoadingState title={`Loading ${surface.title}`} description={`Fetching ${endpoint} from the Fastify /api/v1 asset API.`} />;
  if (surface.readModel && query.error) return <ErrorState title={`Cannot load ${surface.title}`} description={query.error instanceof Error ? query.error.message : 'The backend rejected the asset read-model request.'} />;

  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><CardTitle>{surface.title}</CardTitle><CardDescription>{surface.description}</CardDescription></div>
            <Button type="button" variant="outline" asChild><a href={`/assets/${assetId}`}>Back to asset</a></Button>
          </div>
          <p className="font-mono text-xs text-muted-foreground">Fastify /api/v1 source: {endpoint}</p>
        </CardHeader>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{surface.readModel ? 'Read-model output' : 'Command surface'}</CardTitle><CardDescription>{surface.readModel ? 'The frontend displays backend history without calculating lifecycle events locally.' : 'Use the lifecycle command panel to submit explicit asset commands.'}</CardDescription></CardHeader>
          <CardContent>{surface.readModel ? <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">{preview(query.data)}</pre> : <AssetCommandPanel assetId={assetId} />}{surface.readModel && !query.data ? <EmptyState title="No asset data returned" description="The tenant-scoped backend read model returned no records for this asset and surface." /> : null}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Audit, traceability and controls</CardTitle><CardDescription>R13 keeps asset lifecycle state inside backend transactions and audit history.</CardDescription></CardHeader>
          <CardContent className="space-y-4"><ActivityTimeline items={surface.auditNotes.map((note, index) => ({ id: `${surface.key}-${index}`, title: note, description: 'Required by the R13 projects/assets frontend completion pass.' }))} /><AuditTimeline items={[{ id: 'permission', title: `Permission: ${surface.permission}`, description: 'UI gating is informational; backend checks remain authoritative.' }, { id: 'endpoint', title: endpoint, description: 'All business data uses Fastify /api/v1 through the centralized API client.' }]} /></CardContent>
        </Card>
      </div>
    </main>
  );
}
