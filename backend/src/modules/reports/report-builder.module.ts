import type { FastifyPluginAsync } from 'fastify';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { ReportBuilderController } from './report-builder.controller.js';
import { reportBuilderRoutes } from './report-builder.routes.js';
import { ReportBuilderService } from './report-builder.service.js';

export interface ReportBuilderModuleRuntime { readonly plugin: FastifyPluginAsync; }
export function createReportBuilderModule(identity: IdentityFacade, access: PlatformAccessFacade): ReportBuilderModuleRuntime {
  const service = new ReportBuilderService(access);
  return { plugin: reportBuilderRoutes(new ReportBuilderController(service), identity, access) };
}
