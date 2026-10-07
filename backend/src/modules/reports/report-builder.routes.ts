import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { ReportBuilderController } from './report-builder.controller.js';

const defs = {
  listTemplates: defineLockedRoute('GET', '/api/v1/report-templates'),
  templateDetail: defineLockedRoute('GET', '/api/v1/report-templates/:id'),
  createTemplate: defineLockedRoute('POST', '/api/v1/report-templates'),
  updateTemplate: defineLockedRoute('PATCH', '/api/v1/report-templates/:id'),
  listSavedReports: defineLockedRoute('GET', '/api/v1/saved-reports'),
  savedReportDetail: defineLockedRoute('GET', '/api/v1/saved-reports/:id'),
  createSavedReport: defineLockedRoute('POST', '/api/v1/saved-reports'),
  updateSavedReport: defineLockedRoute('PATCH', '/api/v1/saved-reports/:id'),
  listScheduledReports: defineLockedRoute('GET', '/api/v1/scheduled-reports'),
  scheduledReportDetail: defineLockedRoute('GET', '/api/v1/scheduled-reports/:id'),
  createScheduledReport: defineLockedRoute('POST', '/api/v1/scheduled-reports'),
  updateScheduledReport: defineLockedRoute('PATCH', '/api/v1/scheduled-reports/:id'),
  listExecutions: defineLockedRoute('GET', '/api/v1/report-executions'),
  execution: defineLockedRoute('GET', '/api/v1/report-executions/:id'),
  listDashboardWidgets: defineLockedRoute('GET', '/api/v1/dashboards/widgets'),
  createDashboardWidget: defineLockedRoute('POST', '/api/v1/dashboards/widgets'),
  listSavedViews: defineLockedRoute('GET', '/api/v1/saved-views'),
  savedViewDetail: defineLockedRoute('GET', '/api/v1/saved-views/:id'),
  createSavedView: defineLockedRoute('POST', '/api/v1/saved-views'),
  updateSavedView: defineLockedRoute('PATCH', '/api/v1/saved-views/:id'),
} as const;

export function reportBuilderRoutes(controller: ReportBuilderController, identity: IdentityFacade, access: PlatformAccessFacade): FastifyPluginAsync {
  const base = [
    identity.authenticateRequest.bind(identity),
    identity.resolveTenantRequest.bind(identity),
    async (request: FastifyRequest) => {
      await access.assertModuleEnabled(request.tenant!.organizationId, 'reports');
      if (request.auth && request.tenant) {
        (request.auth as typeof request.auth & { permissions?: string[] }).permissions = await identity.permissions(request.auth.userId, request.tenant);
      }
    },
  ];
  const viewGuard = [...base, (request: FastifyRequest) => identity.assertPermission(request, 'report.view')];
  const manageGuard = [...base, (request: FastifyRequest) => identity.assertPermission(request, 'report_builder.manage')];
  return async (app) => {
    app.get(defs.listTemplates.relativePath, { schema: defs.listTemplates.schema, preHandler: viewGuard, handler: controller.listTemplates });
    app.get(defs.templateDetail.relativePath, { schema: defs.templateDetail.schema, preHandler: viewGuard, handler: controller.getTemplate });
    app.post(defs.createTemplate.relativePath, { schema: defs.createTemplate.schema, preHandler: manageGuard, handler: controller.createTemplate });
    app.patch(defs.updateTemplate.relativePath, { schema: defs.updateTemplate.schema, preHandler: manageGuard, handler: controller.updateTemplate });
    app.get(defs.listSavedReports.relativePath, { schema: defs.listSavedReports.schema, preHandler: viewGuard, handler: controller.listSavedReports });
    app.get(defs.savedReportDetail.relativePath, { schema: defs.savedReportDetail.schema, preHandler: viewGuard, handler: controller.getSavedReport });
    app.post(defs.createSavedReport.relativePath, { schema: defs.createSavedReport.schema, preHandler: manageGuard, handler: controller.createSavedReport });
    app.patch(defs.updateSavedReport.relativePath, { schema: defs.updateSavedReport.schema, preHandler: manageGuard, handler: controller.updateSavedReport });
    app.get(defs.listScheduledReports.relativePath, { schema: defs.listScheduledReports.schema, preHandler: viewGuard, handler: controller.listScheduledReports });
    app.get(defs.scheduledReportDetail.relativePath, { schema: defs.scheduledReportDetail.schema, preHandler: viewGuard, handler: controller.getScheduledReport });
    app.post(defs.createScheduledReport.relativePath, { schema: defs.createScheduledReport.schema, preHandler: manageGuard, handler: controller.createScheduledReport });
    app.patch(defs.updateScheduledReport.relativePath, { schema: defs.updateScheduledReport.schema, preHandler: manageGuard, handler: controller.updateScheduledReport });
    app.get(defs.listExecutions.relativePath, { schema: defs.listExecutions.schema, preHandler: viewGuard, handler: controller.listReportExecutions });
    app.get(defs.execution.relativePath, { schema: defs.execution.schema, preHandler: viewGuard, handler: controller.getExecution });
    app.get(defs.listDashboardWidgets.relativePath, { schema: defs.listDashboardWidgets.schema, preHandler: viewGuard, handler: controller.listDashboardWidgets });
    app.post(defs.createDashboardWidget.relativePath, { schema: defs.createDashboardWidget.schema, preHandler: manageGuard, handler: controller.createDashboardWidget });
    app.get(defs.listSavedViews.relativePath, { schema: defs.listSavedViews.schema, preHandler: viewGuard, handler: controller.listSavedViews });
    app.get(defs.savedViewDetail.relativePath, { schema: defs.savedViewDetail.schema, preHandler: viewGuard, handler: controller.getSavedView });
    app.post(defs.createSavedView.relativePath, { schema: defs.createSavedView.schema, preHandler: manageGuard, handler: controller.createSavedView });
    app.patch(defs.updateSavedView.relativePath, { schema: defs.updateSavedView.schema, preHandler: manageGuard, handler: controller.updateSavedView });
  };
}
