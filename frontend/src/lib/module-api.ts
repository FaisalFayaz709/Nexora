import { apiDelete, apiGet, apiPatch, apiPost, apiPut, type ApiListEnvelope, type ApiQueryParams, type ApiSingleEnvelope } from './api-client';
import { createModuleQueryKeys } from './query-client';

export type EntityId = string;
export type CommandBody = Record<string, unknown> | undefined;

export type CrudResourceApi<TListItem = unknown, TDetail = TListItem, TCreate = Record<string, unknown>, TUpdate = Partial<TCreate>> = {
  list(filters?: ApiQueryParams): Promise<ApiListEnvelope<TListItem>>;
  detail(id: EntityId): Promise<ApiSingleEnvelope<TDetail>>;
  create(input: TCreate): Promise<ApiSingleEnvelope<TDetail>>;
  update(id: EntityId, input: TUpdate): Promise<ApiSingleEnvelope<TDetail>>;
  remove(id: EntityId): Promise<ApiSingleEnvelope<{ id: EntityId }>>;
};

export function createCrudResourceApi<TListItem = unknown, TDetail = TListItem, TCreate = Record<string, unknown>, TUpdate = Partial<TCreate>>(basePath: string): CrudResourceApi<TListItem, TDetail, TCreate, TUpdate> {
  return {
    list: (filters) => apiGet<ApiListEnvelope<TListItem>>(basePath, filters),
    detail: (id) => apiGet<ApiSingleEnvelope<TDetail>>(`${basePath}/${id}`),
    create: (input) => apiPost<ApiSingleEnvelope<TDetail>>(basePath, input as Record<string, unknown>),
    update: (id, input) => apiPatch<ApiSingleEnvelope<TDetail>>(`${basePath}/${id}`, input as Record<string, unknown>),
    remove: (id) => apiDelete<ApiSingleEnvelope<{ id: EntityId }>>(`${basePath}/${id}`),
  };
}

export function postCommand<TResponse = unknown>(path: string, body?: CommandBody, idempotencyKey?: string) {
  return apiPost<ApiSingleEnvelope<TResponse>>(path, body, { idempotencyKey });
}

export function putCommand<TResponse = unknown>(path: string, body?: CommandBody, idempotencyKey?: string) {
  return apiPut<ApiSingleEnvelope<TResponse>>(path, body, { idempotencyKey });
}

export { createModuleQueryKeys };
