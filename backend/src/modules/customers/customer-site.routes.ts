import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { CustomerSiteController } from './customer-site.controller.js';

const list = defineLockedRoute('GET', '/api/v1/customer-sites');
const get = defineLockedRoute('GET', '/api/v1/customer-sites/:id');
const create = defineLockedRoute('POST', '/api/v1/customer-sites');
const update = defineLockedRoute('PATCH', '/api/v1/customer-sites/:id');

export function customerSiteRoutes(
  controller: CustomerSiteController,
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
    app.get(list.relativePath, { schema: list.schema, preHandler: guard('customer_site.view'), handler: controller.list });
    app.get(get.relativePath, { schema: get.schema, preHandler: guard('customer_site.view'), handler: controller.get });
    app.post(create.relativePath, { schema: create.schema, preHandler: guard('customer_site.create'), handler: controller.create });
    app.patch(update.relativePath, { schema: update.schema, preHandler: guard('customer_site.update'), handler: controller.update });
  };
}
