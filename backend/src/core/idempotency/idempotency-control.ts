import type { TransactionClient } from '@nexora/database';
import { AppError } from '../http/errors.js';
import type { TenantRequestContext } from '../tenant/tenant-context.js';
import { stableRequestHash } from './request-hash.js';

export interface IdempotencyReservation {
  readonly key: string;
  readonly route: string;
  readonly requestHash: string;
  readonly responseJson: unknown | null;
  readonly replay: boolean;
}

export interface ReserveIdempotencyOptions {
  readonly tenant: TenantRequestContext;
  readonly route: string;
  readonly key: string;
  readonly requestBody: unknown;
  readonly ttlSeconds?: number;
  readonly now?: Date;
}

export class IdempotencyService {
  async reserve(tx: TransactionClient, options: ReserveIdempotencyOptions): Promise<IdempotencyReservation> {
    const now = options.now ?? new Date();
    const requestHash = stableRequestHash(options.requestBody);
    const existing = await tx.idempotencyKey.findUnique({
      where: {
        organizationId_route_key: {
          organizationId: options.tenant.organizationId,
          route: options.route,
          key: options.key,
        },
      },
    });

    if (existing) {
      if (existing.expiresAt <= now) {
        throw new AppError(409, 'IDEMPOTENCY_KEY_EXPIRED', 'Idempotency key has expired.', {
          route: options.route,
        });
      }
      if (existing.requestHash !== requestHash) {
        throw new AppError(
          409,
          'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST',
          'Idempotency key was already used for a different request payload.',
          { route: options.route },
        );
      }
      return {
        key: existing.key,
        route: existing.route,
        requestHash: existing.requestHash,
        responseJson: existing.responseJson,
        replay: existing.responseJson !== null,
      };
    }

    const ttlSeconds = options.ttlSeconds ?? 24 * 60 * 60;
    await tx.idempotencyKey.create({
      data: {
        organizationId: options.tenant.organizationId,
        route: options.route,
        key: options.key,
        requestHash,
        expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
      },
    });

    return {
      key: options.key,
      route: options.route,
      requestHash,
      responseJson: null,
      replay: false,
    };
  }

  async storeResponse(
    tx: TransactionClient,
    tenant: TenantRequestContext,
    route: string,
    key: string,
    responseJson: unknown,
  ): Promise<void> {
    await tx.idempotencyKey.update({
      where: {
        organizationId_route_key: {
          organizationId: tenant.organizationId,
          route,
          key,
        },
      },
      data: {
        responseJson: responseJson as never,
      },
    });
  }
}
