import type { FastifyInstance } from 'fastify';
import { AppError } from './errors.js';

export function registerErrorHandling(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Route not found.',
        details: { method: request.method, url: request.url },
        requestId: request.id,
      },
    }),
  );

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
          requestId: request.id,
        },
      });
    }

    request.log.error({ err: error }, 'Unhandled request error');

    return reply.code(500).send({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected server error occurred.',
        requestId: request.id,
      },
    });
  });
}
