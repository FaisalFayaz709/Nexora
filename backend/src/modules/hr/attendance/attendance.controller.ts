import type { FastifyReply, FastifyRequest } from 'fastify';
import { AttendanceListQuerySchema } from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../../core/http/envelope.js';
import { AppError } from '../../../core/http/errors.js';
import type { AttendanceService } from './attendance.service.js';
function ctx(request: FastifyRequest) { if (!request.auth || !request.tenant) throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Authorization pipeline was not initialized.'); return { auth: request.auth, tenant: request.tenant }; }
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}
  list = async (request: FastifyRequest, reply: FastifyReply) => { const { tenant } = ctx(request); const query = AttendanceListQuerySchema.parse(request.query); const result = await this.service.list(tenant, query); return reply.code(200).send(listEnvelope(result.rows, { page: result.page, pageSize: result.pageSize, total: result.total, requestId: request.id })); };
  get = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => { const { tenant } = ctx(request); return reply.code(200).send(dataEnvelope(await this.service.get(tenant, request.params.id), request.id)); };
}
