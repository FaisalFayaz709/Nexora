import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { AppEnv } from '../config/env.js';

export async function registerOpenApi(app: FastifyInstance, env: AppEnv): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'NEXORA ERP API',
        version: '1.0.0',
        description:
          'OpenAPI is generated from Fastify route schemas. Route signatures are checked against the locked /api/v1 catalog.',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          refreshSession: {
            type: 'apiKey',
            in: 'cookie',
            name: env.AUTH_REFRESH_COOKIE_NAME,
          },
        },
      },
    },
  });

  if (env.OPENAPI_DOCS_ENABLED) {
    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
      staticCSP: true,
    });
  }
}
