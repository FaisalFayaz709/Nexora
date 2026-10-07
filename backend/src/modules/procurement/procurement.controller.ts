import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  ApprovePurchaseRequestRequestSchema,
  CancelPurchaseOrderSchema,
  CreatePurchaseOrderSchema,
  CreatePurchaseRequestRequestSchema,
  CreateRfqFromPurchaseRequestSchema,
  CreateRfqSchema,
  CreateSupplierQuotationSchema,
  IdempotencyKeySchema,
  InspectGoodsReceiptSchema,
  InviteVendorsSchema,
  ProcurementListQuerySchema,
  PurchaseOrderCommandSchema,
  PurchaseRequestCommandSchema,
  ReceiveGoodsCommandSchema,
  RejectPurchaseRequestSchema,
  SelectQuotationSchema,
  UpdatePurchaseRequestSchema,
} from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import type { ProcurementService } from './procurement.service.js';

function ctx(request:FastifyRequest){if(!request.auth||!request.tenant)throw new AppError(500,'AUTH_PIPELINE_INVALID','Tenant authorization pipeline is not initialized.');return {auth:request.auth,tenant:request.tenant};}
export class ProcurementController {
  constructor(private readonly service:ProcurementService){}
  listPr=async(request:FastifyRequest,reply:FastifyReply)=>{const {tenant}=ctx(request);const r=await this.service.listPr(tenant,ProcurementListQuerySchema.parse(request.query));return reply.code(200).send(listEnvelope(r.rows,{page:r.page,pageSize:r.pageSize,total:r.total,requestId:request.id}));};
  createPr=async(request:FastifyRequest,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);return reply.code(201).send(dataEnvelope(await this.service.createPr(tenant,auth.userId,CreatePurchaseRequestRequestSchema.parse(request.body)),request.id));};
  getPr=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {tenant}=ctx(request);return reply.code(200).send(dataEnvelope(await this.service.getPr(tenant,request.params.id),request.id));};
  updatePr=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);return reply.code(200).send(dataEnvelope(await this.service.updatePr(tenant,auth.userId,request.params.id,UpdatePurchaseRequestSchema.parse(request.body)),request.id));};
  submitPr=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);PurchaseRequestCommandSchema.partial().parse(request.body??{});return reply.code(200).send(dataEnvelope(await this.service.submitPr(tenant,auth.userId,request.params.id),request.id));};
  approvePr=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);const b=ApprovePurchaseRequestRequestSchema.parse(request.body);return reply.code(200).send(dataEnvelope(await this.service.decidePr(tenant,auth.userId,request.params.id,true,b.comment),request.id));};
  rejectPr=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);const b=RejectPurchaseRequestSchema.parse(request.body);return reply.code(200).send(dataEnvelope(await this.service.decidePr(tenant,auth.userId,request.params.id,false,b.comment),request.id));};
  createRfqFromPr=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);const b=CreateRfqFromPurchaseRequestSchema.parse(request.body);return reply.code(201).send(dataEnvelope(await this.service.createRfqFromPr(tenant,auth.userId,request.params.id,b),request.id));};
  listRfqs=async(request:FastifyRequest,reply:FastifyReply)=>{const {tenant}=ctx(request);const r=await this.service.listRfqs(tenant,ProcurementListQuerySchema.parse(request.query));return reply.code(200).send(listEnvelope(r.rows,{page:r.page,pageSize:r.pageSize,total:r.total,requestId:request.id}));};
  createRfq=async(request:FastifyRequest,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);return reply.code(201).send(dataEnvelope(await this.service.createRfq(tenant,auth.userId,CreateRfqSchema.parse(request.body)),request.id));};
  inviteVendors=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);const b=InviteVendorsSchema.parse(request.body);return reply.code(200).send(dataEnvelope(await this.service.inviteVendors(tenant,auth.userId,request.params.id,b.vendorIds),request.id));};
  publishRfq=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);return reply.code(200).send(dataEnvelope(await this.service.publishRfq(tenant,auth.userId,request.params.id),request.id));};
  closeRfq=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);return reply.code(200).send(dataEnvelope(await this.service.closeRfq(tenant,auth.userId,request.params.id),request.id));};
  comparison=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {tenant}=ctx(request);return reply.code(200).send(dataEnvelope(await this.service.comparison(tenant,request.params.id),request.id));};
  createQuotation=async(request:FastifyRequest,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);return reply.code(201).send(dataEnvelope(await this.service.createQuotation(tenant,auth.userId,CreateSupplierQuotationSchema.parse(request.body)),request.id));};
  selectQuotation=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);const b=SelectQuotationSchema.parse(request.body??{});return reply.code(200).send(dataEnvelope(await this.service.selectQuotation(tenant,auth.userId,request.params.id,b.comment),request.id));};
  listPos=async(request:FastifyRequest,reply:FastifyReply)=>{const {tenant}=ctx(request);const r=await this.service.listPos(tenant,ProcurementListQuerySchema.parse(request.query));return reply.code(200).send(listEnvelope(r.rows,{page:r.page,pageSize:r.pageSize,total:r.total,requestId:request.id}));};
  createPo=async(request:FastifyRequest,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);return reply.code(201).send(dataEnvelope(await this.service.createPo(tenant,auth.userId,CreatePurchaseOrderSchema.parse(request.body)),request.id));};
  submitPo=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);const b=PurchaseOrderCommandSchema.parse(request.body??{});return reply.code(200).send(dataEnvelope(await this.service.poCommand(tenant,auth.userId,request.params.id,'submit',b.comment),request.id));};
  approvePo=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);const b=PurchaseOrderCommandSchema.parse(request.body??{});return reply.code(200).send(dataEnvelope(await this.service.poCommand(tenant,auth.userId,request.params.id,'approve',b.comment),request.id));};
  sendPo=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);const b=PurchaseOrderCommandSchema.parse(request.body??{});return reply.code(200).send(dataEnvelope(await this.service.poCommand(tenant,auth.userId,request.params.id,'send',b.comment),request.id));};
  cancelPo=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);const b=CancelPurchaseOrderSchema.parse(request.body);return reply.code(200).send(dataEnvelope(await this.service.poCommand(tenant,auth.userId,request.params.id,'cancel',b.reason),request.id));};
  listGrn=async(request:FastifyRequest,reply:FastifyReply)=>{const {tenant}=ctx(request);const r=await this.service.listGrn(tenant,ProcurementListQuerySchema.parse(request.query));return reply.code(200).send(listEnvelope(r.rows,{page:r.page,pageSize:r.pageSize,total:r.total,requestId:request.id}));};
  receive=async(request:FastifyRequest,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);const key=IdempotencyKeySchema.parse(request.headers['idempotency-key']);const b=ReceiveGoodsCommandSchema.parse(request.body);const result=await this.service.receiveWithNumber(tenant,auth.userId,b,key);return reply.code(201).send(dataEnvelope({id:result.id,grnNo:result.grnNo,status:result.status,stockTransactions:result.stockTransactions??[]},request.id));};
  getGrn=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {tenant}=ctx(request);return reply.code(200).send(dataEnvelope(await this.service.getGrn(tenant,request.params.id),request.id));};
  inspect=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);return reply.code(200).send(dataEnvelope(await this.service.inspect(tenant,auth.userId,request.params.id,InspectGoodsReceiptSchema.parse(request.body)),request.id));};
}
