import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  CreateStockCountSchema,
  PostStockCountSchema,
  StartStockCountSchema,
  StockCountQuerySchema,
  SubmitStockCountSchema,
} from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../../core/http/envelope.js';
import { AppError } from '../../../core/http/errors.js';
import type { StockCountService } from './stock-count.service.js';

function context(request: FastifyRequest) {
  if (!request.auth || !request.tenant) throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Tenant authorization pipeline was not initialized.');
  return { auth: request.auth, tenant: request.tenant };
}

export class StockCountController {
  constructor(private readonly service: StockCountService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = context(request);
    const result = await this.service.list(tenant, StockCountQuerySchema.parse(request.query));
    return reply.code(200).send(listEnvelope(result.rows, {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      requestId: request.id,
    }));
  };

  get = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { tenant } = context(request);
    return reply.code(200).send(dataEnvelope(await this.service.get(tenant, request.params.id), request.id));
  };

  countSheet = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { tenant } = context(request);
    return reply.code(200).send(dataEnvelope(await this.service.countSheet(tenant, request.params.id), request.id));
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const { auth, tenant } = context(request); const input = CreateStockCountSchema.parse(request.body);
    return reply.code(201).send(dataEnvelope(await this.service.create(tenant, { userId: auth.userId, ip: request.ip }, input), request.id));
  };

  start = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { auth, tenant } = context(request);
    const input = StartStockCountSchema.parse(request.body ?? {});
    return reply.code(200).send(dataEnvelope(
      await this.service.start(tenant, { userId: auth.userId, ip: request.ip }, request.params.id, input.productIds),
      request.id,
    ));
  };

  submit = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { auth, tenant } = context(request); const input = SubmitStockCountSchema.parse(request.body);
    return reply.code(200).send(dataEnvelope(await this.service.submit(tenant, { userId: auth.userId, ip: request.ip }, request.params.id, input), request.id));
  };

  post = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { auth, tenant } = context(request); const input = PostStockCountSchema.parse(request.body ?? {});
    return reply.code(200).send(dataEnvelope(await this.service.post(tenant, { userId: auth.userId, ip: request.ip }, request.params.id, input.comment), request.id));
  };
}
