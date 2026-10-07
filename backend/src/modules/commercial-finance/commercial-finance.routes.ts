import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { CommercialFinanceController } from './commercial-finance.controller.js';

const defs = {
  createLandedCost: defineLockedRoute('POST', '/api/v1/landed-costs'),
  allocateLandedCost: defineLockedRoute('POST', '/api/v1/landed-costs/:id/allocate'),
  postLandedCost: defineLockedRoute('POST', '/api/v1/landed-costs/:id/post'),
  taxCodes: defineLockedRoute('GET', '/api/v1/tax-codes'),
  createTaxRule: defineLockedRoute('POST', '/api/v1/tax-rules'),
  calculateTax: defineLockedRoute('POST', '/api/v1/tax/calculate'),
  taxReports: defineLockedRoute('GET', '/api/v1/tax/reports'),
  bankAccounts: defineLockedRoute('GET', '/api/v1/bank-accounts'),
  importStatement: defineLockedRoute('POST', '/api/v1/bank-statements/import'),
  closeReconciliation: defineLockedRoute('POST', '/api/v1/bank-reconciliations/:id/close'),
  paymentVoucher: defineLockedRoute('POST', '/api/v1/vouchers/payment'),
  receiptVoucher: defineLockedRoute('POST', '/api/v1/vouchers/receipt'),
} as const;

export function commercialFinanceRoutes(
  controller: CommercialFinanceController,
  identity: IdentityFacade,
  access: PlatformAccessFacade,
): FastifyPluginAsync {
  const guard = (permission: string) => [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    async (request: FastifyRequest) => {
      await access.assertModuleEnabled(request.tenant!.organizationId, 'finance');
      await identity.assertPermission(request, permission);
    },
  ];

  return async (app) => {
    app.post(defs.createLandedCost.relativePath, { schema: defs.createLandedCost.schema, preHandler: guard('landed_cost.manage'), handler: controller.createLandedCost });
    app.post(defs.allocateLandedCost.relativePath, { schema: defs.allocateLandedCost.schema, preHandler: guard('landed_cost.manage'), handler: controller.allocateLandedCost });
    app.post(defs.postLandedCost.relativePath, { schema: defs.postLandedCost.schema, preHandler: guard('landed_cost.manage'), handler: controller.postLandedCost });

    app.get(defs.taxCodes.relativePath, { schema: defs.taxCodes.schema, preHandler: guard('tax.manage'), handler: controller.taxCodes });
    app.post(defs.createTaxRule.relativePath, { schema: defs.createTaxRule.schema, preHandler: guard('tax.manage'), handler: controller.createTaxRule });
    app.post(defs.calculateTax.relativePath, { schema: defs.calculateTax.schema, preHandler: guard('tax.manage'), handler: controller.calculateTax });
    app.get(defs.taxReports.relativePath, { schema: defs.taxReports.schema, preHandler: guard('tax.manage'), handler: controller.taxReports });

    app.get(defs.bankAccounts.relativePath, { schema: defs.bankAccounts.schema, preHandler: guard('bank.manage'), handler: controller.bankAccounts });
    app.post(defs.importStatement.relativePath, { schema: defs.importStatement.schema, preHandler: guard('bank.manage'), handler: controller.importStatement });
    app.post(defs.closeReconciliation.relativePath, { schema: defs.closeReconciliation.schema, preHandler: guard('bank.manage'), handler: controller.closeReconciliation });
    app.post(defs.paymentVoucher.relativePath, { schema: defs.paymentVoucher.schema, preHandler: guard('bank.manage'), handler: controller.paymentVoucher });
    app.post(defs.receiptVoucher.relativePath, { schema: defs.receiptVoucher.schema, preHandler: guard('bank.manage'), handler: controller.receiptVoucher });
  };
}
