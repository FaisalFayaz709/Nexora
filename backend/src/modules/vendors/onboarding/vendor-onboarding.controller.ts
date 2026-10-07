import type { FastifyReply, FastifyRequest } from 'fastify';
import { CreateVendorOnboardingRequestSchema, VendorOnboardingActionSchema } from '@nexora/shared';
import { dataEnvelope } from '../../../core/http/envelope.js';
import { AppError } from '../../../core/http/errors.js';
import type { VendorOnboardingService } from './vendor-onboarding.service.js';

function context(request: FastifyRequest) {
  if (!request.auth || !request.tenant) throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Tenant authorization pipeline is not initialized.');
  return { auth: request.auth, tenant: request.tenant };
}

export class VendorOnboardingController {
  constructor(private readonly service: VendorOnboardingService) {}
  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const { auth, tenant } = context(request);
    const input = CreateVendorOnboardingRequestSchema.parse(request.body);
    return reply.code(201).send(dataEnvelope(await this.service.create(tenant, { userId: auth.userId, ip: request.ip }, input), request.id));
  };
  submit = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { auth, tenant } = context(request);
    return reply.code(200).send(dataEnvelope(await this.service.submit(tenant, { userId: auth.userId, ip: request.ip }, request.params.id), request.id));
  };
  approve = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { auth, tenant } = context(request);
    const input = VendorOnboardingActionSchema.parse(request.body ?? {});
    return reply.code(200).send(dataEnvelope(await this.service.approve(tenant, { userId: auth.userId, ip: request.ip }, request.params.id, input), request.id));
  };
}
