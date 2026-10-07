import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  CompleteProjectHandoverSchema,
  CreateMaterialRequirementSchema,
  CreateProjectRequestSchema,
  CreateProjectTaskSchema,
  ProjectListQuerySchema,
  ProjectTaskListQuerySchema,
  ProjectTimelineQuerySchema,
  UpdateProjectSchema,
  UpdateProjectTaskSchema,
  UpsertProjectBomSchema,
  UpsertProjectBudgetSchema,
} from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import { ProjectService } from './project.service.js';

function ctx(request: FastifyRequest) {
  if (!request.auth || !request.tenant) {
    throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Authorization pipeline was not initialized.');
  }
  return { auth: request.auth, tenant: request.tenant };
}

function actor(request: FastifyRequest) {
  const { auth } = ctx(request);
  return { userId: auth.userId, ip: request.ip };
}

export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const query = ProjectListQuerySchema.parse(request.query);
    const result = await this.service.list(tenant, query);
    return reply.code(200).send(listEnvelope(result.rows, {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      requestId: request.id,
    }));
  };

  get = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    return reply.code(200).send(
      dataEnvelope(await this.service.get(tenant, request.params.id), request.id),
    );
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const input = CreateProjectRequestSchema.parse(request.body);
    const row = await this.service.create(tenant, actor(request), input);
    return reply.code(201).send(
      dataEnvelope({
        id: row.id,
        projectNo: row.projectNo,
        status: row.status,
      }, request.id),
    );
  };

  update = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    const input = UpdateProjectSchema.parse(request.body);
    return reply.code(200).send(
      dataEnvelope(
        await this.service.update(tenant, actor(request), request.params.id, input),
        request.id,
      ),
    );
  };

  listTasks = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const query = ProjectTaskListQuerySchema.parse(request.query);
    const result = await this.service.listTasks(tenant, query);
    return reply.code(200).send(listEnvelope(result.rows, {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      requestId: request.id,
    }));
  };

  getTask = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    return reply.code(200).send(
      dataEnvelope(await this.service.getTask(tenant, request.params.id), request.id),
    );
  };

  createTask = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const input = CreateProjectTaskSchema.parse(request.body);
    return reply.code(201).send(
      dataEnvelope(await this.service.createTask(tenant, actor(request), input), request.id),
    );
  };

  updateTask = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    const input = UpdateProjectTaskSchema.parse(request.body);
    return reply.code(200).send(
      dataEnvelope(
        await this.service.updateTask(tenant, actor(request), request.params.id, input),
        request.id,
      ),
    );
  };

  getBom = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    return reply.code(200).send(
      dataEnvelope(await this.service.getBom(tenant, request.params.id), request.id),
    );
  };

  upsertBom = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    const input = UpsertProjectBomSchema.parse(request.body);
    return reply.code(200).send(
      dataEnvelope(
        await this.service.upsertBom(tenant, actor(request), request.params.id, input),
        request.id,
      ),
    );
  };

  approveBom = async (
    request: FastifyRequest<{ Params: { id: string; bomId: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    return reply.code(200).send(
      dataEnvelope(
        await this.service.approveBom(
          tenant,
          actor(request),
          request.params.id,
          request.params.bomId,
        ),
        request.id,
      ),
    );
  };

  budget = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    return reply.code(200).send(
      dataEnvelope(await this.service.budget(tenant, request.params.id), request.id),
    );
  };

  upsertBudget = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    const input = UpsertProjectBudgetSchema.parse(request.body);
    return reply.code(200).send(
      dataEnvelope(
        await this.service.upsertBudget(tenant, actor(request), request.params.id, input),
        request.id,
      ),
    );
  };

  approveBudget = async (
    request: FastifyRequest<{ Params: { id: string; budgetId: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    return reply.code(200).send(
      dataEnvelope(
        await this.service.approveBudget(
          tenant,
          actor(request),
          request.params.id,
          request.params.budgetId,
        ),
        request.id,
      ),
    );
  };

  materialRequest = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    const input = CreateMaterialRequirementSchema.parse(request.body ?? {});
    return reply.code(201).send(
      dataEnvelope(
        await this.service.createMaterialRequirement(
          tenant,
          actor(request),
          request.params.id,
          input,
        ),
        request.id,
      ),
    );
  };

  costing = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    return reply.code(200).send(
      dataEnvelope(await this.service.costing(tenant, request.params.id), request.id),
    );
  };

  handover = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    const input = CompleteProjectHandoverSchema.parse(request.body);
    return reply.code(201).send(
      dataEnvelope(
        await this.service.handover(tenant, actor(request), request.params.id, input),
        request.id,
      ),
    );
  };

  timeline = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    const query = ProjectTimelineQuerySchema.parse(request.query ?? {});
    return reply.code(200).send(
      dataEnvelope(
        await this.service.timeline(tenant, request.params.id, query.limit),
        request.id,
      ),
    );
  };
}
