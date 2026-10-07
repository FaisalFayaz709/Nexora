import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../../identity/index.js';
import type { PlatformAccessFacade } from '../../platform/configuration/index.js';
import type { StockCountController } from './stock-count.controller.js';

const list = defineLockedRoute('GET', '/api/v1/stock-counts');
const get = defineLockedRoute('GET', '/api/v1/stock-counts/:id');
const countSheet = defineLockedRoute('GET', '/api/v1/stock-counts/:id/count-sheet');
const create = defineLockedRoute('POST', '/api/v1/stock-counts');
const start = defineLockedRoute('POST', '/api/v1/stock-counts/:id/start');
const submit = defineLockedRoute('POST', '/api/v1/stock-counts/:id/submit');
const post = defineLockedRoute('POST', '/api/v1/stock-counts/:id/post');

export function stockCountRoutes(controller: StockCountController, identity: IdentityFacade, access: PlatformAccessFacade): FastifyPluginAsync {
  const guard = (permission: string) => [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    (request: FastifyRequest) => identity.assertPermission(request, permission),
    (request: FastifyRequest) => access.assertModuleEnabled(request.tenant!.organizationId, 'inventory'),
  ];
  return async (app) => {
    app.get(list.relativePath, { schema: list.schema, preHandler: guard('inventory.view'), handler: controller.list });
    app.get(get.relativePath, { schema: get.schema, preHandler: guard('inventory.view'), handler: controller.get });
    app.get(countSheet.relativePath, { schema: countSheet.schema, preHandler: guard('stock_count.manage'), handler: controller.countSheet });
    app.post(create.relativePath, { schema: create.schema, preHandler: guard('stock_count.manage'), handler: controller.create });
    app.post(start.relativePath, { schema: start.schema, preHandler: guard('stock_count.manage'), handler: controller.start });
    app.post(submit.relativePath, { schema: submit.schema, preHandler: guard('stock_count.manage'), handler: controller.submit });
    app.post(post.relativePath, { schema: post.schema, preHandler: guard('stock_count.post'), handler: controller.post });
  };
}
