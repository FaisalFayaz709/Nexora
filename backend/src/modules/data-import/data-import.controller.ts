import type { FastifyReply, FastifyRequest } from 'fastify';
import { CommitImportSchema, ImportUploadSchema, RollbackImportSchema, UuidSchema, ValidateImportSchema } from '@nexora/shared';
import { dataEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import { DataImportService } from './data-import.service.js';
function ctx(request: FastifyRequest) { if (!request.auth || !request.tenant) throw new AppError(500,'AUTH_PIPELINE_INVALID','Authorization pipeline was not initialized.'); return { auth: request.auth, tenant: request.tenant }; }
export class DataImportController {
  constructor(private readonly service: DataImportService) {}
  upload=async(request:FastifyRequest,reply:FastifyReply)=>{const {auth,tenant}=ctx(request); const input=ImportUploadSchema.parse(request.body); return reply.code(201).send(dataEnvelope(await this.service.upload(tenant,{userId:auth.userId,ip:request.ip},input),request.id));};
  validate=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request); const input=ValidateImportSchema.parse(request.body??{}); return reply.code(200).send(dataEnvelope(await this.service.validate(tenant,{userId:auth.userId,ip:request.ip},UuidSchema.parse(request.params.id),input),request.id));};
  commit=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request); const input=CommitImportSchema.parse(request.body??{}); return reply.code(200).send(dataEnvelope(await this.service.commit(tenant,{userId:auth.userId,ip:request.ip},UuidSchema.parse(request.params.id),input),request.id));};
  rollback=async(request:FastifyRequest<{Params:{id:string}}>,reply:FastifyReply)=>{const {auth,tenant}=ctx(request); const input=RollbackImportSchema.parse(request.body); return reply.code(200).send(dataEnvelope(await this.service.rollback(tenant,{userId:auth.userId,ip:request.ip},UuidSchema.parse(request.params.id),input),request.id));};
}
