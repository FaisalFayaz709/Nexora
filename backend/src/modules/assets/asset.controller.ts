import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  AssetHistoryQuerySchema,
  AssetListQuerySchema,
  AssetSiteListQuerySchema,
  CreateAssetRmaSchema,
  CreateAssetSchema,
  InstallAssetSchema,
  RegisterAssetFromStockSchema,
  ReplaceAssetSchema,
  RetireAssetSchema,
  RotateAssetQrSchema,
  UpdateAssetSchema,
} from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import { AssetService } from './asset.service.js';

function ctx(request: FastifyRequest) {
  if (!request.auth || !request.tenant) {
    throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Authorization pipeline was not initialized.');
  }
  return { auth: request.auth, tenant: request.tenant };
}

function actor(request: FastifyRequest) {
  const { auth } = ctx(request);
  return { userId: auth.userId, ip: request.ip };
}

export class AssetController {
  constructor(private readonly service: AssetService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const query = AssetListQuerySchema.parse(request.query);
    const result = await this.service.list(tenant, query);
    return reply.code(200).send(listEnvelope(result.rows, {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      requestId: request.id,
    }));
  };

  listBySite = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    const query = AssetSiteListQuerySchema.parse(request.query);
    const result = await this.service.listBySite(tenant, request.params.id, query);
    return reply.code(200).send(listEnvelope(result.rows, {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      requestId: request.id,
    }));
  };

  get = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    return reply.code(200).send(
      dataEnvelope(await this.service.get(tenant, request.params.id), request.id),
    );
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const input = CreateAssetSchema.parse(request.body);
    return reply.code(201).send(
      dataEnvelope(await this.service.create(tenant, actor(request), input), request.id),
    );
  };

  update = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    const input = UpdateAssetSchema.parse(request.body);
    return reply.code(200).send(
      dataEnvelope(
        await this.service.update(tenant, actor(request), request.params.id, input),
        request.id,
      ),
    );
  };

  registerFromStock = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const input = RegisterAssetFromStockSchema.parse(request.body);
    return reply.code(201).send(
      dataEnvelope(
        await this.service.registerFromStock(tenant, actor(request), input),
        request.id,
      ),
    );
  };

  install = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    const input = InstallAssetSchema.parse(request.body);
    return reply.code(200).send(
      dataEnvelope(
        await this.service.install(tenant, actor(request), request.params.id, input),
        request.id,
      ),
    );
  };

  replace = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    const input = ReplaceAssetSchema.parse(request.body);
    return reply.code(200).send(
      dataEnvelope(
        await this.service.replace(tenant, actor(request), request.params.id, input),
        request.id,
      ),
    );
  };

  retire = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    const input = RetireAssetSchema.parse(request.body);
    return reply.code(200).send(
      dataEnvelope(
        await this.service.retire(tenant, actor(request), request.params.id, input),
        request.id,
      ),
    );
  };

  history = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    const query = AssetHistoryQuerySchema.parse(request.query);
    const result = await this.service.history(tenant, request.params.id, query);
    return reply.code(200).send(listEnvelope(result.rows, {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      requestId: request.id,
    }));
  };

  rotateQr = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    const input = RotateAssetQrSchema.parse(request.body ?? {});
    return reply.code(200).send(
      dataEnvelope(
        await this.service.rotateQr(
          tenant,
          actor(request),
          request.params.id,
          input.ttlDays,
        ),
        request.id,
      ),
    );
  };

  resolveQr = async (
    request: FastifyRequest<{ Params: { token: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    return reply.code(200).send(
      dataEnvelope(
        await this.service.resolveQr(
          tenant,
          actor(request),
          request.params.token,
        ),
        request.id,
      ),
    );
  };

  rma = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = ctx(request);
    const input = CreateAssetRmaSchema.parse(request.body);
    return reply.code(201).send(
      dataEnvelope(
        await this.service.createRma(
          tenant,
          actor(request),
          request.params.id,
          input,
        ),
        request.id,
      ),
    );
  };
}
