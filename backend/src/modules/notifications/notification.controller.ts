import type { FastifyReply, FastifyRequest } from 'fastify';
import { NotificationListQuerySchema } from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import { NotificationService } from './notification.service.js';
function c(r:FastifyRequest){if(!r.auth||!r.tenant)throw new AppError(500,'AUTH_PIPELINE_INVALID','Authorization pipeline was not initialized.');return{auth:r.auth,tenant:r.tenant};}
export class NotificationController{constructor(private readonly service:NotificationService){}list=async(r:FastifyRequest,p:FastifyReply)=>{const{auth,tenant}=c(r);const x=await this.service.list(tenant,auth.userId,NotificationListQuerySchema.parse(r.query));return p.code(200).send(listEnvelope(x.rows,{page:x.page,pageSize:x.pageSize,total:x.total,requestId:r.id}));};read=async(r:FastifyRequest<{Params:{id:string}}>,p:FastifyReply)=>{const{auth,tenant}=c(r);return p.code(200).send(dataEnvelope(await this.service.read(tenant,auth.userId,r.params.id),r.id));};readAll=async(r:FastifyRequest,p:FastifyReply)=>{const{auth,tenant}=c(r);return p.code(200).send(dataEnvelope(await this.service.readAll(tenant,auth.userId),r.id));};}
