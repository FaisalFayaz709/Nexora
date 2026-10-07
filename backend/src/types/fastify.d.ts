import 'fastify';
import type { TenantRequestContext } from '../core/tenant/tenant-context.js';

declare module 'fastify' {
  interface FastifyRequest {
    auth?: {
      userId: string;
      sessionId: string;
    };
    tenant?: TenantRequestContext;
  }
}
