import type { FastifyPluginAsync } from 'fastify';
import type { IdentityFacade } from '../identity/index.js';
import { NotificationController } from './notification.controller.js';
import { notificationRoutes } from './notification.routes.js';
import { NotificationService } from './notification.service.js';
export interface NotificationModuleRuntime{readonly plugin:FastifyPluginAsync;}
export function createNotificationModule(identity:IdentityFacade):NotificationModuleRuntime{const service=new NotificationService();return{plugin:notificationRoutes(new NotificationController(service),identity)};}
