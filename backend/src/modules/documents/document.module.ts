import type { FastifyPluginAsync } from 'fastify';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import { DocumentController } from './document.controller.js';
import { documentRoutes } from './document.routes.js';
import { DocumentService } from './document.service.js';
export interface DocumentModuleRuntime{readonly plugin:FastifyPluginAsync;}
export function createDocumentModule(identity:IdentityFacade,access:PlatformAccessFacade):DocumentModuleRuntime{const service=new DocumentService(access);return{plugin:documentRoutes(new DocumentController(service),identity,access)};}
