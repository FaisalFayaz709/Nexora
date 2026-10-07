import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  DashboardWidgetCreateSchema,
  ReportBuilderListQuerySchema,
  ReportTemplateCreateSchema,
  ReportTemplateUpdateSchema,
  SavedReportCreateSchema,
  SavedReportUpdateSchema,
  SavedViewCreateSchema,
  SavedViewUpdateSchema,
  ScheduledReportCreateSchema,
  ScheduledReportUpdateSchema,
  UuidSchema,
} from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import { ReportBuilderService } from './report-builder.service.js';

function ctx(request: FastifyRequest) {
  if (!request.auth || !request.tenant) throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Authorization pipeline was not initialized.');
  return { auth: request.auth, tenant: request.tenant };
}
function actor(request: FastifyRequest) { const { auth } = ctx(request); return { userId: auth.userId, ip: request.ip, permissions: (auth as typeof auth & { permissions?: string[] }).permissions ?? [] }; }
function actorRead(request: FastifyRequest) { const { auth } = ctx(request); return { userId: auth.userId, permissions: (auth as typeof auth & { permissions?: string[] }).permissions ?? [] }; }
function sendList(reply: FastifyReply, request: FastifyRequest, result: { rows: unknown[]; page: number; pageSize: number; total: number }) { return reply.code(200).send(listEnvelope(result.rows, { page: result.page, pageSize: result.pageSize, total: result.total, requestId: request.id })); }

export class ReportBuilderController {
  constructor(private readonly service: ReportBuilderService) {}

  listTemplates = async (request: FastifyRequest, reply: FastifyReply) => { const { tenant } = ctx(request); const result = await this.service.listTemplates(tenant, actorRead(request), ReportBuilderListQuerySchema.parse(request.query)); return sendList(reply, request, result); };
  getTemplate = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => { const { tenant } = ctx(request); return reply.code(200).send(dataEnvelope(await this.service.getTemplateDetail(tenant, actorRead(request), UuidSchema.parse(request.params.id)), request.id)); };
  createTemplate = async (request: FastifyRequest, reply: FastifyReply) => { const { tenant } = ctx(request); const input = ReportTemplateCreateSchema.parse(request.body); return reply.code(201).send(dataEnvelope(await this.service.createTemplate(tenant, actor(request), input), request.id)); };
  updateTemplate = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => { const { tenant } = ctx(request); const input = ReportTemplateUpdateSchema.parse(request.body); return reply.code(200).send(dataEnvelope(await this.service.updateTemplate(tenant, actor(request), UuidSchema.parse(request.params.id), input), request.id)); };

  listSavedReports = async (request: FastifyRequest, reply: FastifyReply) => { const { tenant } = ctx(request); const result = await this.service.listSavedReports(tenant, actorRead(request), ReportBuilderListQuerySchema.parse(request.query)); return sendList(reply, request, result); };
  getSavedReport = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => { const { tenant } = ctx(request); return reply.code(200).send(dataEnvelope(await this.service.getSavedReportDetail(tenant, actorRead(request), UuidSchema.parse(request.params.id)), request.id)); };
  createSavedReport = async (request: FastifyRequest, reply: FastifyReply) => { const { tenant } = ctx(request); const input = SavedReportCreateSchema.parse(request.body); return reply.code(201).send(dataEnvelope(await this.service.createSavedReport(tenant, actor(request), input), request.id)); };
  updateSavedReport = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => { const { tenant } = ctx(request); const input = SavedReportUpdateSchema.parse(request.body); return reply.code(200).send(dataEnvelope(await this.service.updateSavedReport(tenant, actor(request), UuidSchema.parse(request.params.id), input), request.id)); };

  listScheduledReports = async (request: FastifyRequest, reply: FastifyReply) => { const { tenant } = ctx(request); const result = await this.service.listScheduledReports(tenant, actorRead(request), ReportBuilderListQuerySchema.parse(request.query)); return sendList(reply, request, result); };
  getScheduledReport = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => { const { tenant } = ctx(request); return reply.code(200).send(dataEnvelope(await this.service.getScheduledReportDetail(tenant, actorRead(request), UuidSchema.parse(request.params.id)), request.id)); };
  createScheduledReport = async (request: FastifyRequest, reply: FastifyReply) => { const { tenant } = ctx(request); const input = ScheduledReportCreateSchema.parse(request.body); return reply.code(201).send(dataEnvelope(await this.service.createScheduledReport(tenant, actor(request), input), request.id)); };
  updateScheduledReport = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => { const { tenant } = ctx(request); const input = ScheduledReportUpdateSchema.parse(request.body); return reply.code(200).send(dataEnvelope(await this.service.updateScheduledReport(tenant, actor(request), UuidSchema.parse(request.params.id), input), request.id)); };

  listReportExecutions = async (request: FastifyRequest, reply: FastifyReply) => { const { tenant } = ctx(request); const result = await this.service.listReportExecutions(tenant, actorRead(request), ReportBuilderListQuerySchema.parse(request.query)); return sendList(reply, request, result); };
  getExecution = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => { const { tenant } = ctx(request); return reply.code(200).send(dataEnvelope(await this.service.getExecution(tenant, actorRead(request), UuidSchema.parse(request.params.id)), request.id)); };

  listDashboardWidgets = async (request: FastifyRequest, reply: FastifyReply) => { const { tenant } = ctx(request); const result = await this.service.listDashboardWidgets(tenant, actorRead(request), ReportBuilderListQuerySchema.parse(request.query)); return sendList(reply, request, result); };
  createDashboardWidget = async (request: FastifyRequest, reply: FastifyReply) => { const { tenant } = ctx(request); const input = DashboardWidgetCreateSchema.parse(request.body); return reply.code(201).send(dataEnvelope(await this.service.createDashboardWidget(tenant, actor(request), input), request.id)); };

  listSavedViews = async (request: FastifyRequest, reply: FastifyReply) => { const { tenant } = ctx(request); const result = await this.service.listSavedViews(tenant, actorRead(request), ReportBuilderListQuerySchema.parse(request.query)); return sendList(reply, request, result); };
  getSavedView = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => { const { tenant } = ctx(request); return reply.code(200).send(dataEnvelope(await this.service.getSavedView(tenant, actorRead(request), UuidSchema.parse(request.params.id)), request.id)); };
  createSavedView = async (request: FastifyRequest, reply: FastifyReply) => { const { tenant } = ctx(request); const input = SavedViewCreateSchema.parse(request.body); return reply.code(201).send(dataEnvelope(await this.service.createSavedView(tenant, actor(request), input), request.id)); };
  updateSavedView = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => { const { tenant } = ctx(request); const input = SavedViewUpdateSchema.parse(request.body); return reply.code(200).send(dataEnvelope(await this.service.updateSavedView(tenant, actor(request), UuidSchema.parse(request.params.id), input), request.id)); };
}
