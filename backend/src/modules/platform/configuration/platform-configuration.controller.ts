import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  SetOrganizationFeatureSchema,
  UpdateModuleConfigurationSchema,
} from '@nexora/shared';
import { dataEnvelope } from '../../../core/http/envelope.js';
import { AppError } from '../../../core/http/errors.js';
import type { PlatformConfigurationService } from './platform-configuration.service.js';

function context(request: FastifyRequest) {
  if (!request.auth || !request.tenant) {
    throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Tenant authorization pipeline was not initialized.');
  }
  return { auth: request.auth, tenant: request.tenant };
}

export class PlatformConfigurationController {
  constructor(private readonly service: PlatformConfigurationService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = context(request);
    return reply.code(200).send(
      dataEnvelope(await this.service.list(tenant), request.id),
    );
  };

  setFeature = async (request: FastifyRequest, reply: FastifyReply) => {
    const { auth, tenant } = context(request);
    const input = SetOrganizationFeatureSchema.parse(request.body);
    return reply.code(200).send(
      dataEnvelope(
        await this.service.setFeature(
          tenant,
          { userId: auth.userId, ip: request.ip },
          input,
        ),
        request.id,
      ),
    );
  };

  updateModule = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { auth, tenant } = context(request);
    const input = UpdateModuleConfigurationSchema.parse(request.body);
    return reply.code(200).send(
      dataEnvelope(
        await this.service.updateModule(
          tenant,
          { userId: auth.userId, ip: request.ip },
          request.params.id,
          input,
        ),
        request.id,
      ),
    );
  };
}
