import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { MaintenanceController } from './maintenance.controller.js';

const defs = {
  plans: defineLockedRoute('GET', '/api/v1/maintenance/plans'),
  createPlan: defineLockedRoute('POST', '/api/v1/maintenance/plans'),
  schedule: defineLockedRoute('GET', '/api/v1/maintenance/schedule'),
  generateWorkOrder: defineLockedRoute('POST', '/api/v1/maintenance/schedules/:id/generate-work-order'),
  completeExecution: defineLockedRoute('POST', '/api/v1/maintenance/executions/:id/complete'),
} as const;

export function maintenanceRoutes(
  controller: MaintenanceController,
  identity: IdentityFacade,
  access: PlatformAccessFacade,
): FastifyPluginAsync {
  const guard = (permission: string) => [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    async (request: FastifyRequest) => {
      await access.assertModuleEnabled(request.tenant!.organizationId, 'maintenance');
      await identity.assertPermission(request, permission);
    },
  ];

  return async (app) => {
    app.get(defs.plans.relativePath, { schema: defs.plans.schema, preHandler: guard('maintenance.view'), handler: controller.listPlans });
    app.post(defs.createPlan.relativePath, { schema: defs.createPlan.schema, preHandler: guard('maintenance.create'), handler: controller.createPlan });
    app.get(defs.schedule.relativePath, { schema: defs.schedule.schema, preHandler: guard('maintenance.view'), handler: controller.schedule });
    app.post(defs.generateWorkOrder.relativePath, { schema: defs.generateWorkOrder.schema, preHandler: guard('maintenance.execute'), handler: controller.generateWorkOrder });
    app.post(defs.completeExecution.relativePath, { schema: defs.completeExecution.schema, preHandler: guard('maintenance.execute'), handler: controller.completeExecution });
  };
}
