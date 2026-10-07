import type { FastifyReply, FastifyRequest } from 'fastify';
import { listEnvelope, dataEnvelope } from '../../core/http/envelope.js';
import { AppError } from '../../core/http/errors.js';
import { PortalWorkspaceService } from './portal-workspace.service.js';

function auth(request: FastifyRequest) {
  if (!request.auth || !request.tenant) throw new AppError(500, 'AUTH_PIPELINE_INVALID', 'Authentication and tenant resolution must run before portal workspace handlers.');
  return { organizationId: request.tenant.organizationId, userId: request.auth.userId, ip: request.ip };
}

function sendList(reply: FastifyReply, request: FastifyRequest, result: { rows: unknown[]; total: number; page: number; pageSize: number }) {
  return reply.code(200).send(listEnvelope(result.rows, { page: result.page, pageSize: result.pageSize, total: result.total, requestId: request.id }));
}

export class PortalWorkspaceController {
  constructor(private readonly service: PortalWorkspaceService) {}

  customerDashboard = async (request: FastifyRequest, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.customerDashboard(auth(request), request.query), request.id));
  customerProjects = async (request: FastifyRequest, reply: FastifyReply) => sendList(reply, request, await this.service.customerResource('projects', auth(request), request.query));
  customerContracts = async (request: FastifyRequest, reply: FastifyReply) => sendList(reply, request, await this.service.customerResource('contracts', auth(request), request.query));
  customerSites = async (request: FastifyRequest, reply: FastifyReply) => sendList(reply, request, await this.service.customerResource('sites', auth(request), request.query));
  customerAssets = async (request: FastifyRequest, reply: FastifyReply) => sendList(reply, request, await this.service.customerResource('assets', auth(request), request.query));
  customerTickets = async (request: FastifyRequest, reply: FastifyReply) => sendList(reply, request, await this.service.customerResource('tickets', auth(request), request.query));
  customerInvoices = async (request: FastifyRequest, reply: FastifyReply) => sendList(reply, request, await this.service.customerResource('invoices', auth(request), request.query));
  customerPayments = async (request: FastifyRequest, reply: FastifyReply) => sendList(reply, request, await this.service.customerResource('payments', auth(request), request.query));
  customerDocuments = async (request: FastifyRequest, reply: FastifyReply) => sendList(reply, request, await this.service.customerResource('documents', auth(request), request.query));
  createCustomerTicket = async (request: FastifyRequest, reply: FastifyReply) => reply.code(201).send(dataEnvelope(await this.service.createCustomerTicket(auth(request), request.body), request.id));
  confirmCustomerWorkOrder = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.confirmCustomerWorkOrder(auth(request), request.params.id, request.body), request.id));

  vendorDashboard = async (request: FastifyRequest, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.vendorDashboard(auth(request), request.query), request.id));
  vendorRfqs = async (request: FastifyRequest, reply: FastifyReply) => sendList(reply, request, await this.service.vendorResource('rfqs', auth(request), request.query));
  vendorQuotations = async (request: FastifyRequest, reply: FastifyReply) => sendList(reply, request, await this.service.vendorResource('quotations', auth(request), request.query));
  vendorPurchaseOrders = async (request: FastifyRequest, reply: FastifyReply) => sendList(reply, request, await this.service.vendorResource('purchase-orders', auth(request), request.query));
  vendorDeliveries = async (request: FastifyRequest, reply: FastifyReply) => sendList(reply, request, await this.service.vendorResource('deliveries', auth(request), request.query));
  vendorInvoices = async (request: FastifyRequest, reply: FastifyReply) => sendList(reply, request, await this.service.vendorResource('invoices', auth(request), request.query));
  vendorPayments = async (request: FastifyRequest, reply: FastifyReply) => sendList(reply, request, await this.service.vendorResource('payments', auth(request), request.query));
  vendorPerformance = async (request: FastifyRequest, reply: FastifyReply) => sendList(reply, request, await this.service.vendorResource('performance', auth(request), request.query));
  vendorDocuments = async (request: FastifyRequest, reply: FastifyReply) => sendList(reply, request, await this.service.vendorResource('documents', auth(request), request.query));
  submitVendorQuotation = async (request: FastifyRequest, reply: FastifyReply) => reply.code(201).send(dataEnvelope(await this.service.submitVendorQuotation(auth(request), request.body), request.id));
  acknowledgePurchaseOrder = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.acknowledgePurchaseOrder(auth(request), request.params.id, request.body), request.id));
  submitVendorInvoice = async (request: FastifyRequest, reply: FastifyReply) => reply.code(201).send(dataEnvelope(await this.service.submitVendorInvoice(auth(request), request.body), request.id));

  technicianDashboard = async (request: FastifyRequest, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.technicianDashboard(auth(request), request.query), request.id));
  technicianJobs = async (request: FastifyRequest, reply: FastifyReply) => sendList(reply, request, await this.service.technicianJobs(auth(request), request.query));
  technicianWorkOrder = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.technicianWorkOrder(auth(request), request.params.id), request.id));
  technicianAccept = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.technicianCommand(auth(request), request.params.id, 'ACCEPT', request.body), request.id));
  technicianStartTravel = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.technicianCommand(auth(request), request.params.id, 'START_TRAVEL', request.body), request.id));
  technicianArrive = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.technicianCommand(auth(request), request.params.id, 'ARRIVE', request.body), request.id));
  technicianCheckIn = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.technicianCommand(auth(request), request.params.id, 'CHECK_IN', request.body), request.id));
  technicianLocation = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.technicianCommand(auth(request), request.params.id, 'LOCATION', request.body), request.id));
  technicianStart = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.technicianCommand(auth(request), request.params.id, 'START', request.body), request.id));
  technicianServiceReport = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.technicianCommand(auth(request), request.params.id, 'SERVICE_REPORT', request.body), request.id));
  technicianCheckOut = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.technicianCommand(auth(request), request.params.id, 'CHECK_OUT', request.body), request.id));
  technicianComplete = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => reply.code(200).send(dataEnvelope(await this.service.technicianCommand(auth(request), request.params.id, 'COMPLETE', request.body), request.id));
  technicianOfflineQueue = async (request: FastifyRequest, reply: FastifyReply) => sendList(reply, request, await this.service.offlineQueue(auth(request), request.query));
}
