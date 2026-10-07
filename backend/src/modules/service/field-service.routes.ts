import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { FieldServiceController } from './field-service.controller.js';

const defs={
 tickets:defineLockedRoute('GET','/api/v1/tickets'), ticket:defineLockedRoute('GET','/api/v1/tickets/:id'), createTicket:defineLockedRoute('POST','/api/v1/tickets'), updateTicket:defineLockedRoute('PATCH','/api/v1/tickets/:id'),
 workOrders:defineLockedRoute('GET','/api/v1/work-orders'), workOrder:defineLockedRoute('GET','/api/v1/work-orders/:id'), createWorkOrder:defineLockedRoute('POST','/api/v1/work-orders'), updateWorkOrder:defineLockedRoute('PATCH','/api/v1/work-orders/:id'),
 assignTicket:defineLockedRoute('POST','/api/v1/tickets/:id/assign'), resolveTicket:defineLockedRoute('POST','/api/v1/tickets/:id/resolve'), closeTicket:defineLockedRoute('POST','/api/v1/tickets/:id/close'),
 assignWorkOrder:defineLockedRoute('POST','/api/v1/work-orders/:id/assign'), acceptWorkOrder:defineLockedRoute('POST','/api/v1/work-orders/:id/accept'), startTravel:defineLockedRoute('POST','/api/v1/work-orders/:id/start-travel'), arrive:defineLockedRoute('POST','/api/v1/work-orders/:id/arrive'), start:defineLockedRoute('POST','/api/v1/work-orders/:id/start'), complete:defineLockedRoute('POST','/api/v1/work-orders/:id/complete'), serviceReport:defineLockedRoute('POST','/api/v1/work-orders/:id/service-report'),
 checkIn:defineLockedRoute('POST','/api/v1/work-orders/:id/check-in'), location:defineLockedRoute('POST','/api/v1/work-orders/:id/location'), checkOut:defineLockedRoute('POST','/api/v1/work-orders/:id/check-out'),
 technicianOfflineSync:defineLockedRoute('POST','/api/v1/portal/technician/offline-sync'),
} as const;

export function fieldServiceRoutes(controller:FieldServiceController,identity:IdentityFacade,access:PlatformAccessFacade):FastifyPluginAsync{
 const guard=(permission:string)=>[identity.authenticateRequest.bind(identity),identity.resolveTenantRequest.bind(identity),async(request:FastifyRequest)=>{await access.assertModuleEnabled(request.tenant!.organizationId,'service');await identity.assertPermission(request,permission);}];
 // Appendix F rows intentionally have no permission literal. Auth + tenant + assigned-technician service scope applies.
 const technicianOnly=[identity.authenticateRequest.bind(identity),identity.resolveTenantRequest.bind(identity),async(request:FastifyRequest)=>{await access.assertModuleEnabled(request.tenant!.organizationId,'service');}];
 return async app=>{
  app.get(defs.tickets.relativePath,{schema:defs.tickets.schema,preHandler:guard('ticket.view'),handler:controller.listTickets});
  app.get(defs.ticket.relativePath,{schema:defs.ticket.schema,preHandler:guard('ticket.view'),handler:controller.getTicket});
  app.post(defs.createTicket.relativePath,{schema:defs.createTicket.schema,preHandler:guard('ticket.create'),handler:controller.createTicket});
  app.patch(defs.updateTicket.relativePath,{schema:defs.updateTicket.schema,preHandler:guard('ticket.update'),handler:controller.updateTicket});
  app.post(defs.assignTicket.relativePath,{schema:defs.assignTicket.schema,preHandler:guard('ticket.assign'),handler:controller.assignTicket});
  app.post(defs.resolveTicket.relativePath,{schema:defs.resolveTicket.schema,preHandler:guard('ticket.resolve'),handler:controller.resolveTicket});
  app.post(defs.closeTicket.relativePath,{schema:defs.closeTicket.schema,preHandler:guard('ticket.close'),handler:controller.closeTicket});
  app.get(defs.workOrders.relativePath,{schema:defs.workOrders.schema,preHandler:guard('workorder.view'),handler:controller.listWorkOrders});
  app.get(defs.workOrder.relativePath,{schema:defs.workOrder.schema,preHandler:guard('workorder.view'),handler:controller.getWorkOrder});
  app.post(defs.createWorkOrder.relativePath,{schema:defs.createWorkOrder.schema,preHandler:guard('workorder.create'),handler:controller.createWorkOrder});
  app.patch(defs.updateWorkOrder.relativePath,{schema:defs.updateWorkOrder.schema,preHandler:guard('workorder.update'),handler:controller.updateWorkOrder});
  app.post(defs.assignWorkOrder.relativePath,{schema:defs.assignWorkOrder.schema,preHandler:guard('workorder.assign'),handler:controller.assignWorkOrder});
  app.post(defs.acceptWorkOrder.relativePath,{schema:defs.acceptWorkOrder.schema,preHandler:guard('workorder.accept'),handler:controller.acceptWorkOrder});
  app.post(defs.startTravel.relativePath,{schema:defs.startTravel.schema,preHandler:guard('workorder.update'),handler:controller.startTravel});
  app.post(defs.arrive.relativePath,{schema:defs.arrive.schema,preHandler:guard('workorder.update'),handler:controller.arrive});
  app.post(defs.start.relativePath,{schema:defs.start.schema,preHandler:guard('workorder.update'),handler:controller.start});
  app.post(defs.serviceReport.relativePath,{schema:defs.serviceReport.schema,preHandler:guard('workorder.update'),handler:controller.serviceReport});
  app.post(defs.complete.relativePath,{schema:defs.complete.schema,preHandler:guard('workorder.close'),handler:controller.complete});
  app.post(defs.checkIn.relativePath,{schema:defs.checkIn.schema,preHandler:technicianOnly,handler:controller.checkIn});
  app.post(defs.location.relativePath,{schema:defs.location.schema,preHandler:technicianOnly,handler:controller.location});
  app.post(defs.checkOut.relativePath,{schema:defs.checkOut.schema,preHandler:technicianOnly,handler:controller.checkOut});
  app.post(defs.technicianOfflineSync.relativePath,{schema:defs.technicianOfflineSync.schema,preHandler:technicianOnly,handler:controller.syncTechnicianOffline});
 };
}
