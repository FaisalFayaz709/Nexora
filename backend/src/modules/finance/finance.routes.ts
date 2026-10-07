import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { FinanceController } from './finance.controller.js';

const defs = {
  customerInvoices: defineLockedRoute('GET', '/api/v1/customer-invoices'),
  customerInvoice: defineLockedRoute('GET', '/api/v1/customer-invoices/:id'),
  createCustomerInvoice: defineLockedRoute('POST', '/api/v1/customer-invoices'),
  updateCustomerInvoice: defineLockedRoute('PATCH', '/api/v1/customer-invoices/:id'),
  supplierInvoices: defineLockedRoute('GET', '/api/v1/supplier-invoices'),
  supplierInvoice: defineLockedRoute('GET', '/api/v1/supplier-invoices/:id'),
  createSupplierInvoice: defineLockedRoute('POST', '/api/v1/supplier-invoices'),
  updateSupplierInvoice: defineLockedRoute('PATCH', '/api/v1/supplier-invoices/:id'),
  expenses: defineLockedRoute('GET', '/api/v1/expenses'),
  expense: defineLockedRoute('GET', '/api/v1/expenses/:id'),
  createExpense: defineLockedRoute('POST', '/api/v1/expenses'),
  updateExpense: defineLockedRoute('PATCH', '/api/v1/expenses/:id'),
  submitCustomerInvoice: defineLockedRoute('POST', '/api/v1/customer-invoices/:id/submit'),
  approveCustomerInvoice: defineLockedRoute('POST', '/api/v1/customer-invoices/:id/approve'),
  postCustomerInvoice: defineLockedRoute('POST', '/api/v1/customer-invoices/:id/post'),
  sendCustomerInvoice: defineLockedRoute('POST', '/api/v1/customer-invoices/:id/send'),
  cancelCustomerInvoice: defineLockedRoute('POST', '/api/v1/customer-invoices/:id/cancel'),
  matchSupplierInvoice: defineLockedRoute('POST', '/api/v1/supplier-invoices/:id/match'),
  approveSupplierInvoice: defineLockedRoute('POST', '/api/v1/supplier-invoices/:id/approve'),
  payments: defineLockedRoute('GET', '/api/v1/payments'),
  createPayment: defineLockedRoute('POST', '/api/v1/payments'),
  accounts: defineLockedRoute('GET', '/api/v1/accounts'),
  createJournalEntry: defineLockedRoute('POST', '/api/v1/journal-entries'),
  postJournalEntry: defineLockedRoute('POST', '/api/v1/journal-entries/:id/post'),
  receivables: defineLockedRoute('GET', '/api/v1/finance/receivables'),
  payables: defineLockedRoute('GET', '/api/v1/finance/payables'),
} as const;

export function financeRoutes(controller: FinanceController, identity: IdentityFacade, access: PlatformAccessFacade): FastifyPluginAsync {
  const guard = (permission: string) => [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    async (request: FastifyRequest) => {
      await access.assertModuleEnabled(request.tenant!.organizationId, 'finance');
      await identity.assertPermission(request, permission);
    },
  ];
  return async (app) => {
    app.get(defs.customerInvoices.relativePath,{schema:defs.customerInvoices.schema,preHandler:guard('invoice.view'),handler:controller.listCustomerInvoices});
    app.get(defs.customerInvoice.relativePath,{schema:defs.customerInvoice.schema,preHandler:guard('invoice.view'),handler:controller.getCustomerInvoice});
    app.post(defs.createCustomerInvoice.relativePath,{schema:defs.createCustomerInvoice.schema,preHandler:guard('invoice.create'),handler:controller.createCustomerInvoice});
    app.patch(defs.updateCustomerInvoice.relativePath,{schema:defs.updateCustomerInvoice.schema,preHandler:guard('invoice.update'),handler:controller.updateCustomerInvoice});
    app.post(defs.submitCustomerInvoice.relativePath,{schema:defs.submitCustomerInvoice.schema,preHandler:guard('invoice.submit'),handler:controller.submitCustomerInvoice});
    app.post(defs.approveCustomerInvoice.relativePath,{schema:defs.approveCustomerInvoice.schema,preHandler:guard('invoice.approve'),handler:controller.approveCustomerInvoice});
    app.post(defs.postCustomerInvoice.relativePath,{schema:defs.postCustomerInvoice.schema,preHandler:guard('invoice.post'),handler:controller.postCustomerInvoice});
    app.post(defs.sendCustomerInvoice.relativePath,{schema:defs.sendCustomerInvoice.schema,preHandler:guard('invoice.send'),handler:controller.sendCustomerInvoice});
    app.post(defs.cancelCustomerInvoice.relativePath,{schema:defs.cancelCustomerInvoice.schema,preHandler:guard('invoice.cancel'),handler:controller.cancelCustomerInvoice});
    app.get(defs.supplierInvoices.relativePath,{schema:defs.supplierInvoices.schema,preHandler:guard('supplier_invoice.view'),handler:controller.listSupplierInvoices});
    app.get(defs.supplierInvoice.relativePath,{schema:defs.supplierInvoice.schema,preHandler:guard('supplier_invoice.view'),handler:controller.getSupplierInvoice});
    app.post(defs.createSupplierInvoice.relativePath,{schema:defs.createSupplierInvoice.schema,preHandler:guard('supplier_invoice.create'),handler:controller.createSupplierInvoice});
    app.patch(defs.updateSupplierInvoice.relativePath,{schema:defs.updateSupplierInvoice.schema,preHandler:guard('supplier_invoice.update'),handler:controller.updateSupplierInvoice});
    app.post(defs.matchSupplierInvoice.relativePath,{schema:defs.matchSupplierInvoice.schema,preHandler:guard('supplier_invoice.match'),handler:controller.matchSupplierInvoice});
    app.post(defs.approveSupplierInvoice.relativePath,{schema:defs.approveSupplierInvoice.schema,preHandler:guard('supplier_invoice.approve'),handler:controller.approveSupplierInvoice});
    app.get(defs.expenses.relativePath,{schema:defs.expenses.schema,preHandler:guard('expense.view'),handler:controller.listExpenses});
    app.get(defs.expense.relativePath,{schema:defs.expense.schema,preHandler:guard('expense.view'),handler:controller.getExpense});
    app.post(defs.createExpense.relativePath,{schema:defs.createExpense.schema,preHandler:guard('expense.create'),handler:controller.createExpense});
    app.patch(defs.updateExpense.relativePath,{schema:defs.updateExpense.schema,preHandler:guard('expense.update'),handler:controller.updateExpense});
    app.get(defs.payments.relativePath,{schema:defs.payments.schema,preHandler:guard('payment.view'),handler:controller.listPayments});
    app.post(defs.createPayment.relativePath,{schema:defs.createPayment.schema,preHandler:guard('payment.create'),handler:controller.createPayment});
    app.get(defs.accounts.relativePath,{schema:defs.accounts.schema,preHandler:guard('account.view'),handler:controller.listAccounts});
    app.post(defs.createJournalEntry.relativePath,{schema:defs.createJournalEntry.schema,preHandler:guard('journal.create'),handler:controller.createJournalEntry});
    app.post(defs.postJournalEntry.relativePath,{schema:defs.postJournalEntry.schema,preHandler:guard('journal.post'),handler:controller.postJournalEntry});
    app.get(defs.receivables.relativePath,{schema:defs.receivables.schema,preHandler:guard('finance.view'),handler:controller.receivables});
    app.get(defs.payables.relativePath,{schema:defs.payables.schema,preHandler:guard('finance.view'),handler:controller.payables});
  };
}
