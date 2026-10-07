import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  ApprovePurchaseContractSchema,
  CreatePurchaseContractSchema,
  CreatePurchaseReleaseOrderSchema,
} from '@nexora/shared';
import { dataEnvelope } from '../../../core/http/envelope.js';
import { AppError } from '../../../core/http/errors.js';
import type { PurchaseContractService } from './purchase-contract.service.js';

function ctx(request: FastifyRequest) {
  if (!request.auth || !request.tenant) {
    throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Tenant authorization pipeline is not initialized.');
  }
  return { auth: request.auth, tenant: request.tenant };
}
function actor(request: FastifyRequest) {
  const { auth } = ctx(request);
  return { userId: auth.userId, ip: request.ip };
}

export class PurchaseContractController {
  constructor(private readonly service: PurchaseContractService) {}

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const input = CreatePurchaseContractSchema.parse(request.body);
    return reply.code(201).send(dataEnvelope(await this.service.create(tenant, actor(request), input), request.id));
  };

  approve = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const input = ApprovePurchaseContractSchema.parse(request.body ?? {});
    return reply.code(200).send(dataEnvelope(await this.service.approve(tenant, actor(request), request.params.id, input), request.id));
  };

  releaseOrder = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const input = CreatePurchaseReleaseOrderSchema.parse(request.body);
    return reply.code(201).send(dataEnvelope(await this.service.createReleaseOrder(tenant, actor(request), request.params.id, input), request.id));
  };
}
