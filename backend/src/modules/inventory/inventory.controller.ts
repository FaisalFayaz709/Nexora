import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  CreateStockAdjustmentSchema,
  CreateStockReservationSchema,
  StockBalanceQuerySchema,
  StockLedgerQuerySchema,
  StockTransferCommandSchema,
} from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import type { StockAdjustmentService } from './stock-adjustment.service.js';
import type { StockQueryService } from './stock-query.service.js';
import type { StockReservationService } from './stock-reservation.service.js';
import type { StockTransferService } from './stock-transfer.service.js';

function requireContext(request: FastifyRequest) {
  if (!request.auth || !request.tenant) {
    throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Tenant authorization pipeline was not initialized.');
  }
  return { auth: request.auth, tenant: request.tenant };
}

export class InventoryController {
  constructor(
    private readonly queryService: StockQueryService,
    private readonly reservationService: StockReservationService,
    private readonly transferService: StockTransferService,
    private readonly adjustmentService: StockAdjustmentService,
  ) {}

  stock = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = requireContext(request);
    const result = await this.queryService.balances(tenant, StockBalanceQuerySchema.parse(request.query));
    return reply.code(200).send(listEnvelope(result.rows, {
      page: result.page, pageSize: result.pageSize, total: result.total, requestId: request.id,
    }));
  };

  ledger = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = requireContext(request);
    const result = await this.queryService.ledger(tenant, StockLedgerQuerySchema.parse(request.query));
    return reply.code(200).send(listEnvelope(result.rows, {
      page: result.page, pageSize: result.pageSize, total: result.total, requestId: request.id,
    }));
  };

  serial = async (
    request: FastifyRequest<{ Params: { serialNo: string } }>,
    reply: FastifyReply,
  ) => {
    const { tenant } = requireContext(request);
    return reply.code(200).send(
      dataEnvelope(await this.queryService.serial(tenant, request.params.serialNo), request.id),
    );
  };

  reserve = async (request: FastifyRequest, reply: FastifyReply) => {
    const { auth, tenant } = requireContext(request);
    return reply.code(201).send(dataEnvelope(
      await this.reservationService.reserve(
        tenant, { userId: auth.userId, ip: request.ip },
        CreateStockReservationSchema.parse(request.body),
      ),
      request.id,
    ));
  };

  releaseReservation = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { auth, tenant } = requireContext(request);
    return reply.code(200).send(dataEnvelope(
      await this.reservationService.release(
        tenant, { userId: auth.userId, ip: request.ip }, request.params.id,
      ),
      request.id,
    ));
  };

  createTransfer = async (request: FastifyRequest, reply: FastifyReply) => {
    const { auth, tenant } = requireContext(request);
    return reply.code(201).send(dataEnvelope(
      await this.transferService.create(
        tenant, { userId: auth.userId, ip: request.ip },
        StockTransferCommandSchema.parse(request.body),
      ),
      request.id,
    ));
  };

  dispatchTransfer = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { auth, tenant } = requireContext(request);
    return reply.code(200).send(dataEnvelope(
      await this.transferService.dispatch(
        tenant, { userId: auth.userId, ip: request.ip }, request.params.id,
      ),
      request.id,
    ));
  };

  receiveTransfer = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { auth, tenant } = requireContext(request);
    return reply.code(200).send(dataEnvelope(
      await this.transferService.receive(
        tenant, { userId: auth.userId, ip: request.ip }, request.params.id,
      ),
      request.id,
    ));
  };

  createAdjustment = async (request: FastifyRequest, reply: FastifyReply) => {
    const { auth, tenant } = requireContext(request);
    return reply.code(201).send(dataEnvelope(
      await this.adjustmentService.create(
        tenant, { userId: auth.userId, ip: request.ip },
        CreateStockAdjustmentSchema.parse(request.body),
      ),
      request.id,
    ));
  };

  postAdjustment = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { auth, tenant } = requireContext(request);
    return reply.code(200).send(dataEnvelope(
      await this.adjustmentService.post(
        tenant, { userId: auth.userId, ip: request.ip }, request.params.id,
      ),
      request.id,
    ));
  };
}
