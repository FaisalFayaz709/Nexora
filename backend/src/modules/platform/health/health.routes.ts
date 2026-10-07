import type { FastifyPluginAsync } from 'fastify';
import { defineLockedRoute } from '../../../core/contracts/locked-route.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

const live = defineLockedRoute('GET', '/api/v1/health/live');
const ready = defineLockedRoute('GET', '/api/v1/health/ready');

export const healthRoutes: FastifyPluginAsync = async (app) => {
  const controller = new HealthController(new HealthService());

  app.get(live.relativePath, { schema: live.schema, handler: controller.live });
  app.get(ready.relativePath, { schema: ready.schema, handler: controller.ready });
};
