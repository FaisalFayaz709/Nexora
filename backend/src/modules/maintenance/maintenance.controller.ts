import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  CompleteMaintenanceExecutionSchema,
  CreateMaintenancePlanSchema,
  IdempotencyKeySchema,
  MaintenancePlanListQuerySchema,
  MaintenanceScheduleQuerySchema,
} from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import { MaintenanceService } from './maintenance.service.js';

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

export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  listPlans = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const query = MaintenancePlanListQuerySchema.parse(request.query);
    const result = await this.service.listPlans(tenant, query);
    return reply.code(200).send(listEnvelope(result.rows, { page: result.page, pageSize: result.pageSize, total: result.total, requestId: request.id }));
  };

  createPlan = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const input = CreateMaintenancePlanSchema.parse(request.body);
    return reply.code(201).send(dataEnvelope(await this.service.createPlan(tenant, actor(request), input), request.id));
  };

  schedule = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const query = MaintenanceScheduleQuerySchema.parse(request.query);
    const result = await this.service.schedule(tenant, query);
    return reply.code(200).send(listEnvelope(result.rows, { page: result.page, pageSize: result.pageSize, total: result.total, requestId: request.id }));
  };

  generateWorkOrder = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    const key = IdempotencyKeySchema.parse(request.headers['idempotency-key']);
    return reply.code(201).send(dataEnvelope(await this.service.generateWorkOrder(tenant, actor(request), request.params.id, key), request.id));
  };

  completeExecution = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    const input = CompleteMaintenanceExecutionSchema.parse(request.body);
    return reply.code(200).send(dataEnvelope(await this.service.completeExecution(tenant, actor(request), request.params.id, input), request.id));
  };
}
