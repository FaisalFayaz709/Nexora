import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { API_BASE_PATH } from '@nexora/shared';
import type { AppEnv } from './config/env.js';
import { readEnv } from './config/env.js';
import { registerErrorHandling } from './core/http/error-handler.js';
import { createIdentityModule } from './modules/identity/index.js';
import { createOrganizationModule } from './modules/organization/index.js';
import { createHrModule } from './modules/hr/index.js';
import { createCustomersModule, CustomerFacade } from './modules/customers/index.js';
import { createVendorsModule, VendorGovernanceFacade } from './modules/vendors/index.js';
import { createInventoryModule } from './modules/inventory/index.js';
import { EmployeeFacade } from './modules/hr/index.js';
import { createProcurementModule } from './modules/procurement/index.js';
import { createApprovalModule, ApprovalSubjectRegistry } from './modules/approvals/index.js';
import { createProjectModule, ProjectFacade } from './modules/projects/index.js';
import { createAssetModule } from './modules/assets/index.js';
import { createFieldServiceModule } from './modules/service/index.js';
import { createMaintenanceModule } from './modules/maintenance/index.js';
import { createFinanceModule } from './modules/finance/index.js';
import { createCommercialFinanceModule } from './modules/commercial-finance/index.js';
import { createCrmModule } from './modules/crm/index.js';
import { createDocumentModule } from './modules/documents/index.js';
import { createNotificationModule } from './modules/notifications/index.js';
import { createPlatformRuntimeModule } from './modules/platform-runtime/index.js';
import { createReportingRuntimeModule } from './modules/reporting/index.js';
import { createDataImportModule } from './modules/data-import/index.js';
import { createSaaSModule } from './modules/saas/index.js';
import { createCommunicationModule } from './modules/communications/index.js';
import { createReportBuilderModule } from './modules/reports/index.js';
import { createIntegrationModule } from './modules/integrations/index.js';
import { createPortalWorkspaceModule } from './modules/portals/index.js';
import { platformModule } from './modules/platform/index.js';
import { createNumberSequenceModule } from './modules/platform/number-sequence/index.js';
import { createPlatformConfigurationModule } from './modules/platform/configuration/index.js';
import { registerOpenApi } from './plugins/openapi.js';
import { applySecurityHeaders } from './core/security/security-headers.js';

