import type { FastifyReply, FastifyRequest } from 'fastify';
import { CreateIntegrationWebhookSchema, IntegrationWebhookDeliveryListQuerySchema, IntegrationWebhookListQuerySchema, TestIntegrationWebhookDeliverySchema, UpdateIntegrationWebhookSchema } from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import { IntegrationWebhookService } from './integration-webhook.service.js';

function ctx(request: FastifyRequest) {
  if (!request.auth || !request.tenant) throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Authorization pipeline was not initialized.');
  return { auth: request.auth, tenant: request.tenant };
}
function actor(request: FastifyRequest) { return { userId: ctx(request).auth.userId, ip: request.ip }; }

export class IntegrationWebhookController {
  constructor(private readonly service: IntegrationWebhookService) {}

  listWebhooks = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.listWebhooks(ctx(request).tenant, IntegrationWebhookListQuerySchema.parse(request.query));
    return reply.code(200).send(listEnvelope(result.rows, { page: result.page, pageSize: result.pageSize, total: result.total, requestId: request.id }));
  };

  getWebhook = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    return reply.code(200).send(dataEnvelope(await this.service.getWebhook(ctx(request).tenant, request.params.id), request.id));
  };

  createWebhook = async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(201).send(dataEnvelope(await this.service.createWebhook(ctx(request).tenant, actor(request), CreateIntegrationWebhookSchema.parse(request.body)), request.id));
  };

  updateWebhook = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    return reply.code(200).send(dataEnvelope(await this.service.updateWebhook(ctx(request).tenant, actor(request), request.params.id, UpdateIntegrationWebhookSchema.parse(request.body)), request.id));
  };

  activateWebhook = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    return reply.code(200).send(dataEnvelope(await this.service.setActive(ctx(request).tenant, actor(request), request.params.id, true), request.id));
  };

  deactivateWebhook = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    return reply.code(200).send(dataEnvelope(await this.service.setActive(ctx(request).tenant, actor(request), request.params.id, false), request.id));
  };

  listDeliveries = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.listDeliveries(ctx(request).tenant, IntegrationWebhookDeliveryListQuerySchema.parse(request.query));
    return reply.code(200).send(listEnvelope(result.rows, { page: result.page, pageSize: result.pageSize, total: result.total, requestId: request.id }));
  };

  testDelivery = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    return reply.code(201).send(dataEnvelope(await this.service.testDelivery(ctx(request).tenant, actor(request), request.params.id, TestIntegrationWebhookDeliverySchema.parse(request.body)), request.id));
  };
}
