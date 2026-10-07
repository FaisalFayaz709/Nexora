import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { DataImportController } from './data-import.controller.js';
const upload=defineLockedRoute('POST','/api/v1/imports/upload');
const validate=defineLockedRoute('POST','/api/v1/imports/:id/validate');
const commit=defineLockedRoute('POST','/api/v1/imports/:id/commit');
const rollback=defineLockedRoute('POST','/api/v1/imports/:id/rollback');
export function dataImportRoutes(controller: DataImportController, identity: IdentityFacade, access: PlatformAccessFacade): FastifyPluginAsync { const guard=[identity.authenticateRequest.bind(identity),identity.resolveTenantRequest.bind(identity),async(request:FastifyRequest)=>{await access.assertModuleEnabled(request.tenant!.organizationId,'imports'); await identity.assertPermission(request,'import.manage');}]; return async(app)=>{app.post(upload.relativePath,{schema:upload.schema,preHandler:guard,handler:controller.upload});app.post(validate.relativePath,{schema:validate.schema,preHandler:guard,handler:controller.validate});app.post(commit.relativePath,{schema:commit.schema,preHandler:guard,handler:controller.commit});app.post(rollback.relativePath,{schema:rollback.schema,preHandler:guard,handler:controller.rollback});}; }
