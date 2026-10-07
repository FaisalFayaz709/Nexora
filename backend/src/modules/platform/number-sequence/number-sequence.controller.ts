import type { FastifyReply, FastifyRequest } from 'fastify';
import { CreateNumberSequenceSchema, NumberSequenceListQuerySchema, ResetNumberSequenceSchema } from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../../core/http/envelope.js';
import { AppError } from '../../../core/http/errors.js';
import type { NumberSequenceService } from './number-sequence.service.js';
function ctx(request:FastifyRequest){ if(!request.auth||!request.tenant) throw new AppError(500,'AUTH_PIPELINE_INVALID','Tenant authorization pipeline was not initialized.'); return {auth:request.auth,tenant:request.tenant}; }
function dto(r:any){return {id:r.id,branchId:r.branchId,entityType:r.entityType,prefix:r.prefix,fiscalYear:r.fiscalYear,currentNumber:r.currentNumber.toString(),padding:r.padding,resetPolicy:r.resetPolicy,lockedAt:r.lockedAt?.toISOString()??null};}
export class NumberSequenceController {
 constructor(private readonly service:NumberSequenceService){}
 list=async(request:FastifyRequest,reply:FastifyReply)=>{const {tenant}=ctx(request);const result=await this.service.list(tenant,NumberSequenceListQuerySchema.parse(request.query));return reply.code(200).send(listEnvelope(result.rows.map(dto),{page:result.page,pageSize:result.pageSize,total:result.total,requestId:request.id}));};
 create=async(request:FastifyRequest,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);const row=await this.service.create(tenant,{userId:auth.userId,ip:request.ip},CreateNumberSequenceSchema.parse(request.body));return reply.code(201).send(dataEnvelope(dto(row),request.id));};
 reset=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request);const body=ResetNumberSequenceSchema.parse(request.body);const row=await this.service.reset(tenant,{userId:auth.userId,ip:request.ip},request.params.id,body.reason);return reply.code(200).send(dataEnvelope(dto(row),request.id));};
}
