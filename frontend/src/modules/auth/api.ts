import { apiDelete, apiGet, apiPost } from '@/lib/api-client';
import { createModuleQueryKeys } from '@/lib/module-api';

export const authEndpoints = {
  login: '/auth/login',
  mfaVerify: '/auth/mfa/verify',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  logoutAll: '/auth/logout-all',
  me: '/auth/me',
  sessions: '/auth/sessions',
  revokeSession: (id: string) => `/auth/sessions/${id}`,
} as const;

export const authKeys = createModuleQueryKeys('identity', { me: 'me', sessions: 'sessions' });

export function login(input: Record<string, unknown>) { return apiPost(authEndpoints.login, input); }
export function verifyMfa(input: Record<string, unknown>) { return apiPost(authEndpoints.mfaVerify, input); }
export function refreshSession() { return apiPost(authEndpoints.refresh); }
export function logout() { return apiPost(authEndpoints.logout); }
export function getCurrentUser() { return apiGet(authEndpoints.me); }
export function listSessions() { return apiGet(authEndpoints.sessions); }
export function revokeSession(id: string) { return apiDelete(authEndpoints.revokeSession(id)); }
