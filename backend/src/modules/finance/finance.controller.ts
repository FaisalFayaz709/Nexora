import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  AccountListQuerySchema,
  CreateCustomerInvoiceSchema,
  CreateExpenseSchema,
  CreateJournalEntrySchema,
  CreatePaymentSchema,
  CreateSupplierInvoiceSchema,
  CustomerInvoiceListQuerySchema,
  EmptyCommandSchema,
  ExpenseListQuerySchema,
  FinanceAgingQuerySchema,
  PaymentListQuerySchema,
  SupplierInvoiceListQuerySchema,
  UpdateCustomerInvoiceSchema,
  UpdateExpenseSchema,
  UpdateSupplierInvoiceSchema,
} from '@nexora/shared';
import { dataEnvelope, listEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import { FinanceService } from './finance.service.js';

function ctx(request: FastifyRequest) {
  if (!request.auth || !request.tenant) throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Authorization pipeline was not initialized.');
  return { auth: request.auth, tenant: request.tenant };
}
function actor(request: FastifyRequest) { const { auth } = ctx(request); return { userId: auth.userId, ip: request.ip }; }
function list(reply: FastifyReply, request: FastifyRequest, result: any) { return reply.code(200).send(listEnvelope(result.rows, { page: result.page, pageSize: result.pageSize, total: result.total, requestId: request.id })); }

export class FinanceController {
  constructor(private readonly service: FinanceService) {}
  listCustomerInvoices = async (request: FastifyRequest, reply: FastifyReply) => list(reply, request, await this.service.listCustomerInvoices(ctx(request).tenant, CustomerInvoiceListQuerySchema.parse(request.query)));
  getCustomerInvoice = async (request: FastifyRequest<{Params:{id:string}}>, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.getCustomerInvoice(ctx(request).tenant, request.params.id), request.id));
  createCustomerInvoice = async (request: FastifyRequest, reply: FastifyReply) => reply.code(201).send(dataEnvelope(await this.service.createCustomerInvoice(ctx(request).tenant, actor(request), CreateCustomerInvoiceSchema.parse(request.body)), request.id));
  updateCustomerInvoice = async (request: FastifyRequest<{Params:{id:string}}>, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.updateCustomerInvoice(ctx(request).tenant, actor(request), request.params.id, UpdateCustomerInvoiceSchema.parse(request.body)), request.id));
  submitCustomerInvoice = async (request: FastifyRequest<{Params:{id:string}}>, reply: FastifyReply) => { EmptyCommandSchema.parse(request.body ?? {}); return reply.code(200).send(dataEnvelope(await this.service.submitCustomerInvoice(ctx(request).tenant, actor(request), request.params.id), request.id)); };
  approveCustomerInvoice = async (request: FastifyRequest<{Params:{id:string}}>, reply: FastifyReply) => { EmptyCommandSchema.parse(request.body ?? {}); return reply.code(200).send(dataEnvelope(await this.service.approveCustomerInvoice(ctx(request).tenant, actor(request), request.params.id), request.id)); };
  postCustomerInvoice = async (request: FastifyRequest<{Params:{id:string}}>, reply: FastifyReply) => { EmptyCommandSchema.parse(request.body ?? {}); return reply.code(200).send(dataEnvelope(await this.service.postCustomerInvoice(ctx(request).tenant, actor(request), request.params.id), request.id)); };
  sendCustomerInvoice = async (request: FastifyRequest<{Params:{id:string}}>, reply: FastifyReply) => { EmptyCommandSchema.parse(request.body ?? {}); return reply.code(200).send(dataEnvelope(await this.service.sendCustomerInvoice(ctx(request).tenant, actor(request), request.params.id), request.id)); };
  cancelCustomerInvoice = async (request: FastifyRequest<{Params:{id:string}}>, reply: FastifyReply) => { EmptyCommandSchema.parse(request.body ?? {}); return reply.code(200).send(dataEnvelope(await this.service.cancelCustomerInvoice(ctx(request).tenant, actor(request), request.params.id), request.id)); };
  listSupplierInvoices = async (request: FastifyRequest, reply: FastifyReply) => list(reply, request, await this.service.listSupplierInvoices(ctx(request).tenant, SupplierInvoiceListQuerySchema.parse(request.query)));
  getSupplierInvoice = async (request: FastifyRequest<{Params:{id:string}}>, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.getSupplierInvoice(ctx(request).tenant, request.params.id), request.id));
  createSupplierInvoice = async (request: FastifyRequest, reply: FastifyReply) => reply.code(201).send(dataEnvelope(await this.service.createSupplierInvoice(ctx(request).tenant, actor(request), CreateSupplierInvoiceSchema.parse(request.body)), request.id));
  updateSupplierInvoice = async (request: FastifyRequest<{Params:{id:string}}>, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.updateSupplierInvoice(ctx(request).tenant, actor(request), request.params.id, UpdateSupplierInvoiceSchema.parse(request.body)), request.id));
  matchSupplierInvoice = async (request: FastifyRequest<{Params:{id:string}}>, reply: FastifyReply) => { EmptyCommandSchema.parse(request.body ?? {}); return reply.code(200).send(dataEnvelope(await this.service.matchSupplierInvoice(ctx(request).tenant, actor(request), request.params.id), request.id)); };
  approveSupplierInvoice = async (request: FastifyRequest<{Params:{id:string}}>, reply: FastifyReply) => { EmptyCommandSchema.parse(request.body ?? {}); return reply.code(200).send(dataEnvelope(await this.service.approveSupplierInvoice(ctx(request).tenant, actor(request), request.params.id), request.id)); };
  listExpenses = async (request: FastifyRequest, reply: FastifyReply) => list(reply, request, await this.service.listExpenses(ctx(request).tenant, ExpenseListQuerySchema.parse(request.query)));
  getExpense = async (request: FastifyRequest<{Params:{id:string}}>, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.getExpense(ctx(request).tenant, request.params.id), request.id));
  createExpense = async (request: FastifyRequest, reply: FastifyReply) => reply.code(201).send(dataEnvelope(await this.service.createExpense(ctx(request).tenant, actor(request), CreateExpenseSchema.parse(request.body)), request.id));
  updateExpense = async (request: FastifyRequest<{Params:{id:string}}>, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.updateExpense(ctx(request).tenant, actor(request), request.params.id, UpdateExpenseSchema.parse(request.body)), request.id));
  listPayments = async (request: FastifyRequest, reply: FastifyReply) => list(reply, request, await this.service.listPayments(ctx(request).tenant, PaymentListQuerySchema.parse(request.query)));
  createPayment = async (request: FastifyRequest, reply: FastifyReply) => reply.code(201).send(dataEnvelope(await this.service.createPayment(ctx(request).tenant, actor(request), CreatePaymentSchema.parse(request.body), String(request.headers['idempotency-key'] ?? '')), request.id));
  listAccounts = async (request: FastifyRequest, reply: FastifyReply) => list(reply, request, await this.service.listAccounts(ctx(request).tenant, AccountListQuerySchema.parse(request.query)));
  createJournalEntry = async (request: FastifyRequest, reply: FastifyReply) => reply.code(201).send(dataEnvelope(await this.service.createJournalEntry(ctx(request).tenant, actor(request), CreateJournalEntrySchema.parse(request.body)), request.id));
  postJournalEntry = async (request: FastifyRequest<{Params:{id:string}}>, reply: FastifyReply) => { EmptyCommandSchema.parse(request.body ?? {}); return reply.code(200).send(dataEnvelope(await this.service.postJournalEntry(ctx(request).tenant, actor(request), request.params.id), request.id)); };
  receivables = async (request: FastifyRequest, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.receivables(ctx(request).tenant, FinanceAgingQuerySchema.parse(request.query)), request.id));
  payables = async (request: FastifyRequest, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.payables(ctx(request).tenant, FinanceAgingQuerySchema.parse(request.query)), request.id));
}
