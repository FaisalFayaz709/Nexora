import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../../identity/index.js';
import type { PlatformAccessFacade } from '../../platform/configuration/index.js';
import type { AttendanceController } from './attendance.controller.js';
const list = defineLockedRoute('GET', '/api/v1/attendance');
const get = defineLockedRoute('GET', '/api/v1/attendance/:id');
export function attendanceRoutes(controller: AttendanceController, identity: IdentityFacade, access: PlatformAccessFacade): FastifyPluginAsync {
  const guard = (permission: string) => [identity.authenticateRequest.bind(identity), identity.resolveTenantRequest.bind(identity), (request: FastifyRequest) => access.assertModuleEnabled(request.tenant!.organizationId, 'hr'), (request: FastifyRequest) => identity.assertPermission(request, permission)];
  return async (app) => {
    app.get(list.relativePath, { schema: list.schema, preHandler: guard('attendance.view'), handler: controller.list });
    app.get(get.relativePath, { schema: get.schema, preHandler: guard('attendance.view'), handler: controller.get });
  };
}
