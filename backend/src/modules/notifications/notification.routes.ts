import type { FastifyPluginAsync } from 'fastify';
import { defineLockedRoute } from '../../core/contracts/locked-route.js';
import type { IdentityFacade } from '../identity/index.js';
import type { NotificationController } from './notification.controller.js';
const defs={list:defineLockedRoute('GET','/api/v1/notifications'),read:defineLockedRoute('POST','/api/v1/notifications/:id/read'),readAll:defineLockedRoute('POST','/api/v1/notifications/read-all')} as const;
export function notificationRoutes(controller:NotificationController,identity:IdentityFacade):FastifyPluginAsync{const guard=[identity.authenticateRequest.bind(identity),identity.resolveTenantRequest.bind(identity)];return async app=>{app.get(defs.list.relativePath,{schema:defs.list.schema,preHandler:guard,handler:controller.list});app.post(defs.read.relativePath,{schema:defs.read.schema,preHandler:guard,handler:controller.read});app.post(defs.readAll.relativePath,{schema:defs.readAll.schema,preHandler:guard,handler:controller.readAll});};}
