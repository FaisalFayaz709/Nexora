import { apiDelete, apiGet, apiPost, type ApiQueryParams } from '@/lib/api-client';
import { createCrudResourceApi, createModuleQueryKeys } from '@/lib/module-api';

export const identityEndpoints = {
  users: '/users',
  roles: '/roles',
  permissions: '/permissions',
  sessions: '/auth/sessions',
  revokeSession: (id: string) => `/auth/sessions/${id}`,
} as const;

export const identityKeys = createModuleQueryKeys('identity', { users: 'users', roles: 'roles', permissions: 'permissions', sessions: 'sessions' });
export const usersApi = createCrudResourceApi(identityEndpoints.users);
export const rolesApi = createCrudResourceApi(identityEndpoints.roles);
export function listPermissions(filters?: ApiQueryParams) { return apiGet(identityEndpoints.permissions, filters); }
export function listSessions(filters?: ApiQueryParams) { return apiGet(identityEndpoints.sessions, filters); }
export function revokeSession(id: string) { return apiDelete(identityEndpoints.revokeSession(id)); }
export function assignRole(body: Record<string, unknown>) { return apiPost('/users/roles', body); }
