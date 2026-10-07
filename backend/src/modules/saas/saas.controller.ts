import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  CreateSaaSInvoiceSchema,
  CreateSaaSPlanSchema,
  CreateSaaSSubscriptionSchema,
  PostSaaSInvoiceSchema,
  SaaSUsageCollectionSchema,
  SaaSUsageQuerySchema,
  UpdateSaaSInvoiceSchema,
  UpdateSaaSPlanSchema,
  UpdateSaaSSubscriptionSchema,
  UuidSchema,
} from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import { SaaSService } from './saas.service.js';
function auth(request: FastifyRequest){ if(!request.auth || !request.tenant) throw new AppError(500,'AUTH_PIPELINE_INVALID','Authorization pipeline was not initialized.'); return { userId: request.auth.userId, organizationId: request.tenant.organizationId, ip: request.ip }; }
function sendList(reply: FastifyReply, request: FastifyRequest, result: { rows: unknown[]; page: number; pageSize: number; total: number }) { return reply.code(200).send(listEnvelope(result.rows,{page:result.page,pageSize:result.pageSize,total:result.total,requestId:request.id})); }
export class SaaSController { constructor(private readonly service:SaaSService) {}
  plans=async(request:FastifyRequest,reply:FastifyReply)=>sendList(reply, request, await this.service.plans(request.query));
  createPlan=async(request:FastifyRequest,reply:FastifyReply)=>reply.code(201).send(dataEnvelope(await this.service.createPlan(auth(request),CreateSaaSPlanSchema.parse(request.body)),request.id));
  planDetail=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>reply.code(200).send(dataEnvelope(await this.service.planDetail(UuidSchema.parse(request.params.id)),request.id));
  updatePlan=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>reply.code(200).send(dataEnvelope(await this.service.updatePlan(auth(request),UuidSchema.parse(request.params.id),UpdateSaaSPlanSchema.parse(request.body)),request.id));
  subscriptions=async(request:FastifyRequest,reply:FastifyReply)=>sendList(reply, request, await this.service.subscriptions(request.query));
  subscribe=async(request:FastifyRequest,reply:FastifyReply)=>{const a=auth(request); const input=CreateSaaSSubscriptionSchema.parse(request.body); return reply.code(201).send(dataEnvelope(await this.service.subscribe(a,input),request.id));};
  subscriptionDetail=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>reply.code(200).send(dataEnvelope(await this.service.subscriptionDetail(UuidSchema.parse(request.params.id)),request.id));
  updateSubscription=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>reply.code(200).send(dataEnvelope(await this.service.updateSubscription(auth(request),UuidSchema.parse(request.params.id),UpdateSaaSSubscriptionSchema.parse(request.body)),request.id));
  usage=async(request:FastifyRequest,reply:FastifyReply)=>{const q=SaaSUsageQuerySchema.parse(request.query); const result=await this.service.usage(q); return sendList(reply, request, result);};
  usageDetail=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>reply.code(200).send(dataEnvelope(await this.service.usageDetail(UuidSchema.parse(request.params.id)),request.id));
  collectUsage=async(request:FastifyRequest,reply:FastifyReply)=>reply.code(201).send(dataEnvelope(await this.service.collectUsage(auth(request),SaaSUsageCollectionSchema.parse(request.body)),request.id));
  invoices=async(request:FastifyRequest,reply:FastifyReply)=>sendList(reply, request, await this.service.invoices(request.query));
  createInvoice=async(request:FastifyRequest,reply:FastifyReply)=>reply.code(201).send(dataEnvelope(await this.service.createInvoice(auth(request),CreateSaaSInvoiceSchema.parse(request.body)),request.id));
  invoiceDetail=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>reply.code(200).send(dataEnvelope(await this.service.invoiceDetail(UuidSchema.parse(request.params.id)),request.id));
  updateInvoice=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>reply.code(200).send(dataEnvelope(await this.service.updateInvoice(auth(request),UuidSchema.parse(request.params.id),UpdateSaaSInvoiceSchema.parse(request.body)),request.id));
  postInvoice=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const a=auth(request); const input=PostSaaSInvoiceSchema.parse(request.body); return reply.code(200).send(dataEnvelope(await this.service.postInvoice(a,UuidSchema.parse(request.params.id),input),request.id));};
}
