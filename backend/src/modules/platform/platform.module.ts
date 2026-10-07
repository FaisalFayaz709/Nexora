import type { FastifyPluginAsync } from 'fastify';
import { healthRoutes } from './health/health.routes.js';

export const platformModule: FastifyPluginAsync = async (app) => {
  await app.register(healthRoutes);
};
