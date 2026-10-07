'use client';

import { useQuery } from '@tanstack/react-query';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@/components/ui';
import { AuditTimeline, ActivityTimeline } from '@/components/workflow';
import { apiGet } from '@/lib/api-client';
import { createNexoraQueryKey } from '@/lib/query-client';
import { ProjectCommandPanel } from './project-command-panel';
import type { ProjectScopedSurfaceConfig } from './project-resource-config';

function endpointFor(surface: ProjectScopedSurfaceConfig, projectId: string) {
  return surface.endpointTemplate.replace(':id', projectId);
}

function preview(value: unknown) {
  if (!value) return 'No data returned yet.';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

export function ProjectScopedSurface({ projectId, surface }: { projectId: string; surface: ProjectScopedSurfaceConfig }) {
  const endpoint = endpointFor(surface, projectId);
  const query = useQuery({
    queryKey: createNexoraQueryKey('project-scoped-surface', projectId, surface.key),
    queryFn: () => apiGet<unknown>(endpoint),
    enabled: surface.readModel,
  });

  if (surface.readModel && query.isLoading) return <LoadingState title={`Loading ${surface.title}`} description={`Fetching ${endpoint} from the Fastify /api/v1 project API.`} />;
  if (surface.readModel && query.error) return <ErrorState title={`Cannot load ${surface.title}`} description={query.error instanceof Error ? query.error.message : 'The backend rejected the project read-model request.'} />;

  return (
    <main className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{surface.title}</CardTitle>
              <CardDescription>{surface.description}</CardDescription>
            </div>
            <Button type="button" variant="outline" asChild><a href={`/projects/${projectId}`}>Back to project</a></Button>
          </div>
          <p className="font-mono text-xs text-muted-foreground">Fastify /api/v1 source: {endpoint}</p>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{surface.readModel ? 'Read-model output' : 'Command surface'}</CardTitle>
            <CardDescription>{surface.readModel ? 'The frontend displays backend output only. It does not calculate project financials, inventory shortages or timeline history locally.' : 'Use the command panel to submit explicit workflow actions to Fastify.'}</CardDescription>
          </CardHeader>
          <CardContent>
            {surface.readModel ? <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">{preview(query.data)}</pre> : <ProjectCommandPanel projectId={projectId} />}
            {surface.readModel && !query.data ? <EmptyState title="No project data returned" description="The tenant-scoped backend read model returned no records for this project and surface." /> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audit, traceability and controls</CardTitle>
            <CardDescription>R13 preserves project-to-procurement-to-asset continuity and avoids frontend-only lifecycle state.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ActivityTimeline items={surface.auditNotes.map((note, index) => ({ id: `${surface.key}-${index}`, title: note, description: 'Required by the R13 projects/assets frontend completion pass.' }))} />
            <AuditTimeline items={[{ id: 'permission', title: `Permission: ${surface.permission}`, description: 'UI gating is informational; backend permission and tenant checks remain authoritative.' }, { id: 'endpoint', title: endpoint, description: 'All business data uses Fastify /api/v1 through the centralized API client.' }]} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
