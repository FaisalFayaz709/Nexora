import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { WarehouseController } from './warehouse.controller.js';

const list = defineLockedRoute('GET', '/api/v1/warehouses');
const get = defineLockedRoute('GET', '/api/v1/warehouses/:id');
const create = defineLockedRoute('POST', '/api/v1/warehouses');
const update = defineLockedRoute('PATCH', '/api/v1/warehouses/:id');

export function warehouseRoutes(
  controller: WarehouseController,
  identity: IdentityFacade,
  access: PlatformAccessFacade,
): FastifyPluginAsync {
  const guard = (permission: string) => [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    (request: FastifyRequest) => identity.assertPermission(request, permission),
    (request: FastifyRequest) =>
      access.assertModuleEnabled(request.tenant!.organizationId, 'inventory'),
  ];
  return async (app) => {
    app.get(list.relativePath, { schema: list.schema, preHandler: guard('warehouse.view'), handler: controller.list });
    app.get(get.relativePath, { schema: get.schema, preHandler: guard('warehouse.view'), handler: controller.get });
    app.post(create.relativePath, { schema: create.schema, preHandler: guard('warehouse.create'), handler: controller.create });
    app.patch(update.relativePath, { schema: update.schema, preHandler: guard('warehouse.update'), handler: controller.update });
  };
}
