import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformRuntimeController } from './platform-runtime.controller.js';

const search = defineLockedRoute('GET', '/api/v1/search');
const calendar = defineLockedRoute('GET', '/api/v1/calendar');
const auditLogs = defineLockedRoute('GET', '/api/v1/audit-logs');
const auditLog = defineLockedRoute('GET', '/api/v1/audit-logs/:id');

export function platformRuntimeRoutes(controller: PlatformRuntimeController, identity: IdentityFacade): FastifyPluginAsync {
  const authenticated = [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    async (request: FastifyRequest) => {
      if (request.auth && request.tenant) {
        (request.auth as typeof request.auth & { permissions?: string[] }).permissions = await identity.permissions(request.auth.userId, request.tenant);
      }
    },
  ];
  const auditGuard = [...authenticated, (request: FastifyRequest) => identity.assertPermission(request, 'audit.view')];
  return async (app) => {
    app.get(search.relativePath, { schema: search.schema, preHandler: authenticated, handler: controller.search });
    app.get(calendar.relativePath, { schema: calendar.schema, preHandler: authenticated, handler: controller.calendar });
    app.get(auditLogs.relativePath, { schema: auditLogs.schema, preHandler: auditGuard, handler: controller.auditLogs });
    app.get(auditLog.relativePath, { schema: auditLog.schema, preHandler: auditGuard, handler: controller.auditLog });
  };
}
