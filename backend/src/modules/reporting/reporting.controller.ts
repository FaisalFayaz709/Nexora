import type { FastifyReply, FastifyRequest } from 'fastify';
import { ReportListQuerySchema, RequestReportExportSchema, UuidSchema } from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import { ReportingService } from './reporting.service.js';
function ctx(request: FastifyRequest) { if (!request.auth || !request.tenant) throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Authorization pipeline was not initialized.'); return { auth: request.auth, tenant: request.tenant }; }
export class ReportingController {
  constructor(private readonly service: ReportingService) {}
  list = async (request: FastifyRequest, reply: FastifyReply) => { const { auth, tenant } = ctx(request); const q=ReportListQuerySchema.parse(request.query); const result=await this.service.list(tenant, { userId: auth.userId, permissions: (auth as typeof auth & { permissions?: string[] }).permissions ?? [] }, q); return reply.code(200).send(listEnvelope(result.rows,{page:result.page,pageSize:result.pageSize,total:result.total,requestId:request.id})); };
  detail = async (request: FastifyRequest<{Params:{id:string}}>, reply: FastifyReply) => { const { tenant } = ctx(request); return reply.code(200).send(dataEnvelope(await this.service.detail(tenant, { userId: request.auth!.userId, permissions: (request.auth as typeof request.auth & { permissions?: string[] }).permissions ?? [] }, UuidSchema.parse(request.params.id)), request.id)); };
  requestExport = async (request: FastifyRequest, reply: FastifyReply) => { const { auth, tenant } = ctx(request); const input=RequestReportExportSchema.parse(request.body); return reply.code(202).send(dataEnvelope(await this.service.requestExport(tenant,{userId:auth.userId,ip:request.ip,permissions:(auth as typeof auth & { permissions?: string[] }).permissions ?? []},input), request.id)); };
  exportStatus = async (request: FastifyRequest<{Params:{jobId:string}}>, reply: FastifyReply) => { const { tenant } = ctx(request); return reply.code(200).send(dataEnvelope(await this.service.exportStatus(tenant, { userId: request.auth!.userId, permissions: (request.auth as typeof request.auth & { permissions?: string[] }).permissions ?? [] }, UuidSchema.parse(request.params.jobId)), request.id)); };
}
