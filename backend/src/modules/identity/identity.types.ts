export interface IdentityUser {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly status: string;
  readonly failedLoginAttempts: number;
  readonly lockedUntil: Date | null;
}

export interface MembershipSummary {
  readonly id: string;
  readonly organizationId: string;
  readonly branchId: string | null;
  readonly status: string;
}

export interface MembershipAuthorization extends MembershipSummary {
  readonly permissionKeys: readonly string[];
  readonly roleIds: readonly string[];
}

export interface SessionSummary {
  readonly id: string;
  readonly userId: string;
  readonly refreshTokenHash: string;
  readonly device: string | null;
  readonly ip: string | null;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
}

export interface MfaCredentialView {
  readonly id: string;
  readonly secretEncrypted: string;
}

export interface RecoveryCodeView {
  readonly id: string;
  readonly codeHash: string;
}
