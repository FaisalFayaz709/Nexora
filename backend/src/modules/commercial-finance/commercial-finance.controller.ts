import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  AllocateLandedCostSchema,
  CloseBankReconciliationSchema,
  CommercialFinanceListQuerySchema,
  CreateLandedCostSchema,
  CreateTaxRuleSchema,
  ImportBankStatementSchema,
  PaymentVoucherSchema,
  ReceiptVoucherSchema,
  PostLandedCostSchema,
  TaxCalculateSchema,
  TaxReportQuerySchema,
} from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import { CommercialFinanceService } from './commercial-finance.service.js';

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

export class CommercialFinanceController {
  constructor(private readonly service: CommercialFinanceService) {}

  createLandedCost = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const input = CreateLandedCostSchema.parse(request.body);
    return reply.code(201).send(dataEnvelope(await this.service.createLandedCost(tenant, actor(request), input), request.id));
  };

  allocateLandedCost = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const input = AllocateLandedCostSchema.parse(request.body);
    return reply.code(200).send(dataEnvelope(await this.service.allocateLandedCost(tenant, actor(request), request.params.id, input), request.id));
  };

  postLandedCost = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const input = PostLandedCostSchema.parse(request.body ?? {});
    return reply.code(200).send(dataEnvelope(await this.service.postLandedCost(tenant, actor(request), request.params.id, input, String(request.headers['idempotency-key'] ?? '')), request.id));
  };

  taxCodes = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const query = CommercialFinanceListQuerySchema.parse(request.query);
    const result = await this.service.listTaxCodes(tenant, query);
    return reply.code(200).send(listEnvelope(result.rows, { page: result.page, pageSize: result.pageSize, total: result.total, requestId: request.id }));
  };

  createTaxRule = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const input = CreateTaxRuleSchema.parse(request.body);
    return reply.code(201).send(dataEnvelope(await this.service.createTaxRule(tenant, actor(request), input), request.id));
  };

  calculateTax = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const input = TaxCalculateSchema.parse(request.body);
    return reply.code(200).send(dataEnvelope(await this.service.calculateTax(tenant, actor(request), input), request.id));
  };

  taxReports = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const query = TaxReportQuerySchema.parse(request.query);
    return reply.code(200).send(dataEnvelope(await this.service.taxReports(tenant, query), request.id));
  };

  bankAccounts = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const query = CommercialFinanceListQuerySchema.parse(request.query);
    const result = await this.service.listBankAccounts(tenant, query);
    return reply.code(200).send(listEnvelope(result.rows, { page: result.page, pageSize: result.pageSize, total: result.total, requestId: request.id }));
  };

  importStatement = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const input = ImportBankStatementSchema.parse(request.body);
    return reply.code(201).send(dataEnvelope(await this.service.importBankStatement(tenant, actor(request), input), request.id));
  };

  closeReconciliation = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const input = CloseBankReconciliationSchema.parse(request.body ?? {});
    return reply.code(200).send(dataEnvelope(await this.service.closeBankReconciliation(tenant, actor(request), request.params.id, input), request.id));
  };

  paymentVoucher = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const input = PaymentVoucherSchema.parse(request.body);
    return reply.code(201).send(dataEnvelope(await this.service.createPaymentVoucher(tenant, actor(request), input), request.id));
  };

  receiptVoucher = async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant } = ctx(request);
    const input = ReceiptVoucherSchema.parse(request.body);
    return reply.code(201).send(dataEnvelope(await this.service.createReceiptVoucher(tenant, actor(request), input), request.id));
  };
}
