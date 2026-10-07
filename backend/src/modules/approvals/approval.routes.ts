import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { ApprovalController } from './approval.controller.js';

const defs = {
  inbox: defineLockedRoute('GET', '/api/v1/approvals/inbox'),
  detail: defineLockedRoute('GET', '/api/v1/approvals/:id'),
  approve: defineLockedRoute('POST', '/api/v1/approvals/:id/approve'),
  reject: defineLockedRoute('POST', '/api/v1/approvals/:id/reject'),
  returnForCorrection: defineLockedRoute('POST', '/api/v1/approvals/:id/return'),
  listDefinitions: defineLockedRoute('GET', '/api/v1/approval-definitions'),
  createDefinition: defineLockedRoute('POST', '/api/v1/approval-definitions'),
  workflowRules: defineLockedRoute('GET', '/api/v1/workflow-rules'),
  workflowRuleDetail: defineLockedRoute('GET', '/api/v1/workflow-rules/:id'),
  createWorkflowRule: defineLockedRoute('POST', '/api/v1/workflow-rules'),
  updateWorkflowRule: defineLockedRoute('PATCH', '/api/v1/workflow-rules/:id'),
  activateWorkflowRule: defineLockedRoute('POST', '/api/v1/workflow-rules/:id/activate'),
  deactivateWorkflowRule: defineLockedRoute('POST', '/api/v1/workflow-rules/:id/deactivate'),
  evaluateWorkflowRules: defineLockedRoute('POST', '/api/v1/workflow-rules/evaluate'),
};

export function approvalRoutes(
  controller: ApprovalController,
  identity: IdentityFacade,
  access: PlatformAccessFacade,
): FastifyPluginAsync {
  const guard = (permission: string) => [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    (request: FastifyRequest) => identity.assertPermission(request, permission),
    async (request: FastifyRequest) => {
      if (!request.tenant) throw new Error('Tenant context missing');
      await access.assertModuleEnabled(request.tenant.organizationId, 'approvals');
    },
  ];

  return async (app) => {
    app.get(defs.inbox.relativePath, {
      schema: defs.inbox.schema,
      preHandler: guard('approval.view'),
      handler: controller.inbox,
    });
    app.get(defs.detail.relativePath, {
      schema: defs.detail.schema,
      preHandler: guard('approval.view'),
      handler: controller.detail,
    });
    app.post(defs.approve.relativePath, {
      schema: defs.approve.schema,
      preHandler: guard('approval.act'),
      handler: controller.approve,
    });
    app.post(defs.reject.relativePath, {
      schema: defs.reject.schema,
      preHandler: guard('approval.act'),
      handler: controller.reject,
    });
    app.post(defs.returnForCorrection.relativePath, {
      schema: defs.returnForCorrection.schema,
      preHandler: guard('approval.act'),
      handler: controller.returnForCorrection,
    });
    app.get(defs.listDefinitions.relativePath, {
      schema: defs.listDefinitions.schema,
      preHandler: guard('workflow.manage'),
      handler: controller.listDefinitions,
    });
    app.post(defs.createDefinition.relativePath, {
      schema: defs.createDefinition.schema,
      preHandler: guard('workflow.manage'),
      handler: controller.createDefinition,
    });

    app.get(defs.workflowRules.relativePath, {
      schema: defs.workflowRules.schema,
      preHandler: guard('workflow.manage'),
      handler: controller.listWorkflowRules,
    });
    app.get(defs.workflowRuleDetail.relativePath, {
      schema: defs.workflowRuleDetail.schema,
      preHandler: guard('workflow.manage'),
      handler: controller.workflowRuleDetail,
    });
    app.post(defs.createWorkflowRule.relativePath, {
      schema: defs.createWorkflowRule.schema,
      preHandler: guard('workflow.manage'),
      handler: controller.createWorkflowRule,
    });
    app.patch(defs.updateWorkflowRule.relativePath, {
      schema: defs.updateWorkflowRule.schema,
      preHandler: guard('workflow.manage'),
      handler: controller.updateWorkflowRule,
    });
    app.post(defs.activateWorkflowRule.relativePath, {
      schema: defs.activateWorkflowRule.schema,
      preHandler: guard('workflow.manage'),
      handler: controller.activateWorkflowRule,
    });
    app.post(defs.deactivateWorkflowRule.relativePath, {
      schema: defs.deactivateWorkflowRule.schema,
      preHandler: guard('workflow.manage'),
      handler: controller.deactivateWorkflowRule,
    });
    app.post(defs.evaluateWorkflowRules.relativePath, {
      schema: defs.evaluateWorkflowRules.schema,
      preHandler: guard('workflow.manage'),
      handler: controller.evaluateWorkflowRules,
    });
  };
}
