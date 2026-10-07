import type { FastifyPluginAsync } from 'fastify';
import type { AppEnv } from '../../config/env.js';
import { PasswordHasher } from '../../core/security/password-hasher.js';
import { PasswordPolicy } from '../../core/security/password-policy.js';
import { RedisRateLimiter } from '../../core/security/rate-limiter.js';
import { TokenService } from '../../core/security/token.service.js';
import { TotpService } from '../../core/security/totp.service.js';
import { AuthenticationService } from './authentication.service.js';
import { AuthorizationService } from './authorization.service.js';
import { IdentityController } from './identity.controller.js';
import { IdentityFacade } from './identity.facade.js';
import { IdentityRepository } from './identity.repository.js';
import { IdentityProfileService } from './identity-profile.service.js';
import { identityRoutes } from './identity.routes.js';
import { MfaEnrollmentService } from './mfa-enrollment.service.js';
import { PasswordResetRepository } from './password-reset.repository.js';
import { PasswordResetService } from './password-reset.service.js';
import { RoleService } from './role.service.js';
import { SessionService } from './session.service.js';
import { TenantResolutionService } from './tenant-resolution.service.js';
import { UserManagementService } from './user-management.service.js';

export interface IdentityModuleRuntime {
  readonly plugin: FastifyPluginAsync;
  readonly facade: IdentityFacade;
  readonly roleService: RoleService;
  readonly passwordResetService: PasswordResetService;
  readonly mfaEnrollmentService: MfaEnrollmentService;
  readonly userManagementService: UserManagementService;
  close(): Promise<void>;
}

export function createIdentityModule(env: AppEnv): IdentityModuleRuntime {
  const repository = new IdentityRepository();
  const passwordHasher = new PasswordHasher(env.AUTH_BCRYPT_COST);
  const passwordPolicy = new PasswordPolicy(env.AUTH_PASSWORD_MIN_LENGTH);
  const tokenService = new TokenService(
    env.AUTH_ACCESS_TOKEN_SECRET,
    env.AUTH_ACCESS_TOKEN_TTL_SECONDS,
    env.AUTH_MFA_CHALLENGE_TTL_SECONDS,
  );
  const totpService = new TotpService(Buffer.from(env.AUTH_MFA_ENCRYPTION_KEY, 'base64'));
  const rateLimiter = new RedisRateLimiter(env.REDIS_URL);

  const sessionService = new SessionService(repository);
  const tenantResolution = new TenantResolutionService(repository);
  const authorization = new AuthorizationService(repository);
  const facade = new IdentityFacade(
    tokenService,
    sessionService,
    tenantResolution,
    authorization,
  );
  const authService = new AuthenticationService(
    repository,
    passwordHasher,
    tokenService,
    totpService,
    rateLimiter,
    {
      sessionTtlSeconds: env.AUTH_SESSION_TTL_SECONDS,
      loginRateLimit: env.AUTH_LOGIN_RATE_LIMIT,
      loginRateWindowSeconds: env.AUTH_LOGIN_RATE_WINDOW_SECONDS,
      mfaRateLimit: env.AUTH_MFA_RATE_LIMIT,
      mfaRateWindowSeconds: env.AUTH_MFA_RATE_WINDOW_SECONDS,
      loginLockoutThreshold: env.AUTH_LOGIN_LOCKOUT_THRESHOLD,
      loginLockoutSeconds: env.AUTH_LOGIN_LOCKOUT_SECONDS,
    },
  );

  const profileService = new IdentityProfileService(repository, facade);
  const roleService = new RoleService(repository);
  const userManagementService = new UserManagementService(
    repository,
    passwordHasher,
    passwordPolicy,
  );
  const mfaEnrollmentService = new MfaEnrollmentService(
    repository,
    passwordHasher,
    totpService,
  );

  const controller = new IdentityController(
    authService,
    sessionService,
    profileService,
    facade,
    userManagementService,
    roleService,
    env,
  );

  return {
    plugin: identityRoutes(controller, facade),
    facade,
    roleService,
    mfaEnrollmentService,
    passwordResetService: new PasswordResetService(
      new PasswordResetRepository(),
      passwordHasher,
      passwordPolicy,
    ),
    userManagementService,
    async close() {
      await rateLimiter.close?.();
    },
  };
}
