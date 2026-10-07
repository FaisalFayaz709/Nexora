'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';

type ProjectRow = { id: string; projectNo: string; name: string; status: string };

export function ProjectBudgetWorkbench() {
  const [projectId, setProjectId] = useState('');

  const projects = useQuery({
    queryKey: ['m11-projects-for-budget'],
    queryFn: () => apiRequest<{ data: ProjectRow[] }>('/projects?page=1&pageSize=25'),
  });

  const budget = useQuery({
    queryKey: ['m11-project-budget', projectId],
    enabled: Boolean(projectId),
    queryFn: () => apiRequest<any>(`/projects/${projectId}/budget`),
  });

  const costing = useQuery({
    queryKey: ['m11-project-costing', projectId],
    enabled: Boolean(projectId),
    queryFn: () => apiRequest<any>(`/projects/${projectId}/costing`),
  });

  const timeline = useQuery({
    queryKey: ['m11-project-timeline', projectId],
    enabled: Boolean(projectId),
    queryFn: () => apiRequest<any>(`/projects/${projectId}/timeline?limit=50`),
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Project Budget & Costing</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          M11 read-model workbench using only locked project endpoints: budget,
          costing and timeline. Budget mutation remains service-controlled and is
          not exposed through unapproved public routes.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <label className="text-sm font-medium text-slate-700" htmlFor="m11-project-id">Project</label>
        <select
          id="m11-project-id"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">Select a project</option>
          {(projects.data?.data ?? []).map((project) => (
            <option key={project.id} value={project.id}>{project.projectNo} — {project.name} — {project.status}</option>
          ))}
        </select>
      </div>

      {projectId ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Budget</h2>
            <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-slate-50 p-4 text-xs">
              {JSON.stringify(budget.data?.data ?? null, null, 2)}
            </pre>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Costing</h2>
            <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-slate-50 p-4 text-xs">
              {JSON.stringify(costing.data?.data ?? null, null, 2)}
            </pre>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Timeline</h2>
            <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-slate-50 p-4 text-xs">
              {JSON.stringify(timeline.data?.data ?? null, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </section>
  );
}
