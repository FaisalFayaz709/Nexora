import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { CustomerController } from './customer.controller.js';

const list = defineLockedRoute('GET', '/api/v1/customers');
const get = defineLockedRoute('GET', '/api/v1/customers/:id');
const create = defineLockedRoute('POST', '/api/v1/customers');
const update = defineLockedRoute('PATCH', '/api/v1/customers/:id');
const timeline = defineLockedRoute('GET', '/api/v1/customers/:id/timeline');

export function customerRoutes(
  controller: CustomerController,
  identity: IdentityFacade,
  access: PlatformAccessFacade,
): FastifyPluginAsync {
  const guard = (permission: string) => [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    (request: FastifyRequest) => identity.assertPermission(request, permission),
    (request: FastifyRequest) =>
      access.assertModuleEnabled(request.tenant!.organizationId, 'customers'),
  ];

  return async (app) => {
    app.get(list.relativePath, { schema: list.schema, preHandler: guard('customer.view'), handler: controller.list });
    app.get(get.relativePath, { schema: get.schema, preHandler: guard('customer.view'), handler: controller.get });
    app.post(create.relativePath, { schema: create.schema, preHandler: guard('customer.create'), handler: controller.create });
    app.patch(update.relativePath, { schema: update.schema, preHandler: guard('customer.update'), handler: controller.update });
    app.get(timeline.relativePath, { schema: timeline.schema, preHandler: guard('customer.view'), handler: controller.timeline });
  };
}
