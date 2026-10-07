import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { SaaSController } from './saas.controller.js';

const routes = {
  plans: defineLockedRoute('GET','/api/v1/saas/plans'),
  createPlan: defineLockedRoute('POST','/api/v1/saas/plans'),
  planDetail: defineLockedRoute('GET','/api/v1/saas/plans/:id'),
  updatePlan: defineLockedRoute('PATCH','/api/v1/saas/plans/:id'),
  subscriptions: defineLockedRoute('GET','/api/v1/saas/subscriptions'),
  createSubscription: defineLockedRoute('POST','/api/v1/saas/subscriptions'),
  subscriptionDetail: defineLockedRoute('GET','/api/v1/saas/subscriptions/:id'),
  updateSubscription: defineLockedRoute('PATCH','/api/v1/saas/subscriptions/:id'),
  usage: defineLockedRoute('GET','/api/v1/saas/usage'),
  usageDetail: defineLockedRoute('GET','/api/v1/saas/usage/:id'),
  collectUsage: defineLockedRoute('POST','/api/v1/saas/usage/collect'),
  invoices: defineLockedRoute('GET','/api/v1/saas/invoices'),
  createInvoice: defineLockedRoute('POST','/api/v1/saas/invoices'),
  invoiceDetail: defineLockedRoute('GET','/api/v1/saas/invoices/:id'),
  updateInvoice: defineLockedRoute('PATCH','/api/v1/saas/invoices/:id'),
  postInvoice: defineLockedRoute('POST','/api/v1/saas/invoices/:id/post'),
} as const;

export function saasRoutes(controller:SaaSController, identity:IdentityFacade): FastifyPluginAsync {
  const guard=[identity.authenticateRequest.bind(identity),identity.resolveTenantRequest.bind(identity),(request:FastifyRequest)=>identity.assertPermission(request,'saas.manage')];
  return async(app)=>{
    app.get(routes.plans.relativePath,{schema:routes.plans.schema,preHandler:guard,handler:controller.plans});
    app.post(routes.createPlan.relativePath,{schema:routes.createPlan.schema,preHandler:guard,handler:controller.createPlan});
    app.get(routes.planDetail.relativePath,{schema:routes.planDetail.schema,preHandler:guard,handler:controller.planDetail});
    app.patch(routes.updatePlan.relativePath,{schema:routes.updatePlan.schema,preHandler:guard,handler:controller.updatePlan});
    app.get(routes.subscriptions.relativePath,{schema:routes.subscriptions.schema,preHandler:guard,handler:controller.subscriptions});
    app.post(routes.createSubscription.relativePath,{schema:routes.createSubscription.schema,preHandler:guard,handler:controller.subscribe});
    app.get(routes.subscriptionDetail.relativePath,{schema:routes.subscriptionDetail.schema,preHandler:guard,handler:controller.subscriptionDetail});
    app.patch(routes.updateSubscription.relativePath,{schema:routes.updateSubscription.schema,preHandler:guard,handler:controller.updateSubscription});
    app.get(routes.usage.relativePath,{schema:routes.usage.schema,preHandler:guard,handler:controller.usage});
    app.get(routes.usageDetail.relativePath,{schema:routes.usageDetail.schema,preHandler:guard,handler:controller.usageDetail});
    app.post(routes.collectUsage.relativePath,{schema:routes.collectUsage.schema,preHandler:guard,handler:controller.collectUsage});
    app.get(routes.invoices.relativePath,{schema:routes.invoices.schema,preHandler:guard,handler:controller.invoices});
    app.post(routes.createInvoice.relativePath,{schema:routes.createInvoice.schema,preHandler:guard,handler:controller.createInvoice});
    app.get(routes.invoiceDetail.relativePath,{schema:routes.invoiceDetail.schema,preHandler:guard,handler:controller.invoiceDetail});
    app.patch(routes.updateInvoice.relativePath,{schema:routes.updateInvoice.schema,preHandler:guard,handler:controller.updateInvoice});
    app.post(routes.postInvoice.relativePath,{schema:routes.postInvoice.schema,preHandler:guard,handler:controller.postInvoice});
  };
}
