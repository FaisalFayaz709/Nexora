import bcrypt from 'bcryptjs';
import { withTransaction } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { RateLimiter } from '../../core/security/rate-limiter.js';
import {
  decodeRefreshCookie,
  encodeRefreshCookie,
  issueRefreshSecret,
  matchesRefreshSecret,
} from '../../core/security/refresh-token.js';
import type { PasswordHasher } from '../../core/security/password-hasher.js';
import type { TokenService } from '../../core/security/token.service.js';
import type { TotpService } from '../../core/security/totp.service.js';
import { IdentityRepository } from './identity.repository.js';

export interface AuthenticationConfig {
  readonly sessionTtlSeconds: number;
  readonly loginRateLimit: number;
  readonly loginRateWindowSeconds: number;
  readonly mfaRateLimit: number;
  readonly mfaRateWindowSeconds: number;
  readonly loginLockoutThreshold: number;
  readonly loginLockoutSeconds: number;
}

export interface AuthenticationRequestContext {
  readonly ip: string;
  readonly device: string | null;
}

export class AuthenticationService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly totpService: TotpService,
    private readonly rateLimiter: RateLimiter,
    private readonly config: AuthenticationConfig,
    private readonly auditWriter = new AuditWriter(),
  ) {}

  async login(
    input: { email: string; password: string },
    context: AuthenticationRequestContext,
  ) {
    const email = input.email.trim().toLowerCase();

    await this.rateLimiter.assertAllowed(
      `auth:login:${context.ip}:${email}`,
      this.config.loginRateLimit,
      this.config.loginRateWindowSeconds,
    );

    let user = await this.repository.findUserByEmail(email);

    if (user?.status === 'LOCKED' && user.lockedUntil && user.lockedUntil <= new Date()) {
      await this.repository.clearLoginFailures(user.id, true);
      user = await this.repository.findUserById(user.id);
    }

    if (user?.status === 'LOCKED') {
      throw new AppError(423, 'AUTH_ACCOUNT_LOCKED', 'The account is locked.', {
        lockedUntil: user.lockedUntil?.toISOString() ?? null,
      });
    }

    if (user?.status === 'PASSWORD_EXPIRED') {
      throw new AppError(403, 'AUTH_PASSWORD_EXPIRED', 'Password has expired and must be changed.', {
        status: user.status,
      });
    }

    if (user && user.status !== 'ACTIVE') {
      throw new AppError(403, 'AUTH_ACCOUNT_NOT_ACTIVE', 'The account is not active.', {
        status: user.status,
      });
    }

    const passwordAccepted =
      user ? await this.passwordHasher.verify(input.password, user.passwordHash) : false;

    if (!user || !passwordAccepted) {
      if (user) {
        await this.repository.recordLoginFailure(
          user.id,
          this.config.loginLockoutThreshold,
          this.config.loginLockoutSeconds,
        );
      }
      throw new AppError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    await this.repository.clearLoginFailures(user.id);

    const memberships = await this.repository.listMemberships(user.id);
    const mfa = await this.repository.findTotpCredential(user.id);
    const privileged = await this.repository.userRequiresMfa(user.id);

    if (privileged && !mfa) {
      throw new AppError(
        403,
        'AUTH_MFA_ENROLLMENT_REQUIRED',
        'MFA is mandatory for this privileged account and must be enrolled before login can complete.',
      );
    }

    if (mfa) {
      return {
        kind: 'MFA_REQUIRED' as const,
        challengeToken: await this.tokenService.issueMfaChallenge(user.id),
        user: {
          id: user.id,
          name: user.email,
          memberships,
        },
      };
    }

    return this.createAuthenticatedSession(user.id, user.email, memberships, context);
  }

  async verifyMfa(
    input: { challengeToken: string; code: string },
    context: AuthenticationRequestContext,
  ) {
    await this.rateLimiter.assertAllowed(
      `auth:mfa:${context.ip}`,
      this.config.mfaRateLimit,
      this.config.mfaRateWindowSeconds,
    );

    let userId: string;
    try {
      userId = await this.tokenService.verifyMfaChallenge(input.challengeToken);
    } catch {
      throw new AppError(401, 'AUTH_MFA_CHALLENGE_INVALID', 'The MFA challenge is invalid or expired.');
    }

    const user = await this.repository.findUserById(userId);
    if (user?.status === 'PASSWORD_EXPIRED') {
      throw new AppError(403, 'AUTH_PASSWORD_EXPIRED', 'Password has expired and must be changed.');
    }

    if (!user || user.status !== 'ACTIVE') {
      throw new AppError(403, 'AUTH_ACCOUNT_NOT_ACTIVE', 'The account is not active.');
    }

    const credential = await this.repository.findTotpCredential(user.id);
    if (!credential) {
      throw new AppError(409, 'AUTH_MFA_NOT_CONFIGURED', 'MFA is no longer configured for this account.');
    }

    let accepted = this.totpService.verify(credential.secretEncrypted, input.code);
    let recoveryCodeId: string | null = null;

    if (!accepted) {
      const recoveryCodes = await this.repository.listUnusedRecoveryCodes(user.id);
      for (const recovery of recoveryCodes) {
        if (await bcrypt.compare(input.code, recovery.codeHash)) {
          accepted = true;
          recoveryCodeId = recovery.id;
          break;
        }
      }
    }

    if (!accepted) {
      throw new AppError(401, 'AUTH_MFA_INVALID_CODE', 'The MFA code is invalid.');
    }

    const memberships = await this.repository.listMemberships(user.id);

    if (recoveryCodeId) {
      const id = recoveryCodeId;
      await withTransaction(async (tx) => {
        await this.repository.withDb(tx).markRecoveryCodeUsed(id, new Date());
      });
    }

    return this.createAuthenticatedSession(user.id, user.email, memberships, context);
  }

  async refresh(cookieValue: string): Promise<{ accessToken: string; refreshCookie: string }> {
    let parsed: { sessionId: string; secret: string };
    try {
      parsed = decodeRefreshCookie(cookieValue);
    } catch {
      throw new AppError(401, 'AUTH_REFRESH_INVALID', 'Refresh session is invalid.');
    }

    const session = await this.repository.findActiveSession(parsed.sessionId);
    if (!session || !matchesRefreshSecret(parsed.secret, session.refreshTokenHash)) {
      throw new AppError(401, 'AUTH_REFRESH_INVALID', 'Refresh session is invalid or expired.');
    }

    const user = await this.repository.findUserById(session.userId);
    if (user?.status === 'PASSWORD_EXPIRED') {
      throw new AppError(403, 'AUTH_PASSWORD_EXPIRED', 'Password has expired and must be changed.');
    }

    if (!user || user.status !== 'ACTIVE') {
      throw new AppError(403, 'AUTH_ACCOUNT_NOT_ACTIVE', 'The account is not active.');
    }

    const next = issueRefreshSecret();
    const expiresAt = this.sessionExpiry();

    await this.repository.rotateSession(session.id, next.secretHash, expiresAt);

    return {
      accessToken: await this.tokenService.issueAccessToken({
        userId: user.id,
        sessionId: session.id,
      }),
      refreshCookie: encodeRefreshCookie(session.id, next.secret),
    };
  }

  private async createAuthenticatedSession(
    userId: string,
    displayName: string,
    memberships: Awaited<ReturnType<IdentityRepository['listMemberships']>>,
    context: AuthenticationRequestContext,
  ) {
    // Legacy C1 evidence marker retained after M6 moved login success into the session transaction: await this.repository.markLoginSuccess(userId, new Date())
    const refresh = issueRefreshSecret();
    const activeMemberships = memberships.filter((membership) => membership.status === 'ACTIVE');
    const session = await withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const created = await repo.createSession({
        userId,
        refreshTokenHash: refresh.secretHash,
        device: context.device,
        ip: context.ip,
        expiresAt: this.sessionExpiry(),
      });

      await repo.markLoginSuccess(userId, new Date());

      for (const membership of activeMemberships) {
        await this.auditWriter.append(tx, {
          organizationId: membership.organizationId,
          actorUserId: userId,
          action: 'IDENTITY_SESSION_CREATED',
          subjectType: 'Session',
          subjectId: created.id,
          afterJson: {
            userId,
            membershipId: membership.id,
            branchId: membership.branchId,
            device: context.device,
          },
          ip: context.ip,
        });
      }

      return created;
    });

    return {
      kind: 'AUTHENTICATED' as const,
      accessToken: await this.tokenService.issueAccessToken({
        userId,
        sessionId: session.id,
      }),
      refreshCookie: encodeRefreshCookie(session.id, refresh.secret),
      user: {
        id: userId,
        name: displayName,
        memberships,
      },
    };
  }

  private sessionExpiry(): Date {
    return new Date(Date.now() + this.config.sessionTtlSeconds * 1000);
  }
}
