import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  BranchListQuerySchema,
  CreateBranchSchema,
  CreateDepartmentSchema,
  DepartmentListQuerySchema,
  UpdateBranchSchema,
  UpdateDepartmentSchema,
} from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import type { OrganizationService } from './organization.service.js';

function requireContext(request: FastifyRequest) {
  if (!request.auth || !request.tenant) {
    throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Tenant authorization pipeline was not initialized.');
  }
  return { auth: request.auth, tenant: request.tenant };
}

export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}

  listBranches = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = requireContext(request);
    const query = BranchListQuerySchema.parse(request.query);
    const result = await this.service.listBranches(tenant, query);

    return reply.code(200).send(
      listEnvelope(result.rows, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        requestId: request.id,
      }),
    );
  };

  getBranch = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = requireContext(request);
    return reply
      .code(200)
      .send(dataEnvelope(await this.service.getBranch(tenant, request.params.id), request.id));
  };

  createBranch = async (request: FastifyRequest, reply: FastifyReply) => {
    const { auth, tenant } = requireContext(request);
    const input = CreateBranchSchema.parse(request.body);
    const result = await this.service.createBranch(
      tenant,
      { userId: auth.userId, ip: request.ip },
      input,
    );
    return reply.code(201).send(dataEnvelope(result, request.id));
  };

  updateBranch = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { auth, tenant } = requireContext(request);
    const input = UpdateBranchSchema.parse(request.body);
    const result = await this.service.updateBranch(
      tenant,
      { userId: auth.userId, ip: request.ip },
      request.params.id,
      input,
    );
    return reply.code(200).send(dataEnvelope(result, request.id));
  };

  listDepartments = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = requireContext(request);
    const query = DepartmentListQuerySchema.parse(request.query);
    const result = await this.service.listDepartments(tenant, query);

    return reply.code(200).send(
      listEnvelope(result.rows, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        requestId: request.id,
      }),
    );
  };

  getDepartment = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = requireContext(request);
    return reply
      .code(200)
      .send(
        dataEnvelope(
          await this.service.getDepartment(tenant, request.params.id),
          request.id,
        ),
      );
  };

  createDepartment = async (request: FastifyRequest, reply: FastifyReply) => {
    const { auth, tenant } = requireContext(request);
    const input = CreateDepartmentSchema.parse(request.body);
    const result = await this.service.createDepartment(
      tenant,
      { userId: auth.userId, ip: request.ip },
      input,
    );
    return reply.code(201).send(dataEnvelope(result, request.id));
  };

  updateDepartment = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { auth, tenant } = requireContext(request);
    const input = UpdateDepartmentSchema.parse(request.body);
    const result = await this.service.updateDepartment(
      tenant,
      { userId: auth.userId, ip: request.ip },
      request.params.id,
      input,
    );
    return reply.code(200).send(dataEnvelope(result, request.id));
  };
}
