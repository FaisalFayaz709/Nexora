import { apiGet, apiPut, type ApiQueryParams } from '@/lib/api-client';
import { createCrudResourceApi, createModuleQueryKeys, postCommand } from '@/lib/module-api';

export type ListFilters = ApiQueryParams;
export type CreateInput = Record<string, unknown>;
export type UpdateInput = Record<string, unknown>;
export type CommandInput = Record<string, unknown>;

export const projectsEndpoints = {
  projects: '/projects',
  tasks: '/project-tasks',
  approveBom: (id: string, childId: string) => `/projects/${id}/bom/${childId}/approve`,
  budget: (id: string) => `/projects/${id}/budget`,
  approveBudget: (id: string, childId: string) => `/projects/${id}/budget/${childId}/approve`,
  createMaterialRequest: (id: string) => `/projects/${id}/material-request`,
  handoverProject: (id: string) => `/projects/${id}/handover`,
} as const;

export const projectsKeys = createModuleQueryKeys('projects', { projects: 'projects', tasks: 'tasks' });

export const projectsApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(projectsEndpoints.projects);
export const tasksApi = createCrudResourceApi<unknown, unknown, CreateInput, UpdateInput>(projectsEndpoints.tasks);

export function approveBom(id: string, childId: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(projectsEndpoints.approveBom(id, childId), body, idempotencyKey); }
export function approveBudget(id: string, childId: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(projectsEndpoints.approveBudget(id, childId), body, idempotencyKey); }
export function createMaterialRequest(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(projectsEndpoints.createMaterialRequest(id), body, idempotencyKey); }
export function handoverProject(id: string, body?: CommandInput, idempotencyKey?: string) { return postCommand(projectsEndpoints.handoverProject(id), body, idempotencyKey); }

export function getProjectBom(id: string) { return apiGet(`/projects/${id}/bom`); }
export function putProjectBom(id: string, body: Record<string, unknown>) { return apiPut(`/projects/${id}/bom`, body); }
export function getProjectBudget(id: string) { return apiGet(projectsEndpoints.budget(id)); }
export function putProjectBudget(id: string, body: Record<string, unknown>) { return apiPut(projectsEndpoints.budget(id), body); }
export function getProjectCosting(id: string) { return apiGet(`/projects/${id}/costing`); }
export function getProjectTimeline(id: string) { return apiGet(`/projects/${id}/timeline`); }

export const ProjectsApiRegistry = { endpoints: projectsEndpoints, keys: projectsKeys } as const;
