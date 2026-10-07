import type { FastifyPluginAsync } from 'fastify';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { ReportingController } from './reporting.controller.js';
import { reportingRoutes } from './reporting.routes.js';
import { ReportingService } from './reporting.service.js';
export interface ReportingRuntimeModule { readonly plugin: FastifyPluginAsync; }
export function createReportingRuntimeModule(identity: IdentityFacade, access: PlatformAccessFacade): ReportingRuntimeModule { const service=new ReportingService(access); return { plugin: reportingRoutes(new ReportingController(service), identity, access) }; }
