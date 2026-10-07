'use client';

import { useMemo, useState } from 'react';

import { DataTable, DataToolbar } from '@/components/data';
import { EmptyState } from '@/components/feedback';
import { ResourceFormDialog } from '@/components/forms';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { getResourceFormDefinition } from '@/modules/forms';
import { EntityList } from '@/modules/masters/entity-list';
import { createEntityColumns, type EntityRow } from '@/modules/masters/columns';
import type { FinanceResourceConfig } from './finance-resource-config';

function FinanceWorkflowOnlyResourceList({ resource }: { resource: FinanceResourceConfig }) {
  const [createOpen, setCreateOpen] = useState(false);
  const columns = useMemo(() => createEntityColumns([...resource.columns]), [resource.columns]);
  const formDefinition = useMemo(() => getResourceFormDefinition(resource.endpoint, resource.singularTitle), [resource.endpoint, resource.singularTitle]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">{resource.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{resource.description}</p>
        <p className="mt-1 font-mono text-xs text-slate-500">Fastify /api/v1 source: {resource.endpoint}</p>
      </div>
      <DataToolbar
        searchLabel={`Search ${resource.title}`}
        searchValue=""
        onSearchChange={() => undefined}
        actions={
          resource.createSupported && resource.createPermission ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                Create with RHF/Zod
              </Button>
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={`${resource.routeBase}/create`}>Create page</a>
              </Button>
            </>
          ) : null
        }
      />
      <ResourceFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" definition={formDefinition} />
      <Card>
        <CardHeader>
          <CardTitle>Command/read-model controlled finance surface</CardTitle>
          <CardDescription>
            The locked backend catalog for this finance resource does not expose a general list endpoint. The screen intentionally does not invent a Next.js API or browser-only accounting data source.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DataTable<EntityRow, unknown>
            columns={columns}
            data={[]}
            emptyTitle={`No ${resource.title.toLowerCase()} loaded from a list endpoint`}
            emptyDescription="Use the create page, command route, or read model that exists in the locked Fastify backend. Critical money, tax and journal effects remain backend-authoritative."
          />
          <EmptyState
            title="Workflow-only finance area"
            description="Appendix G requires a frontend screen and workflow entry point without splitting domain rules into Next.js. Runtime list behavior must be added only when the Fastify backend exposes a locked GET endpoint."
          />
        </CardContent>
      </Card>
    </section>
  );
}

export function FinanceResourceList({ resource }: { resource: FinanceResourceConfig }) {
  if (!resource.listSupported) return <FinanceWorkflowOnlyResourceList resource={resource} />;

  return (
    <EntityList
      title={resource.title}
      endpoint={resource.endpoint}
      description={resource.description}
      columns={[...resource.columns]}
      createLabel={resource.createSupported ? `Create ${resource.singularTitle}` : 'Create disabled'}
      createPermission={resource.createPermission}
      detailRouteBase={resource.detailSupported ? resource.routeBase : undefined}
      editRouteBase={resource.editSupported ? resource.routeBase : undefined}
      createRoute={resource.createSupported && resource.createPermission ? `${resource.routeBase}/create` : undefined}
    />
  );
}
