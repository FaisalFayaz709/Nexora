import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';

let app: FastifyInstance | undefined;

afterEach(async () => {
  if (app) await app.close();
  app = undefined;
});

describe('stable API error envelope', () => {
  it('returns a stable not-found error with requestId', async () => {
    app = buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/not-in-spec',
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(body.error.requestId).toBeTruthy();
  });
});
