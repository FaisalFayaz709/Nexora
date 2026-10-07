import { describe, expect, it } from 'vitest';
import type { FastifyRequest } from 'fastify';
import { AppError } from '../http/errors.js';
import { requireAuthorizedContext } from './authenticated-context.js';

describe('authenticated request context', () => {
  it('returns actor and tenant only after the auth pipeline is complete', () => {
    const request = {
      id: 'req-1',
      ip: '127.0.0.1',
      auth: { userId: 'user-1', sessionId: 'session-1' },
      tenant: { membershipId: 'mem-1', organizationId: 'org-1', branchId: null },
    } as FastifyRequest;

    expect(requireAuthorizedContext(request)).toEqual({
      actor: { userId: 'user-1', sessionId: 'session-1' },
      tenant: { membershipId: 'mem-1', organizationId: 'org-1', branchId: null },
      requestId: 'req-1',
      ip: '127.0.0.1',
    });
  });

  it('fails closed when tenant resolution was skipped', () => {
    const request = { id: 'req-1', auth: { userId: 'user-1', sessionId: 'session-1' } } as FastifyRequest;
    expect(() => requireAuthorizedContext(request)).toThrow(AppError);
  });
});
