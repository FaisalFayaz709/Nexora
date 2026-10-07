import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../../identity/index.js';
import type { PlatformAccessFacade } from '../../platform/configuration/index.js';
import type { PayrollController } from './payroll.controller.js';
const list = defineLockedRoute('GET', '/api/v1/payroll-runs');
const get = defineLockedRoute('GET', '/api/v1/payroll-runs/:id');
const create = defineLockedRoute('POST', '/api/v1/payroll-runs');
const calculate = defineLockedRoute('POST', '/api/v1/payroll-runs/:id/calculate');
const approve = defineLockedRoute('POST', '/api/v1/payroll-runs/:id/approve');
const post = defineLockedRoute('POST', '/api/v1/payroll-runs/:id/post');
export function payrollRoutes(controller: PayrollController, identity: IdentityFacade, access: PlatformAccessFacade): FastifyPluginAsync {
  const guard = (permission: string) => [identity.authenticateRequest.bind(identity), identity.resolveTenantRequest.bind(identity), (request: FastifyRequest) => access.assertModuleEnabled(request.tenant!.organizationId, 'hr'), (request: FastifyRequest) => identity.assertPermission(request, permission)];
  return async (app) => {
    app.get(list.relativePath, { schema: list.schema, preHandler: guard('payroll.view'), handler: controller.list });
    app.get(get.relativePath, { schema: get.schema, preHandler: guard('payroll.view'), handler: controller.get });
    app.post(create.relativePath, { schema: create.schema, preHandler: guard('payroll.create'), handler: controller.create });
    app.post(calculate.relativePath, { schema: calculate.schema, preHandler: guard('payroll.calculate'), handler: controller.calculate });
    app.post(approve.relativePath, { schema: approve.schema, preHandler: guard('payroll.approve'), handler: controller.approve });
    app.post(post.relativePath, { schema: post.schema, preHandler: guard('payroll.post'), handler: controller.post });
  };
}
