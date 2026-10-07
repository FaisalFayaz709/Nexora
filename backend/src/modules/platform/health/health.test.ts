import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../../app.js';
let app: FastifyInstance | undefined;
afterEach(async () => { if (app) await app.close(); app=undefined; });
describe('health routes', () => {
  it('serves locked liveness route', async () => { app=buildApp(); const r=await app.inject({method:'GET',url:'/api/v1/health/live'}); expect(r.statusCode).toBe(200); expect(r.json().data.status).toBe('ok'); });
  it('serves locked readiness route', async () => { app=buildApp(); const r=await app.inject({method:'GET',url:'/api/v1/health/ready'}); expect(r.statusCode).toBe(200); expect(r.json().data.scope).toBe('bootstrap'); });
});
