import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  AssignTicketSchema, AssignWorkOrderSchema, CloseTicketSchema,
  CompleteWorkOrderRequestSchema, CreateServiceReportSchema,
  CreateTicketRequestSchema, CreateWorkOrderSchema, ResolveTicketSchema,
  TechnicianCheckInSchema, TechnicianCheckOutSchema, TechnicianLocationSchema,
  TechnicianOfflineSyncBatchSchema, TicketListQuerySchema, UpdateTicketSchema, UpdateWorkOrderSchema,
  WorkOrderCommandNoteSchema, WorkOrderListQuerySchema,
} from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import { FieldServiceService } from './field-service.service.js';

function ctx(request:FastifyRequest){if(!request.auth||!request.tenant)throw new AppError(500,'AUTH_PIPELINE_INVALID','Authorization pipeline was not initialized.');return{auth:request.auth,tenant:request.tenant};}
function actor(request:FastifyRequest){const {auth}=ctx(request);return{userId:auth.userId,ip:request.ip};}

export class FieldServiceController {
  constructor(private readonly service:FieldServiceService) {}
  listTickets=async(request:FastifyRequest,reply:FastifyReply)=>{const {tenant}=ctx(request);const q=TicketListQuerySchema.parse(request.query);const r=await this.service.listTickets(tenant,q);return reply.code(200).send(listEnvelope(r.rows,{page:r.page,pageSize:r.pageSize,total:r.total,requestId:request.id}));};
  getTicket=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {tenant}=ctx(request);return reply.code(200).send(dataEnvelope(await this.service.getTicket(tenant,request.params.id),request.id));};
  createTicket=async(request:FastifyRequest,reply:FastifyReply)=>{const {tenant}=ctx(request);const input=CreateTicketRequestSchema.parse(request.body);return reply.code(201).send(dataEnvelope(await this.service.createTicket(tenant,actor(request),input),request.id));};
  updateTicket=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {tenant}=ctx(request);const input=UpdateTicketSchema.parse(request.body);return reply.code(200).send(dataEnvelope(await this.service.updateTicket(tenant,actor(request),request.params.id,input),request.id));};
  assignTicket=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {tenant}=ctx(request);const input=AssignTicketSchema.parse(request.body);return reply.code(200).send(dataEnvelope(await this.service.assignTicket(tenant,actor(request),request.params.id,input.assigneeId),request.id));};
  resolveTicket=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {tenant}=ctx(request);const input=ResolveTicketSchema.parse(request.body);return reply.code(200).send(dataEnvelope(await this.service.resolveTicket(tenant,actor(request),request.params.id,input.resolution),request.id));};
  closeTicket=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {tenant}=ctx(request);const input=CloseTicketSchema.parse(request.body);return reply.code(200).send(dataEnvelope(await this.service.closeTicket(tenant,actor(request),request.params.id,input),request.id));};
  listWorkOrders=async(request:FastifyRequest,reply:FastifyReply)=>{const {tenant}=ctx(request);const q=WorkOrderListQuerySchema.parse(request.query);const r=await this.service.listWorkOrders(tenant,q);return reply.code(200).send(listEnvelope(r.rows,{page:r.page,pageSize:r.pageSize,total:r.total,requestId:request.id}));};
  getWorkOrder=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {tenant}=ctx(request);return reply.code(200).send(dataEnvelope(await this.service.getWorkOrder(tenant,request.params.id),request.id));};
  createWorkOrder=async(request:FastifyRequest,reply:FastifyReply)=>{const {tenant}=ctx(request);const input=CreateWorkOrderSchema.parse(request.body);return reply.code(201).send(dataEnvelope(await this.service.createWorkOrder(tenant,actor(request),input),request.id));};
  updateWorkOrder=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {tenant}=ctx(request);const input=UpdateWorkOrderSchema.parse(request.body);return reply.code(200).send(dataEnvelope(await this.service.updateWorkOrder(tenant,actor(request),request.params.id,input),request.id));};
  assignWorkOrder=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {tenant}=ctx(request);const input=AssignWorkOrderSchema.parse(request.body);return reply.code(200).send(dataEnvelope(await this.service.assignWorkOrder(tenant,actor(request),request.params.id,input),request.id));};
  acceptWorkOrder=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);return reply.code(200).send(dataEnvelope(await this.service.acceptWorkOrder(tenant,auth.userId,request.params.id),request.id));};
  startTravel=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);const input=WorkOrderCommandNoteSchema.parse(request.body??{});return reply.code(200).send(dataEnvelope(await this.service.technicianCommand(tenant,auth.userId,request.params.id,'start-travel',input.note),request.id));};
  arrive=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);const input=WorkOrderCommandNoteSchema.parse(request.body??{});return reply.code(200).send(dataEnvelope(await this.service.technicianCommand(tenant,auth.userId,request.params.id,'arrive',input.note),request.id));};
  start=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);const input=WorkOrderCommandNoteSchema.parse(request.body??{});return reply.code(200).send(dataEnvelope(await this.service.technicianCommand(tenant,auth.userId,request.params.id,'start',input.note),request.id));};
  serviceReport=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {tenant}=ctx(request);const input=CreateServiceReportSchema.parse(request.body);return reply.code(201).send(dataEnvelope(await this.service.createServiceReport(tenant,actor(request),request.params.id,input),request.id));};
  complete=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {tenant}=ctx(request);const input=CompleteWorkOrderRequestSchema.parse(request.body);return reply.code(200).send(dataEnvelope(await this.service.completeWorkOrder(tenant,actor(request),request.params.id,input),request.id));};
  checkIn=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {tenant}=ctx(request);const input=TechnicianCheckInSchema.parse(request.body??{});return reply.code(201).send(dataEnvelope(await this.service.checkIn(tenant,actor(request),request.params.id,input),request.id));};
  location=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {tenant}=ctx(request);const input=TechnicianLocationSchema.parse(request.body);return reply.code(201).send(dataEnvelope(await this.service.recordLocation(tenant,actor(request),request.params.id,input),request.id));};
  checkOut=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {tenant}=ctx(request);const input=TechnicianCheckOutSchema.parse(request.body??{});return reply.code(201).send(dataEnvelope(await this.service.checkOut(tenant,actor(request),request.params.id,input),request.id));};
  syncTechnicianOffline=async(request:FastifyRequest,reply:FastifyReply)=>{const {tenant}=ctx(request);const input=TechnicianOfflineSyncBatchSchema.parse(request.body);return reply.code(200).send(dataEnvelope(await this.service.syncTechnicianOffline(tenant,actor(request),input),request.id));};
}
