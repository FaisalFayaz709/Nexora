import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../../identity/index.js';
import type { PlatformAccessFacade } from '../../platform/configuration/index.js';
import type { EmployeeController } from './employee.controller.js';

const list = defineLockedRoute('GET', '/api/v1/employees');
const get = defineLockedRoute('GET', '/api/v1/employees/:id');
const create = defineLockedRoute('POST', '/api/v1/employees');
const update = defineLockedRoute('PATCH', '/api/v1/employees/:id');

export function employeeRoutes(
  controller: EmployeeController,
  identity: IdentityFacade,
  access: PlatformAccessFacade,
): FastifyPluginAsync {
  const guard = (permission: string) => [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    (request: FastifyRequest) => identity.assertPermission(request, permission),
    (request: FastifyRequest) =>
      access.assertModuleEnabled(request.tenant!.organizationId, 'hr'),
  ];
  return async (app) => {
    app.get(list.relativePath, { schema: list.schema, preHandler: guard('employee.view'), handler: controller.list });
    app.get(get.relativePath, { schema: get.schema, preHandler: guard('employee.view'), handler: controller.get });
    app.post(create.relativePath, { schema: create.schema, preHandler: guard('employee.create'), handler: controller.create });
    app.patch(update.relativePath, { schema: update.schema, preHandler: guard('employee.update'), handler: controller.update });
  };
}
