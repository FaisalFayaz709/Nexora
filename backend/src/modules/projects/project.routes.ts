import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { ProjectController } from './project.controller.js';

const defs = {
  list: defineLockedRoute('GET', '/api/v1/projects'),
  get: defineLockedRoute('GET', '/api/v1/projects/:id'),
  create: defineLockedRoute('POST', '/api/v1/projects'),
  update: defineLockedRoute('PATCH', '/api/v1/projects/:id'),
  listTasks: defineLockedRoute('GET', '/api/v1/project-tasks'),
  getTask: defineLockedRoute('GET', '/api/v1/project-tasks/:id'),
  createTask: defineLockedRoute('POST', '/api/v1/project-tasks'),
  updateTask: defineLockedRoute('PATCH', '/api/v1/project-tasks/:id'),
  getBom: defineLockedRoute('GET', '/api/v1/projects/:id/bom'),
  upsertBom: defineLockedRoute('PUT', '/api/v1/projects/:id/bom'),
  approveBom: defineLockedRoute('POST', '/api/v1/projects/:id/bom/:bomId/approve'),
  budget: defineLockedRoute('GET', '/api/v1/projects/:id/budget'),
  upsertBudget: defineLockedRoute('PUT', '/api/v1/projects/:id/budget'),
  approveBudget: defineLockedRoute('POST', '/api/v1/projects/:id/budget/:budgetId/approve'),
  materialRequest: defineLockedRoute('POST', '/api/v1/projects/:id/material-request'),
  costing: defineLockedRoute('GET', '/api/v1/projects/:id/costing'),
  handover: defineLockedRoute('POST', '/api/v1/projects/:id/handover'),
  timeline: defineLockedRoute('GET', '/api/v1/projects/:id/timeline'),
} as const;

export function projectRoutes(
  controller: ProjectController,
  identity: IdentityFacade,
  access: PlatformAccessFacade,
): FastifyPluginAsync {
  const guard = (permission: string) => [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    async (request: FastifyRequest) => {
      await access.assertModuleEnabled(request.tenant!.organizationId, 'projects');
      await identity.assertPermission(request, permission);
    },
  ];

  return async (app) => {
    app.get(defs.list.relativePath, { schema: defs.list.schema, preHandler: guard('project.view'), handler: controller.list });
    app.get(defs.get.relativePath, { schema: defs.get.schema, preHandler: guard('project.view'), handler: controller.get });
    app.post(defs.create.relativePath, { schema: defs.create.schema, preHandler: guard('project.create'), handler: controller.create });
    app.patch(defs.update.relativePath, { schema: defs.update.schema, preHandler: guard('project.update'), handler: controller.update });

    app.get(defs.listTasks.relativePath, { schema: defs.listTasks.schema, preHandler: guard('project_task.view'), handler: controller.listTasks });
    app.get(defs.getTask.relativePath, { schema: defs.getTask.schema, preHandler: guard('project_task.view'), handler: controller.getTask });
    app.post(defs.createTask.relativePath, { schema: defs.createTask.schema, preHandler: guard('project_task.create'), handler: controller.createTask });
    app.patch(defs.updateTask.relativePath, { schema: defs.updateTask.schema, preHandler: guard('project_task.update'), handler: controller.updateTask });

    app.get(defs.getBom.relativePath, { schema: defs.getBom.schema, preHandler: guard('project.view'), handler: controller.getBom });
    app.put(defs.upsertBom.relativePath, { schema: defs.upsertBom.schema, preHandler: guard('project.update'), handler: controller.upsertBom });
    app.post(defs.approveBom.relativePath, { schema: defs.approveBom.schema, preHandler: guard('project.approve'), handler: controller.approveBom });
    app.get(defs.budget.relativePath, { schema: defs.budget.schema, preHandler: guard('project.view'), handler: controller.budget });
    app.put(defs.upsertBudget.relativePath, { schema: defs.upsertBudget.schema, preHandler: guard('project.update'), handler: controller.upsertBudget });
    app.post(defs.approveBudget.relativePath, { schema: defs.approveBudget.schema, preHandler: guard('project.approve'), handler: controller.approveBudget });
    app.post(defs.materialRequest.relativePath, { schema: defs.materialRequest.schema, preHandler: guard('project.update'), handler: controller.materialRequest });
    app.get(defs.costing.relativePath, { schema: defs.costing.schema, preHandler: guard('project.view_financials'), handler: controller.costing });
    app.post(defs.handover.relativePath, { schema: defs.handover.schema, preHandler: guard('project.handover'), handler: controller.handover });
    app.get(defs.timeline.relativePath, { schema: defs.timeline.schema, preHandler: guard('project.view'), handler: controller.timeline });
  };
}
