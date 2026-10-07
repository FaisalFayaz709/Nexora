import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { ReportingController } from './reporting.controller.js';
const reports=defineLockedRoute('GET','/api/v1/reports');
const report=defineLockedRoute('GET','/api/v1/reports/:id');
const requestExport=defineLockedRoute('POST','/api/v1/reports/exports');
const exportStatus=defineLockedRoute('GET','/api/v1/reports/exports/:jobId');
export function reportingRoutes(controller: ReportingController, identity: IdentityFacade, access: PlatformAccessFacade): FastifyPluginAsync {
  const guard=(permission:string)=>[identity.authenticateRequest.bind(identity),identity.resolveTenantRequest.bind(identity),async(request:FastifyRequest)=>{await access.assertModuleEnabled(request.tenant!.organizationId,'reports'); await identity.assertPermission(request,permission); if (request.auth && request.tenant) { (request.auth as typeof request.auth & { permissions?: string[] }).permissions = await identity.permissions(request.auth.userId, request.tenant); }}];
  return async(app)=>{
    app.get(reports.relativePath,{schema:reports.schema,preHandler:guard('report.view'),handler:controller.list});
    app.get(report.relativePath,{schema:report.schema,preHandler:guard('report.view'),handler:controller.detail});
    app.post(requestExport.relativePath,{schema:requestExport.schema,preHandler:guard('report.export'),handler:controller.requestExport});
    app.get(exportStatus.relativePath,{schema:exportStatus.schema,preHandler:guard('report.export'),handler:controller.exportStatus});
  };
}
