import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { ProcurementController } from './procurement.controller.js';

const defs = {
 listPr:defineLockedRoute('GET','/api/v1/purchase-requests'), createPr:defineLockedRoute('POST','/api/v1/purchase-requests'),
 getPr:defineLockedRoute('GET','/api/v1/purchase-requests/:id'), updatePr:defineLockedRoute('PATCH','/api/v1/purchase-requests/:id'),
 submitPr:defineLockedRoute('POST','/api/v1/purchase-requests/:id/submit'), approvePr:defineLockedRoute('POST','/api/v1/purchase-requests/:id/approve'),
 rejectPr:defineLockedRoute('POST','/api/v1/purchase-requests/:id/reject'), createRfqFromPr:defineLockedRoute('POST','/api/v1/purchase-requests/:id/create-rfq'),
 listRfqs:defineLockedRoute('GET','/api/v1/rfqs'), createRfq:defineLockedRoute('POST','/api/v1/rfqs'),
 inviteVendors:defineLockedRoute('POST','/api/v1/rfqs/:id/invite-vendors'), publishRfq:defineLockedRoute('POST','/api/v1/rfqs/:id/publish'),
 closeRfq:defineLockedRoute('POST','/api/v1/rfqs/:id/close'), comparison:defineLockedRoute('GET','/api/v1/rfqs/:id/comparison'),
 createQuotation:defineLockedRoute('POST','/api/v1/supplier-quotations'), selectQuotation:defineLockedRoute('POST','/api/v1/supplier-quotations/:id/select'),
 listPos:defineLockedRoute('GET','/api/v1/purchase-orders'), createPo:defineLockedRoute('POST','/api/v1/purchase-orders'),
 submitPo:defineLockedRoute('POST','/api/v1/purchase-orders/:id/submit'), approvePo:defineLockedRoute('POST','/api/v1/purchase-orders/:id/approve'),
 sendPo:defineLockedRoute('POST','/api/v1/purchase-orders/:id/send'), cancelPo:defineLockedRoute('POST','/api/v1/purchase-orders/:id/cancel'),
 listGrn:defineLockedRoute('GET','/api/v1/goods-receipts'), receive:defineLockedRoute('POST','/api/v1/goods-receipts'),
 getGrn:defineLockedRoute('GET','/api/v1/goods-receipts/:id'), inspect:defineLockedRoute('POST','/api/v1/goods-receipts/:id/inspect'),
} as const;

export function procurementRoutes(controller:ProcurementController,identity:IdentityFacade,access:PlatformAccessFacade):FastifyPluginAsync{
 const guard=(permission:string)=>[identity.authenticateRequest.bind(identity),identity.resolveTenantRequest.bind(identity),async(request:FastifyRequest)=>{await access.assertModuleEnabled(request.tenant!.organizationId,'procurement');await identity.assertPermission(request,permission);}];
 return async app=>{
  app.get(defs.listPr.relativePath,{schema:defs.listPr.schema,preHandler:guard('purchase_request.view'),handler:controller.listPr});
  app.post(defs.createPr.relativePath,{schema:defs.createPr.schema,preHandler:guard('purchase_request.create'),handler:controller.createPr});
  app.get(defs.getPr.relativePath,{schema:defs.getPr.schema,preHandler:guard('purchase_request.view'),handler:controller.getPr});
  app.patch(defs.updatePr.relativePath,{schema:defs.updatePr.schema,preHandler:guard('purchase_request.update'),handler:controller.updatePr});
  app.post(defs.submitPr.relativePath,{schema:defs.submitPr.schema,preHandler:guard('purchase_request.submit'),handler:controller.submitPr});
  app.post(defs.approvePr.relativePath,{schema:defs.approvePr.schema,preHandler:guard('purchase_request.approve'),handler:controller.approvePr});
  app.post(defs.rejectPr.relativePath,{schema:defs.rejectPr.schema,preHandler:guard('purchase_request.approve'),handler:controller.rejectPr});
  app.post(defs.createRfqFromPr.relativePath,{schema:defs.createRfqFromPr.schema,preHandler:guard('rfq.create'),handler:controller.createRfqFromPr});
  app.get(defs.listRfqs.relativePath,{schema:defs.listRfqs.schema,preHandler:guard('rfq.view'),handler:controller.listRfqs});
  app.post(defs.createRfq.relativePath,{schema:defs.createRfq.schema,preHandler:guard('rfq.create'),handler:controller.createRfq});
  app.post(defs.inviteVendors.relativePath,{schema:defs.inviteVendors.schema,preHandler:guard('rfq.update'),handler:controller.inviteVendors});
  app.post(defs.publishRfq.relativePath,{schema:defs.publishRfq.schema,preHandler:guard('rfq.publish'),handler:controller.publishRfq});
  app.post(defs.closeRfq.relativePath,{schema:defs.closeRfq.schema,preHandler:guard('rfq.close'),handler:controller.closeRfq});
  app.get(defs.comparison.relativePath,{schema:defs.comparison.schema,preHandler:guard('supplier_quotation.view'),handler:controller.comparison});
  app.post(defs.createQuotation.relativePath,{schema:defs.createQuotation.schema,preHandler:guard('supplier_quotation.create'),handler:controller.createQuotation});
  app.post(defs.selectQuotation.relativePath,{schema:defs.selectQuotation.schema,preHandler:guard('supplier_quotation.select'),handler:controller.selectQuotation});
  app.get(defs.listPos.relativePath,{schema:defs.listPos.schema,preHandler:guard('purchase_order.view'),handler:controller.listPos});
  app.post(defs.createPo.relativePath,{schema:defs.createPo.schema,preHandler:guard('purchase_order.create'),handler:controller.createPo});
  app.post(defs.submitPo.relativePath,{schema:defs.submitPo.schema,preHandler:guard('purchase_order.submit'),handler:controller.submitPo});
  app.post(defs.approvePo.relativePath,{schema:defs.approvePo.schema,preHandler:guard('purchase_order.approve'),handler:controller.approvePo});
  app.post(defs.sendPo.relativePath,{schema:defs.sendPo.schema,preHandler:guard('purchase_order.send'),handler:controller.sendPo});
  app.post(defs.cancelPo.relativePath,{schema:defs.cancelPo.schema,preHandler:guard('purchase_order.cancel'),handler:controller.cancelPo});
  app.get(defs.listGrn.relativePath,{schema:defs.listGrn.schema,preHandler:guard('goods_receipt.view'),handler:controller.listGrn});
  app.post(defs.receive.relativePath,{schema:defs.receive.schema,preHandler:guard('goods_receipt.create'),handler:controller.receive});
  app.get(defs.getGrn.relativePath,{schema:defs.getGrn.schema,preHandler:guard('goods_receipt.view'),handler:controller.getGrn});
  app.post(defs.inspect.relativePath,{schema:defs.inspect.schema,preHandler:guard('goods_receipt.inspect'),handler:controller.inspect});
 };
}
