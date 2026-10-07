import Redis from 'ioredis';
import { AppError } from '../http/errors.js';

const FIXED_WINDOW_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

export interface RateLimiter {
  assertAllowed(key: string, limit: number, windowSeconds: number): Promise<void>;
  close?(): Promise<void>;
}

export class RedisRateLimiter implements RateLimiter {
  private readonly redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }

  async assertAllowed(key: string, limit: number, windowSeconds: number): Promise<void> {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      const count = Number(
        await this.redis.eval(FIXED_WINDOW_SCRIPT, 1, key, windowSeconds),
      );

      if (count > limit) {
        throw new AppError(
          429,
          'AUTH_RATE_LIMITED',
          'Too many authentication attempts. Try again later.',
        );
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        503,
        'AUTH_RATE_LIMIT_UNAVAILABLE',
        'Authentication rate-limit protection is temporarily unavailable.',
      );
    }
  }

  async close(): Promise<void> {
    if (this.redis.status !== 'end') await this.redis.quit();
  }
}
