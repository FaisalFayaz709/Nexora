import type { FastifyReply, FastifyRequest } from 'fastify';
import { CommunicationListQuerySchema, SendCommunicationSchema } from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import { CommunicationService } from './communication.service.js';

function ctx(request: FastifyRequest) {
  if (!request.auth || !request.tenant) throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Authorization pipeline was not initialized.');
  return { auth: request.auth, tenant: request.tenant };
}
function actor(request: FastifyRequest) { const { auth } = ctx(request); return { userId: auth.userId, ip: request.ip }; }

export class CommunicationController {
  constructor(private readonly service: CommunicationService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const query = CommunicationListQuerySchema.parse(request.query);
    const result = await this.service.list(tenant, query);
    return reply.code(200).send(listEnvelope(result.rows, { page: result.page, pageSize: result.pageSize, total: result.total, requestId: request.id }));
  };

  send = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const input = SendCommunicationSchema.parse(request.body);
    return reply.code(201).send(dataEnvelope(await this.service.send(tenant, actor(request), input), request.id));
  };

  delivery = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    return reply.code(200).send(dataEnvelope(await this.service.delivery(tenant, request.params.id), request.id));
  };
}
