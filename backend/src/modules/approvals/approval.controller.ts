import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  ApprovalDecisionSchema,
  ApprovalDefinitionListQuerySchema,
  ApprovalInboxQuerySchema,
  ApprovalRejectSchema,
  ApprovalReturnSchema,
  CreateApprovalDefinitionSchema,
  CreateWorkflowRuleSchema,
  EvaluateWorkflowRulesSchema,
  UpdateWorkflowRuleSchema,
  WorkflowRuleListQuerySchema,
} from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import { ApprovalService } from './approval.service.js';

function context(request: FastifyRequest) {
  if (!request.auth || !request.tenant) {
    throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Authorization pipeline was not initialized.');
  }
  return { auth: request.auth, tenant: request.tenant };
}

export class ApprovalController {
  constructor(private readonly service: ApprovalService) {}

  inbox = async (request: FastifyRequest, reply: FastifyReply) => {
    const { auth, tenant } = context(request);
    const query = ApprovalInboxQuerySchema.parse(request.query);
    const result = await this.service.inbox(tenant, auth.userId, query);
    return reply.code(200).send(
      listEnvelope(result.rows, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        requestId: request.id,
      }),
    );
  };

  detail = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = context(request);
    return reply.code(200).send(
      dataEnvelope(await this.service.detail(tenant, request.params.id), request.id),
    );
  };

  approve = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { auth, tenant } = context(request);
    const body = ApprovalDecisionSchema.parse(request.body ?? {});
    return reply.code(200).send(
      dataEnvelope(
        await this.service.act(
          tenant,
          auth.userId,
          request.params.id,
          'APPROVE',
          body.comment ?? null,
        ),
        request.id,
      ),
    );
  };

  reject = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { auth, tenant } = context(request);
    const body = ApprovalRejectSchema.parse(request.body);
    return reply.code(200).send(
      dataEnvelope(
        await this.service.act(
          tenant,
          auth.userId,
          request.params.id,
          'REJECT',
          body.comment,
        ),
        request.id,
      ),
    );
  };

  returnForCorrection = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { auth, tenant } = context(request);
    const body = ApprovalReturnSchema.parse(request.body ?? {});
    return reply.code(200).send(
      dataEnvelope(
        await this.service.act(
          tenant,
          auth.userId,
          request.params.id,
          'RETURN',
          body.comment ?? null,
        ),
        request.id,
      ),
    );
  };

  listDefinitions = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = context(request);
    const query = ApprovalDefinitionListQuerySchema.parse(request.query);
    const result = await this.service.listDefinitions(tenant, query);
    return reply.code(200).send(
      listEnvelope(result.rows, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        requestId: request.id,
      }),
    );
  };

  createDefinition = async (request: FastifyRequest, reply: FastifyReply) => {
    const { auth, tenant } = context(request);
    const input = CreateApprovalDefinitionSchema.parse(request.body);
    return reply.code(201).send(
      dataEnvelope(
        await this.service.createDefinition(
          tenant,
          { userId: auth.userId, ip: request.ip },
          input,
        ),
        request.id,
      ),
    );
  };

  listWorkflowRules = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = context(request);
    const query = WorkflowRuleListQuerySchema.parse(request.query);
    const result = await this.service.listWorkflowRules(tenant, query);
    return reply.code(200).send(
      listEnvelope(result.rows, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        requestId: request.id,
      }),
    );
  };

  workflowRuleDetail = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = context(request);
    return reply.code(200).send(
      dataEnvelope(await this.service.workflowRuleDetail(tenant, request.params.id), request.id),
    );
  };

  createWorkflowRule = async (request: FastifyRequest, reply: FastifyReply) => {
    const { auth, tenant } = context(request);
    const input = CreateWorkflowRuleSchema.parse(request.body);
    return reply.code(201).send(
      dataEnvelope(
        await this.service.createWorkflowRule(
          tenant,
          { userId: auth.userId, ip: request.ip },
          input,
        ),
        request.id,
      ),
    );
  };

  updateWorkflowRule = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { auth, tenant } = context(request);
    const input = UpdateWorkflowRuleSchema.parse(request.body);
    return reply.code(200).send(
      dataEnvelope(
        await this.service.updateWorkflowRule(
          tenant,
          { userId: auth.userId, ip: request.ip },
          request.params.id,
          input,
        ),
        request.id,
      ),
    );
  };

  activateWorkflowRule = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { auth, tenant } = context(request);
    return reply.code(200).send(
      dataEnvelope(
        await this.service.setWorkflowRuleActive(
          tenant,
          { userId: auth.userId, ip: request.ip },
          request.params.id,
          true,
        ),
        request.id,
      ),
    );
  };

  deactivateWorkflowRule = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { auth, tenant } = context(request);
    return reply.code(200).send(
      dataEnvelope(
        await this.service.setWorkflowRuleActive(
          tenant,
          { userId: auth.userId, ip: request.ip },
          request.params.id,
          false,
        ),
        request.id,
      ),
    );
  };

  evaluateWorkflowRules = async (request: FastifyRequest, reply: FastifyReply) => {
    const { auth, tenant } = context(request);
    const input = EvaluateWorkflowRulesSchema.parse(request.body);
    return reply.code(200).send(
      dataEnvelope(
        await this.service.evaluateWorkflowRules(
          tenant,
          { userId: auth.userId, ip: request.ip },
          input,
        ),
        request.id,
      ),
    );
  };

}
