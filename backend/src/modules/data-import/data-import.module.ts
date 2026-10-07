import type { FastifyPluginAsync } from 'fastify';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { DataImportController } from './data-import.controller.js';
import { dataImportRoutes } from './data-import.routes.js';
import { DataImportService } from './data-import.service.js';
export interface DataImportModule { readonly plugin: FastifyPluginAsync; }
export function createDataImportModule(identity: IdentityFacade, access: PlatformAccessFacade): DataImportModule { const service=new DataImportService(access); return { plugin: dataImportRoutes(new DataImportController(service), identity, access) }; }
