import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { PortalWorkspaceController } from './portal-workspace.controller.js';

const routes = {
  customerDashboard: defineLockedRoute('GET','/api/v1/portal/customer/dashboard'),
  customerProjects: defineLockedRoute('GET','/api/v1/portal/customer/projects'),
  customerContracts: defineLockedRoute('GET','/api/v1/portal/customer/contracts'),
  customerSites: defineLockedRoute('GET','/api/v1/portal/customer/sites'),
  customerAssets: defineLockedRoute('GET','/api/v1/portal/customer/assets'),
  customerTickets: defineLockedRoute('GET','/api/v1/portal/customer/tickets'),
  customerInvoices: defineLockedRoute('GET','/api/v1/portal/customer/invoices'),
  customerPayments: defineLockedRoute('GET','/api/v1/portal/customer/payments'),
  customerDocuments: defineLockedRoute('GET','/api/v1/portal/customer/documents'),
  createCustomerTicket: defineLockedRoute('POST','/api/v1/portal/customer/tickets'),
  confirmCustomerWorkOrder: defineLockedRoute('POST','/api/v1/portal/customer/work-orders/:id/confirm'),
  vendorDashboard: defineLockedRoute('GET','/api/v1/portal/vendor/dashboard'),
  vendorRfqs: defineLockedRoute('GET','/api/v1/portal/vendor/rfqs'),
  vendorQuotations: defineLockedRoute('GET','/api/v1/portal/vendor/quotations'),
  submitVendorQuotation: defineLockedRoute('POST','/api/v1/portal/vendor/quotations'),
  vendorPurchaseOrders: defineLockedRoute('GET','/api/v1/portal/vendor/purchase-orders'),
  acknowledgePurchaseOrder: defineLockedRoute('POST','/api/v1/portal/vendor/purchase-orders/:id/acknowledge'),
  vendorDeliveries: defineLockedRoute('GET','/api/v1/portal/vendor/deliveries'),
  vendorInvoices: defineLockedRoute('GET','/api/v1/portal/vendor/invoices'),
  submitVendorInvoice: defineLockedRoute('POST','/api/v1/portal/vendor/invoices'),
  vendorPayments: defineLockedRoute('GET','/api/v1/portal/vendor/payments'),
  vendorPerformance: defineLockedRoute('GET','/api/v1/portal/vendor/performance'),
  vendorDocuments: defineLockedRoute('GET','/api/v1/portal/vendor/documents'),
  technicianDashboard: defineLockedRoute('GET','/api/v1/portal/technician/dashboard'),
  technicianJobs: defineLockedRoute('GET','/api/v1/portal/technician/jobs'),
  technicianWorkOrder: defineLockedRoute('GET','/api/v1/portal/technician/work-orders/:id'),
  technicianAccept: defineLockedRoute('POST','/api/v1/portal/technician/work-orders/:id/accept'),
  technicianStartTravel: defineLockedRoute('POST','/api/v1/portal/technician/work-orders/:id/start-travel'),
  technicianArrive: defineLockedRoute('POST','/api/v1/portal/technician/work-orders/:id/arrive'),
  technicianCheckIn: defineLockedRoute('POST','/api/v1/portal/technician/work-orders/:id/check-in'),
  technicianLocation: defineLockedRoute('POST','/api/v1/portal/technician/work-orders/:id/location'),
  technicianStart: defineLockedRoute('POST','/api/v1/portal/technician/work-orders/:id/start'),
  technicianServiceReport: defineLockedRoute('POST','/api/v1/portal/technician/work-orders/:id/service-report'),
  technicianCheckOut: defineLockedRoute('POST','/api/v1/portal/technician/work-orders/:id/check-out'),
  technicianComplete: defineLockedRoute('POST','/api/v1/portal/technician/work-orders/:id/complete'),
  technicianOfflineQueue: defineLockedRoute('GET','/api/v1/portal/technician/offline-queue'),
} as const;

