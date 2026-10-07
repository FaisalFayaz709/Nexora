import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../../identity/index.js';
import type { PlatformAccessFacade } from '../../platform/configuration/index.js';
import type { LeaveController } from './leave.controller.js';
const list = defineLockedRoute('GET', '/api/v1/leave-requests');
const get = defineLockedRoute('GET', '/api/v1/leave-requests/:id');
const create = defineLockedRoute('POST', '/api/v1/leave-requests');
const submit = defineLockedRoute('POST', '/api/v1/leave-requests/:id/submit');
const cancel = defineLockedRoute('POST', '/api/v1/leave-requests/:id/cancel');
export function leaveRoutes(controller: LeaveController, identity: IdentityFacade, access: PlatformAccessFacade): FastifyPluginAsync {
  const guard = (permission: string) => [identity.authenticateRequest.bind(identity), identity.resolveTenantRequest.bind(identity), (request: FastifyRequest) => access.assertModuleEnabled(request.tenant!.organizationId, 'hr'), (request: FastifyRequest) => identity.assertPermission(request, permission)];
  return async (app) => {
    app.get(list.relativePath, { schema: list.schema, preHandler: guard('leave.view'), handler: controller.list });
    app.get(get.relativePath, { schema: get.schema, preHandler: guard('leave.view'), handler: controller.get });
    app.post(create.relativePath, { schema: create.schema, preHandler: guard('leave.create'), handler: controller.create });
    app.post(submit.relativePath, { schema: submit.schema, preHandler: guard('leave.submit'), handler: controller.submit });
    app.post(cancel.relativePath, { schema: cancel.schema, preHandler: guard('leave.cancel'), handler: controller.cancel });
  };
}