export function buildApp(env: AppEnv = readEnv()) {
  const app = Fastify({
    logger: true,
    requestIdHeader: 'x-request-id',
  });

  registerErrorHandling(app);
  void app.register(cookie);
  void registerOpenApi(app, env);

  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('x-request-id', request.id);
    applySecurityHeaders(reply, { production: env.NODE_ENV === 'production' });
    return payload;
  });

  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        requestId: request.id,
        route: request.routeOptions.url,
        status: reply.statusCode,
        durationMs: reply.elapsedTime,
        userId: request.auth?.userId ?? null,
        organizationId: request.tenant?.organizationId ?? null,
      },
      'request completed',
    );
  });

  const identity = createIdentityModule(env);
  const organization = createOrganizationModule(identity.facade);
  const platformConfiguration = createPlatformConfigurationModule(identity.facade);
  const numberSequence = createNumberSequenceModule(identity.facade, organization.facade);
  const vendorGovernance = new VendorGovernanceFacade();
  const employeeFacade = new EmployeeFacade();
  const customerFacade = new CustomerFacade();
  const inventory = createInventoryModule(
    identity.facade,
    numberSequence.facade,
    platformConfiguration.access,
  );
  const approvalSubjects = new ApprovalSubjectRegistry();
  const approvals = createApprovalModule(
    identity.facade,
    platformConfiguration.access,
    approvalSubjects,
  );
  const procurement = createProcurementModule(
    identity.facade,
    numberSequence.facade,
    inventory.facade,
    vendorGovernance,
    employeeFacade,
    platformConfiguration.access,
    approvals.facade,
  );
  approvalSubjects.register('PurchaseRequest', procurement.facade);
  approvalSubjects.register('PurchaseOrder', procurement.facade);
  const projectFacade = new ProjectFacade();
  const finance = createFinanceModule(
    identity.facade,
    numberSequence.facade,
    approvals.facade,
    customerFacade,
    employeeFacade,
    vendorGovernance,
    projectFacade,
    procurement.facade,
    platformConfiguration.access,
  );
  approvalSubjects.register('CustomerInvoice', finance.facade);
  approvalSubjects.register('SupplierInvoice', finance.facade);
  approvalSubjects.register('Expense', finance.facade);
  const projects = createProjectModule(
    identity.facade,
    numberSequence.facade,
    customerFacade,
    employeeFacade,
    inventory.facade,
    procurement.facade,
    platformConfiguration.access,
    finance.facade,
    projectFacade,
  );
  const assets = createAssetModule(
    identity.facade,
    numberSequence.facade,
    inventory.facade,
    customerFacade,
    projects.facade,
    employeeFacade,
    vendorGovernance,
    approvals.facade,
    platformConfiguration.access,
  );
  approvalSubjects.register('AssetRetirement', assets.facade);
  const fieldService = createFieldServiceModule(
    identity.facade,
    numberSequence.facade,
    customerFacade,
    assets.facade,
    employeeFacade,
    inventory.facade,
    platformConfiguration.access,
  );
  const maintenance = createMaintenanceModule(
    identity.facade,
    assets.facade,
    fieldService.facade,
    inventory.facade,
    platformConfiguration.access,
  );
  const hr = createHrModule(
    identity.facade,
    organization.facade,
    numberSequence.facade,
    approvals.facade,
    finance.facade,
    platformConfiguration.access,
  );
  approvalSubjects.register('LeaveRequest', hr.facade);
  approvalSubjects.register('PayrollRun', hr.facade);
  const commercialFinance = createCommercialFinanceModule(
    identity.facade,
    numberSequence.facade,
    finance.facade,
    procurement.facade,
    inventory.facade,
    platformConfiguration.access,
  );
  const communications = createCommunicationModule(
    identity.facade,
    platformConfiguration.access,
  );
  const reportBuilder = createReportBuilderModule(
    identity.facade,
    platformConfiguration.access,
  );
  const crm = createCrmModule(identity.facade, numberSequence.facade, customerFacade, platformConfiguration.access);
  const documents = createDocumentModule(identity.facade, platformConfiguration.access);
  const notifications = createNotificationModule(identity.facade);
  const platformRuntime = createPlatformRuntimeModule(identity.facade);
  const reportingRuntime = createReportingRuntimeModule(identity.facade, platformConfiguration.access);
  const dataImport = createDataImportModule(identity.facade, platformConfiguration.access);
  const saas = createSaaSModule(identity.facade);
  const integrations = createIntegrationModule(identity.facade, platformConfiguration.access);
  const portalWorkspace = createPortalWorkspaceModule(identity.facade, platformConfiguration.access);

  void app.register(platformModule, { prefix: API_BASE_PATH });
  void app.register(identity.plugin, { prefix: API_BASE_PATH });
  void app.register(organization.plugin, { prefix: API_BASE_PATH });
  void app.register(platformConfiguration.plugin, { prefix: API_BASE_PATH });
  void app.register(numberSequence.plugin, { prefix: API_BASE_PATH });
  void app.register(hr.plugin, { prefix: API_BASE_PATH });
  void app.register(
    createCustomersModule(identity.facade, organization.facade, platformConfiguration.access),
    { prefix: API_BASE_PATH },
  );
  void app.register(
    createVendorsModule(identity.facade, organization.facade, platformConfiguration.access),
    { prefix: API_BASE_PATH },
  );
  void app.register(inventory.plugin, { prefix: API_BASE_PATH });
  void app.register(approvals.plugin, { prefix: API_BASE_PATH });
  void app.register(procurement.plugin, { prefix: API_BASE_PATH });
  void app.register(projects.plugin, { prefix: API_BASE_PATH });
  void app.register(assets.plugin, { prefix: API_BASE_PATH });
  void app.register(fieldService.plugin, { prefix: API_BASE_PATH });
  void app.register(maintenance.plugin, { prefix: API_BASE_PATH });
  void app.register(finance.plugin, { prefix: API_BASE_PATH });
  void app.register(commercialFinance.plugin, { prefix: API_BASE_PATH });
  void app.register(communications.plugin, { prefix: API_BASE_PATH });
  void app.register(reportBuilder.plugin, { prefix: API_BASE_PATH });
  void app.register(crm.plugin, { prefix: API_BASE_PATH });
  void app.register(documents.plugin, { prefix: API_BASE_PATH });
  void app.register(notifications.plugin, { prefix: API_BASE_PATH });
  void app.register(platformRuntime.plugin, { prefix: API_BASE_PATH });
  void app.register(reportingRuntime.plugin, { prefix: API_BASE_PATH });
  void app.register(dataImport.plugin, { prefix: API_BASE_PATH });
  void app.register(saas.plugin, { prefix: API_BASE_PATH });
  void app.register(integrations.plugin, { prefix: API_BASE_PATH });
  void app.register(portalWorkspace.plugin, { prefix: API_BASE_PATH });

  app.addHook('onClose', async () => {
    await identity.close();
  });

  return app;
}