export function portalWorkspaceRoutes(controller: PortalWorkspaceController, identity: IdentityFacade, access: PlatformAccessFacade): FastifyPluginAsync {
  const portalGuard = [identity.authenticateRequest.bind(identity), identity.resolveTenantRequest.bind(identity), (request: FastifyRequest) => access.assertModuleEnabled(request.tenant!.organizationId, 'portals')];
  const customerGuard = [...portalGuard, (request: FastifyRequest) => identity.assertPermission(request, 'customer.view')];
  const vendorGuard = [...portalGuard, (request: FastifyRequest) => identity.assertPermission(request, 'vendor.view')];
  const technicianGuard = [...portalGuard, (request: FastifyRequest) => identity.assertPermission(request, 'workorder.view')];
  return async (app) => {
    app.get(routes.customerDashboard.relativePath, { schema: routes.customerDashboard.schema, preHandler: customerGuard, handler: controller.customerDashboard });
    app.get(routes.customerProjects.relativePath, { schema: routes.customerProjects.schema, preHandler: customerGuard, handler: controller.customerProjects });
    app.get(routes.customerContracts.relativePath, { schema: routes.customerContracts.schema, preHandler: customerGuard, handler: controller.customerContracts });
    app.get(routes.customerSites.relativePath, { schema: routes.customerSites.schema, preHandler: customerGuard, handler: controller.customerSites });
    app.get(routes.customerAssets.relativePath, { schema: routes.customerAssets.schema, preHandler: customerGuard, handler: controller.customerAssets });
    app.get(routes.customerTickets.relativePath, { schema: routes.customerTickets.schema, preHandler: customerGuard, handler: controller.customerTickets });
    app.get(routes.customerInvoices.relativePath, { schema: routes.customerInvoices.schema, preHandler: customerGuard, handler: controller.customerInvoices });
    app.get(routes.customerPayments.relativePath, { schema: routes.customerPayments.schema, preHandler: customerGuard, handler: controller.customerPayments });
    app.get(routes.customerDocuments.relativePath, { schema: routes.customerDocuments.schema, preHandler: customerGuard, handler: controller.customerDocuments });
    app.post(routes.createCustomerTicket.relativePath, { schema: routes.createCustomerTicket.schema, preHandler: customerGuard, handler: controller.createCustomerTicket });
    app.post(routes.confirmCustomerWorkOrder.relativePath, { schema: routes.confirmCustomerWorkOrder.schema, preHandler: customerGuard, handler: controller.confirmCustomerWorkOrder });
    app.get(routes.vendorDashboard.relativePath, { schema: routes.vendorDashboard.schema, preHandler: vendorGuard, handler: controller.vendorDashboard });
    app.get(routes.vendorRfqs.relativePath, { schema: routes.vendorRfqs.schema, preHandler: vendorGuard, handler: controller.vendorRfqs });
    app.get(routes.vendorQuotations.relativePath, { schema: routes.vendorQuotations.schema, preHandler: vendorGuard, handler: controller.vendorQuotations });
    app.post(routes.submitVendorQuotation.relativePath, { schema: routes.submitVendorQuotation.schema, preHandler: vendorGuard, handler: controller.submitVendorQuotation });
    app.get(routes.vendorPurchaseOrders.relativePath, { schema: routes.vendorPurchaseOrders.schema, preHandler: vendorGuard, handler: controller.vendorPurchaseOrders });
    app.post(routes.acknowledgePurchaseOrder.relativePath, { schema: routes.acknowledgePurchaseOrder.schema, preHandler: vendorGuard, handler: controller.acknowledgePurchaseOrder });
    app.get(routes.vendorDeliveries.relativePath, { schema: routes.vendorDeliveries.schema, preHandler: vendorGuard, handler: controller.vendorDeliveries });
    app.get(routes.vendorInvoices.relativePath, { schema: routes.vendorInvoices.schema, preHandler: vendorGuard, handler: controller.vendorInvoices });
    app.post(routes.submitVendorInvoice.relativePath, { schema: routes.submitVendorInvoice.schema, preHandler: vendorGuard, handler: controller.submitVendorInvoice });
    app.get(routes.vendorPayments.relativePath, { schema: routes.vendorPayments.schema, preHandler: vendorGuard, handler: controller.vendorPayments });
    app.get(routes.vendorPerformance.relativePath, { schema: routes.vendorPerformance.schema, preHandler: vendorGuard, handler: controller.vendorPerformance });
    app.get(routes.vendorDocuments.relativePath, { schema: routes.vendorDocuments.schema, preHandler: vendorGuard, handler: controller.vendorDocuments });
    app.get(routes.technicianDashboard.relativePath, { schema: routes.technicianDashboard.schema, preHandler: technicianGuard, handler: controller.technicianDashboard });
    app.get(routes.technicianJobs.relativePath, { schema: routes.technicianJobs.schema, preHandler: technicianGuard, handler: controller.technicianJobs });
    app.get(routes.technicianWorkOrder.relativePath, { schema: routes.technicianWorkOrder.schema, preHandler: technicianGuard, handler: controller.technicianWorkOrder });
    app.post(routes.technicianAccept.relativePath, { schema: routes.technicianAccept.schema, preHandler: technicianGuard, handler: controller.technicianAccept });
    app.post(routes.technicianStartTravel.relativePath, { schema: routes.technicianStartTravel.schema, preHandler: technicianGuard, handler: controller.technicianStartTravel });
    app.post(routes.technicianArrive.relativePath, { schema: routes.technicianArrive.schema, preHandler: technicianGuard, handler: controller.technicianArrive });
    app.post(routes.technicianCheckIn.relativePath, { schema: routes.technicianCheckIn.schema, preHandler: technicianGuard, handler: controller.technicianCheckIn });
    app.post(routes.technicianLocation.relativePath, { schema: routes.technicianLocation.schema, preHandler: technicianGuard, handler: controller.technicianLocation });
    app.post(routes.technicianStart.relativePath, { schema: routes.technicianStart.schema, preHandler: technicianGuard, handler: controller.technicianStart });
    app.post(routes.technicianServiceReport.relativePath, { schema: routes.technicianServiceReport.schema, preHandler: technicianGuard, handler: controller.technicianServiceReport });
    app.post(routes.technicianCheckOut.relativePath, { schema: routes.technicianCheckOut.schema, preHandler: technicianGuard, handler: controller.technicianCheckOut });
    app.post(routes.technicianComplete.relativePath, { schema: routes.technicianComplete.schema, preHandler: technicianGuard, handler: controller.technicianComplete });
    app.get(routes.technicianOfflineQueue.relativePath, { schema: routes.technicianOfflineQueue.schema, preHandler: technicianGuard, handler: controller.technicianOfflineQueue });
  };
}
