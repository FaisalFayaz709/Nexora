import { randomInt } from 'node:crypto';
import { withTransaction } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { PasswordHasher } from '../../core/security/password-hasher.js';
import type { TotpService } from '../../core/security/totp.service.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import { IdentityRepository } from './identity.repository.js';

const DEFAULT_RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function recoveryCode(): string {
  let value = '';
  for (let index = 0; index < 10; index += 1) {
    value += RECOVERY_CODE_ALPHABET[randomInt(RECOVERY_CODE_ALPHABET.length)]!;
  }
  return `${value.slice(0, 5)}-${value.slice(5)}`;
}

function otpauthUri(input: { issuer: string; accountName: string; secret: string }): string {
  const issuer = encodeURIComponent(input.issuer);
  const account = encodeURIComponent(`${input.issuer}:${input.accountName}`);
  const secret = encodeURIComponent(input.secret);
  return `otpauth://totp/${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

export class MfaEnrollmentService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly totpService: TotpService,
    private readonly auditWriter = new AuditWriter(),
  ) {}

  async prepareEnrollment(input: { userId: string; issuer?: string }) {
    const user = await this.repository.findUserById(input.userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new AppError(403, 'AUTH_ACCOUNT_NOT_ACTIVE', 'Only active users can enroll MFA.');
    }

    const secret = this.totpService.generateSecret();
    const encryptedSecret = this.totpService.encryptSecret(secret);
    const issuer = input.issuer ?? 'NEXORA ERP';

    return {
      secret,
      encryptedSecret,
      otpauthUri: otpauthUri({ issuer, accountName: user.email, secret }),
    };
  }

  async confirmEnrollment(input: {
    tenant: TenantRequestContext;
    actorUserId: string;
    actorIp: string | null;
    targetUserId: string;
    encryptedSecret: string;
    code: string;
    recoveryCodeCount?: number;
  }) {
    await this.assertTargetUserInTenant(input.targetUserId, input.tenant.organizationId);

    if (!this.totpService.verifyEncryptedSecret(input.encryptedSecret, input.code)) {
      throw new AppError(400, 'AUTH_MFA_INVALID_CODE', 'The MFA code is invalid.');
    }

    const count = Math.min(Math.max(input.recoveryCodeCount ?? DEFAULT_RECOVERY_CODE_COUNT, 1), 20);
    const recoveryCodes = Array.from({ length: count }, () => recoveryCode());
    const recoveryCodeHashes = await Promise.all(
      recoveryCodes.map((code) => this.passwordHasher.hash(code)),
    );

    const result = await withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const credential = await repo.replaceTotpCredential({
        userId: input.targetUserId,
        encryptedSecret: input.encryptedSecret,
        recoveryCodeHashes,
      });

      await this.auditWriter.append(tx, {
        organizationId: input.tenant.organizationId,
        actorUserId: input.actorUserId,
        action: 'IDENTITY_MFA_ENROLLED',
        subjectType: 'User',
        subjectId: input.targetUserId,
        afterJson: {
          credentialId: credential.id,
          recoveryCodeCount: credential.recoveryCodeCount,
        },
        ip: input.actorIp,
      });

      return credential;
    });

    return {
      ...result,
      recoveryCodes,
    };
  }

  async disableEnrollment(input: {
    tenant: TenantRequestContext;
    actorUserId: string;
    actorIp: string | null;
    targetUserId: string;
  }) {
    await this.assertTargetUserInTenant(input.targetUserId, input.tenant.organizationId);

    return withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const result = await repo.disableTotpCredential(input.targetUserId);

      await this.auditWriter.append(tx, {
        organizationId: input.tenant.organizationId,
        actorUserId: input.actorUserId,
        action: 'IDENTITY_MFA_DISABLED',
        subjectType: 'User',
        subjectId: input.targetUserId,
        afterJson: result,
        ip: input.actorIp,
      });

      return result;
    });
  }

  private async assertTargetUserInTenant(userId: string, organizationId: string): Promise<void> {
    const user = await this.repository.findUserById(userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new AppError(403, 'AUTH_ACCOUNT_NOT_ACTIVE', 'Only active users can use MFA enrollment.');
    }

    if (!(await this.repository.userHasActiveMembership(userId, organizationId))) {
      throw new AppError(404, 'IDENTITY_USER_NOT_FOUND', 'User is not active in the selected organization.');
    }
  }
}
