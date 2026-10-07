import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuditLogQuerySchema, CalendarQuerySchema, GlobalSearchQuerySchema, UuidSchema } from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import { PlatformRuntimeService } from './platform-runtime.service.js';

function ctx(request: FastifyRequest) {
  if (!request.auth || !request.tenant) throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Authorization pipeline was not initialized.');
  return { auth: request.auth, tenant: request.tenant };
}
export class PlatformRuntimeController {
  constructor(private readonly service: PlatformRuntimeService) {}
  search = async (request: FastifyRequest, reply: FastifyReply) => {
    const { auth, tenant } = ctx(request);
    const q = GlobalSearchQuerySchema.parse(request.query);
    const result = await this.service.search(tenant, auth, q);
    return reply.code(200).send(listEnvelope(result.rows, { page: result.page, pageSize: result.pageSize, total: result.total, requestId: request.id }));
  };
  calendar = async (request: FastifyRequest, reply: FastifyReply) => {
    const { auth, tenant } = ctx(request);
    const q = CalendarQuerySchema.parse(request.query);
    const result = await this.service.calendar(tenant, auth, q);
    return reply.code(200).send(listEnvelope(result.rows, { page: result.page, pageSize: result.pageSize, total: result.total, requestId: request.id }));
  };
  auditLogs = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const q = AuditLogQuerySchema.parse(request.query);
    const result = await this.service.auditLogs(tenant, q);
    return reply.code(200).send(listEnvelope(result.rows, { page: result.page, pageSize: result.pageSize, total: result.total, requestId: request.id }));
  };
  auditLog = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const id = UuidSchema.parse(request.params.id);
    return reply.code(200).send(dataEnvelope(await this.service.auditLog(tenant, id), request.id));
  };
}
