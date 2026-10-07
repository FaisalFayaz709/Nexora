import { QueryClient, type QueryKey } from '@tanstack/react-query';
import type { ApiQueryParams } from './api-client';

export type NexoraQueryKey = readonly unknown[];

function stableObject(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

export function createNexoraQueryKey(domain: string, resource: string, scope?: string | number | ApiQueryParams | null): NexoraQueryKey {
  if (!scope) return [domain, resource] as const;
  if (typeof scope === 'object') return [domain, resource, stableObject(scope as Record<string, unknown>)] as const;
  return [domain, resource, scope] as const;
}

export function createModuleQueryKeys<const TResources extends Record<string, string>>(domain: string, resources: TResources) {
  return Object.fromEntries(
    Object.entries(resources).map(([name, resource]) => [
      name,
      {
        all: () => createNexoraQueryKey(domain, resource),
        list: (filters?: ApiQueryParams) => createNexoraQueryKey(domain, `${resource}.list`, filters ?? null),
        detail: (id: string) => createNexoraQueryKey(domain, `${resource}.detail`, id),
        timeline: (id: string) => createNexoraQueryKey(domain, `${resource}.timeline`, id),
      },
    ]),
  ) as {
    [K in keyof TResources]: {
      all: () => NexoraQueryKey;
      list: (filters?: ApiQueryParams) => NexoraQueryKey;
      detail: (id: string) => NexoraQueryKey;
      timeline: (id: string) => NexoraQueryKey;
    };
  };
}

export function invalidateKeys(keys: QueryKey[]) {
  return keys;
}

export function createNexoraQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
