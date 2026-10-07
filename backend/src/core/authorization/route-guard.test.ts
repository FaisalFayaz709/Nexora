import { describe, expect, it } from 'vitest';
import type { FastifyRequest } from 'fastify';
import { createRouteGuard, type AuthenticationBoundary, type ModuleAccessBoundary } from './route-guard.js';

describe('createRouteGuard', () => {
  it('creates the locked auth -> tenant -> module -> permission pipeline', async () => {
    const calls: string[] = [];
    const identity: AuthenticationBoundary = {
      async authenticateRequest(request) {
        calls.push('auth');
        request.auth = { userId: 'user-1', sessionId: 'session-1' };
      },
      async resolveTenantRequest(request) {
        calls.push('tenant');
        request.tenant = { membershipId: 'mem-1', organizationId: 'org-1', branchId: null };
      },
      async assertPermission(_request, permission) {
        calls.push(`permission:${permission}`);
      },
    };
    const access: ModuleAccessBoundary = {
      async assertModuleEnabled(_organizationId, moduleKey) {
        calls.push(`module:${moduleKey}`);
      },
    };

    const request = { id: 'req-1' } as FastifyRequest;
    const guard = createRouteGuard({ identity, access, moduleKey: 'procurement', permission: 'purchase_request.create' });
    for (const handler of guard) await (handler as any)(request, {} as never);

    expect(calls).toEqual(['auth', 'tenant', 'module:procurement', 'permission:purchase_request.create']);
  });
});
