import { createHash, randomBytes } from 'node:crypto';
import { withTransaction } from '@nexora/database';
import type { PasswordHasher } from '../../core/security/password-hasher.js';
import type { PasswordPolicy } from '../../core/security/password-policy.js';
import { AppError } from '../../core/http/errors.js';
import { PasswordResetRepository } from './password-reset.repository.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Internal password-reset capability. The locked endpoint catalog does not
 * define a public reset route, so the Pass 0–6 remediation deliberately does not invent one.
 */
export class PasswordResetService {
  constructor(
    private readonly repository: PasswordResetRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly passwordPolicy: PasswordPolicy,
  ) {}

  async issue(userId: string, ttlSeconds = 1800) {
    const token = randomBytes(32).toString('base64url');
    await this.repository.create({
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    });
    return { token, expiresInSeconds: ttlSeconds };
  }

  async consume(token: string, newPassword: string): Promise<void> {
    this.passwordPolicy.assertCompliant(newPassword);
    const row = await this.repository.findUsable(hashToken(token));
    if (!row) {
      throw new AppError(400, 'AUTH_PASSWORD_RESET_INVALID', 'Password reset token is invalid or expired.');
    }
    const passwordHash = await this.passwordHasher.hash(newPassword);
    await withTransaction(async (tx) => {
      await this.repository.withDb(tx).consume(tx, {
        tokenId: row.id,
        userId: row.userId,
        passwordHash,
      });
    });
  }
}
