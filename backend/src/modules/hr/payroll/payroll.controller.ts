import type { FastifyReply, FastifyRequest } from 'fastify';
import { CreatePayrollRunSchema, PayrollApproveSchema, PayrollCalculateSchema, PayrollPostSchema, PayrollRunListQuerySchema } from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../../core/http/envelope.js';
import { AppError } from '../../../core/http/errors.js';
import type { PayrollService } from './payroll.service.js';
function ctx(request: FastifyRequest) { if (!request.auth || !request.tenant) throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Authorization pipeline was not initialized.'); return { auth: request.auth, tenant: request.tenant }; }
function actor(request: FastifyRequest) { const { auth } = ctx(request); return { userId: auth.userId, ip: request.ip }; }
export class PayrollController { constructor(private readonly service: PayrollService) {}
  list = async (request: FastifyRequest, reply: FastifyReply) => { const { tenant } = ctx(request); const query = PayrollRunListQuerySchema.parse(request.query); const result = await this.service.list(tenant, query); return reply.code(200).send(listEnvelope(result.rows, { page: result.page, pageSize: result.pageSize, total: result.total, requestId: request.id })); };
  get = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => { const { tenant } = ctx(request); return reply.code(200).send(dataEnvelope(await this.service.get(tenant, request.params.id), request.id)); };
  create = async (request: FastifyRequest, reply: FastifyReply) => { const { tenant } = ctx(request); return reply.code(201).send(dataEnvelope(await this.service.create(tenant, actor(request), CreatePayrollRunSchema.parse(request.body)), request.id)); };
  calculate = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => { const { tenant } = ctx(request); return reply.code(200).send(dataEnvelope(await this.service.calculate(tenant, actor(request), request.params.id, PayrollCalculateSchema.parse(request.body ?? {})), request.id)); };
  approve = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => { const { tenant } = ctx(request); const input = PayrollApproveSchema.parse(request.body ?? {}); return reply.code(200).send(dataEnvelope(await this.service.approve(tenant, actor(request), request.params.id, input.comment ?? null), request.id)); };
  post = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => { const { tenant } = ctx(request); const input = PayrollPostSchema.parse(request.body ?? {}); return reply.code(200).send(dataEnvelope(await this.service.post(tenant, actor(request), request.params.id, input, String(request.headers['idempotency-key'] ?? '')), request.id)); };
}
