import { prisma, type TransactionClient } from '@nexora/database';
import type {
  IdentityUser,
  MembershipAuthorization,
  MembershipSummary,
  MfaCredentialView,
  RecoveryCodeView,
  SessionSummary,
} from './identity.types.js';

type Db = typeof prisma | TransactionClient;

const userSelect = {
  id: true,
  email: true,
  passwordHash: true,
  status: true,
  failedLoginAttempts: true,
  lockedUntil: true,
} as const;

export class IdentityRepository {
  constructor(private readonly db: Db = prisma) {}

  withDb(db: TransactionClient): IdentityRepository {
    return new IdentityRepository(db);
  }

  async findUserByEmail(email: string): Promise<IdentityUser | null> {
    const row = await this.db.user.findUnique({ where: { email }, select: userSelect });
    return row ? { ...row, status: String(row.status) } : null;
  }

  async findUserById(userId: string): Promise<IdentityUser | null> {
    const row = await this.db.user.findUnique({ where: { id: userId }, select: userSelect });
    return row ? { ...row, status: String(row.status) } : null;
  }

  async recordLoginFailure(
    userId: string,
    threshold: number,
    lockoutSeconds: number,
  ): Promise<{ locked: boolean; attempts: number; lockedUntil: Date | null }> {
    return this.db.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: { increment: 1 } },
        select: { failedLoginAttempts: true, status: true, lockedUntil: true },
      });

      if (user.failedLoginAttempts < threshold) {
        return {
          locked: user.status === 'LOCKED',
          attempts: user.failedLoginAttempts,
          lockedUntil: user.lockedUntil,
        };
      }

      const lockedUntil = new Date(Date.now() + lockoutSeconds * 1000);
      const locked = await tx.user.update({
        where: { id: userId },
        data: { status: 'LOCKED', lockedUntil },
        select: { failedLoginAttempts: true, lockedUntil: true },
      });
      return {
        locked: true,
        attempts: locked.failedLoginAttempts,
        lockedUntil: locked.lockedUntil,
      };
    });
  }

  async clearLoginFailures(userId: string, unlockExpired = false): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        ...(unlockExpired ? { status: 'ACTIVE' } : {}),
      },
    });
  }

  async userRequiresMfa(userId: string): Promise<boolean> {
    return (
      (await this.db.organizationMembership.count({
        where: {
          userId,
          status: 'ACTIVE',
          userRoles: {
            some: {
              role: {
                mfaRequired: true,
              },
            },
          },
        },
      })) > 0
    );
  }

  async listMemberships(userId: string): Promise<MembershipSummary[]> {
    return this.db.organizationMembership.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        organizationId: true,
        branchId: true,
        status: true,
      },
    });
  }

  async getMembershipAuthorization(
    userId: string,
    organizationId: string,
  ): Promise<MembershipAuthorization | null> {
    const row = await this.db.organizationMembership.findFirst({
      where: { userId, organizationId, status: 'ACTIVE' },
      select: {
        id: true,
        organizationId: true,
        branchId: true,
        status: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                rolePermissions: {
                  select: {
                    permission: { select: { key: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!row) return null;

    const permissionKeys: string[] = [
      ...new Set<string>(
        row.userRoles.flatMap((assignment) =>
          assignment.role.rolePermissions.map((item) => String(item.permission.key)),
        ),
      ),
    ].sort();

    const roleIds = [...new Set<string>(
      row.userRoles.map((assignment) => String(assignment.role.id)),
    )].sort();

    return {
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      status: row.status,
      permissionKeys,
      roleIds,
    };
  }

  async listActiveMembershipOrganizations(userId: string): Promise<string[]> {
    const rows = await this.db.organizationMembership.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { organizationId: true },
    });
    return [...new Set<string>(rows.map((row) => String(row.organizationId)))];
  }

  async findTotpCredential(userId: string): Promise<MfaCredentialView | null> {
    return this.db.mfaCredential.findFirst({
      where: { userId, type: 'TOTP' },
      orderBy: { enabledAt: 'desc' },
      select: { id: true, secretEncrypted: true },
    });
  }

  async listUnusedRecoveryCodes(userId: string): Promise<RecoveryCodeView[]> {
    return this.db.mfaRecoveryCode.findMany({
      where: { userId, usedAt: null },
      select: { id: true, codeHash: true },
    });
  }

  async markRecoveryCodeUsed(id: string, usedAt: Date): Promise<void> {
    await this.db.mfaRecoveryCode.update({ where: { id }, data: { usedAt } });
  }

  async createSession(input: {
    userId: string;
    refreshTokenHash: string;
    device: string | null;
    ip: string | null;
    expiresAt: Date;
  }): Promise<SessionSummary> {
    return this.db.session.create({
      data: input,
      select: {
        id: true,
        userId: true,
        refreshTokenHash: true,
        device: true,
        ip: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
  }

  async findActiveSession(sessionId: string, userId?: string): Promise<SessionSummary | null> {
    return this.db.session.findFirst({
      where: {
        id: sessionId,
        ...(userId ? { userId } : {}),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userId: true,
        refreshTokenHash: true,
        device: true,
        ip: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
  }

  async rotateSession(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.db.session.update({
      where: { id: sessionId },
      data: { refreshTokenHash, expiresAt },
    });
  }

  async revokeSession(sessionId: string, userId: string, revokedAt: Date): Promise<boolean> {
    const result = await this.db.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt },
    });
    return result.count > 0;
  }

  async revokeAllSessions(userId: string, revokedAt: Date): Promise<number> {
    const result = await this.db.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
    return result.count;
  }

  async listSessions(userId: string): Promise<SessionSummary[]> {
    return this.db.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        refreshTokenHash: true,
        device: true,
        ip: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
  }


  async userHasActiveMembership(userId: string, organizationId: string): Promise<boolean> {
    return (
      (await this.db.organizationMembership.count({
        where: { userId, organizationId, status: 'ACTIVE' },
      })) > 0
    );
  }

  async roleBelongsToOrganization(roleId: string, organizationId: string): Promise<boolean> {
    return (await this.db.role.count({ where: { id: roleId, organizationId } })) === 1;
  }

  async membershipBelongsToOrganization(
    membershipId: string,
    organizationId: string,
  ): Promise<boolean> {
    return (
      (await this.db.organizationMembership.count({
        where: { id: membershipId, organizationId },
      })) === 1
    );
  }

  async permissionIdsByKeys(keys: readonly string[]): Promise<Map<string, string>> {
    const rows = await this.db.permission.findMany({
      where: { key: { in: [...keys] } },
      select: { id: true, key: true },
    });
    return new Map(rows.map((row) => [row.key, row.id]));
  }

  async replaceRolePermissions(roleId: string, permissionIds: readonly string[]): Promise<void> {
    await this.db.rolePermission.deleteMany({ where: { roleId } });
    if (permissionIds.length) {
      await this.db.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      });
    }
  }

  async assignRole(membershipId: string, roleId: string): Promise<void> {
    await this.db.userRole.upsert({
      where: { membershipId_roleId: { membershipId, roleId } },
      update: {},
      create: { membershipId, roleId },
    });
  }

async markLoginSuccess(userId: string, at: Date): Promise<void> {
  await this.db.user.update({
    where: { id: userId },
    data: { lastLoginAt: at },
  });
}

branchBelongsToOrganization(organizationId: string, branchId: string): Promise<boolean> {
  return this.db.branch
    .count({ where: { id: branchId, organizationId } })
    .then((count) => count === 1);
}

async listTenantUsers(input: {
  organizationId: string;
  branchScopeId: string | null;
  branchId?: string;
  status?: string;
  search?: string;
  skip: number;
  take: number;
}) {
  const where = {
    organizationId: input.organizationId,
    ...(input.branchScopeId
      ? { branchId: input.branchScopeId }
      : input.branchId
        ? { branchId: input.branchId }
        : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.search
      ? {
          user: {
            email: { contains: input.search, mode: 'insensitive' as const },
          },
        }
      : {}),
  };

  const [memberships, total] = await Promise.all([
    this.db.organizationMembership.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: input.skip,
      take: input.take,
      select: {
        id: true,
        branchId: true,
        status: true,
        user: { select: { id: true, email: true, status: true, lastLoginAt: true } },
        userRoles: { select: { role: { select: { id: true, name: true, mfaRequired: true } } } },
      },
    }),
    this.db.organizationMembership.count({ where }),
  ]);

  return {
    rows: memberships.map((membership) => ({
      membershipId: membership.id,
      branchId: membership.branchId,
      membershipStatus: membership.status,
      id: membership.user.id,
      email: membership.user.email,
      status: String(membership.user.status),
      lastLoginAt: membership.user.lastLoginAt?.toISOString() ?? null,
      roles: membership.userRoles.map((item) => item.role),
    })),
    total,
  };
}

async getTenantUser(input: {
  organizationId: string;
  branchScopeId: string | null;
  membershipId: string;
}) {
  const membership = await this.db.organizationMembership.findFirst({
    where: {
      id: input.membershipId,
      organizationId: input.organizationId,
      ...(input.branchScopeId ? { branchId: input.branchScopeId } : {}),
    },
    select: {
      id: true,
      branchId: true,
      status: true,
      user: { select: { id: true, email: true, status: true, lastLoginAt: true } },
      userRoles: { select: { role: { select: { id: true, name: true, mfaRequired: true } } } },
    },
  });

  if (!membership) return null;
  return {
    membershipId: membership.id,
    branchId: membership.branchId,
    membershipStatus: membership.status,
    id: membership.user.id,
    email: membership.user.email,
    status: String(membership.user.status),
    lastLoginAt: membership.user.lastLoginAt?.toISOString() ?? null,
    roles: membership.userRoles.map((item) => item.role),
  };
}

async createTenantUser(input: {
  organizationId: string;
  branchId: string | null;
  email: string;
  passwordHash: string;
  roleIds: readonly string[];
}) {
  const row = await this.db.user.create({
    data: {
      email: input.email,
      passwordHash: input.passwordHash,
      status: 'ACTIVE',
      memberships: {
        create: {
          organizationId: input.organizationId,
          branchId: input.branchId,
          status: 'ACTIVE',
          userRoles: {
            create: input.roleIds.map((roleId) => ({ roleId })),
          },
        },
      },
    },
    select: {
      id: true,
      email: true,
      status: true,
      memberships: {
        where: { organizationId: input.organizationId },
        take: 1,
        select: { id: true, branchId: true, status: true },
      },
    },
  });

  const membership = row.memberships[0];
  if (!membership) throw new Error('Tenant membership was not created with user.');
  return {
    id: row.id,
    email: row.email,
    status: String(row.status),
    membershipId: membership.id,
    branchId: membership.branchId,
    membershipStatus: membership.status,
  };
}

async setTenantUserStatus(input: {
  organizationId: string;
  membershipId: string;
  status: string;
}) {
  const membership = await this.db.organizationMembership.findFirst({
    where: { id: input.membershipId, organizationId: input.organizationId },
    select: { userId: true },
  });
  if (!membership) return null;

  const user = await this.db.user.update({
    where: { id: membership.userId },
    data: {
      status: input.status as never,
      ...(input.status === 'ACTIVE' ? { lockedUntil: null, failedLoginAttempts: 0 } : {}),
    },
    select: { id: true, email: true, status: true, lastLoginAt: true },
  });

  return {
    membershipId: input.membershipId,
    id: user.id,
    email: user.email,
    status: String(user.status),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}


async listPermissions() {
  return this.db.permission.findMany({
    orderBy: { key: 'asc' },
    select: { id: true, key: true, description: true },
  });
}

async listRoles(organizationId: string) {
  return this.db.role.findMany({
    where: { organizationId },
    orderBy: [{ systemRole: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      systemRole: true,
      mfaRequired: true,
      rolePermissions: { select: { permission: { select: { key: true } } } },
    },
  }).then((rows) => rows.map((role) => ({
    id: role.id,
    name: role.name,
    systemRole: role.systemRole,
    mfaRequired: role.mfaRequired,
    permissionKeys: role.rolePermissions.map((item) => item.permission.key).sort(),
  })));
}

async createRole(input: {
  organizationId: string;
  name: string;
  mfaRequired: boolean;
  permissionIds: readonly string[];
}) {
  const role = await this.db.role.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      mfaRequired: input.mfaRequired,
      systemRole: false,
      rolePermissions: {
        create: input.permissionIds.map((permissionId) => ({ permissionId })),
      },
    },
    select: {
      id: true,
      name: true,
      systemRole: true,
      mfaRequired: true,
      rolePermissions: { select: { permission: { select: { key: true } } } },
    },
  });
  return {
    id: role.id,
    name: role.name,
    systemRole: role.systemRole,
    mfaRequired: role.mfaRequired,
    permissionKeys: role.rolePermissions.map((item) => item.permission.key).sort(),
  };
}

async updateRoleMfaRequirement(roleId: string, mfaRequired: boolean) {
  const role = await this.db.role.update({
    where: { id: roleId },
    data: { mfaRequired },
    select: {
      id: true,
      name: true,
      systemRole: true,
      mfaRequired: true,
      rolePermissions: { select: { permission: { select: { key: true } } } },
    },
  });
  return {
    id: role.id,
    name: role.name,
    systemRole: role.systemRole,
    mfaRequired: role.mfaRequired,
    permissionKeys: role.rolePermissions.map((item) => item.permission.key).sort(),
  };
}

async replaceTotpCredential(input: {
  userId: string;
  encryptedSecret: string;
  recoveryCodeHashes: readonly string[];
}) {
  await this.db.mfaCredential.deleteMany({ where: { userId: input.userId, type: 'TOTP' } });
  await this.db.mfaRecoveryCode.deleteMany({
    where: { userId: input.userId, usedAt: null },
  });

  const credential = await this.db.mfaCredential.create({
    data: {
      userId: input.userId,
      type: 'TOTP',
      secretEncrypted: input.encryptedSecret,
      enabledAt: new Date(),
    },
    select: { id: true, userId: true, type: true, enabledAt: true },
  });

  if (input.recoveryCodeHashes.length) {
    await this.db.mfaRecoveryCode.createMany({
      data: input.recoveryCodeHashes.map((codeHash) => ({
        userId: input.userId,
        codeHash,
      })),
    });
  }

  return {
    id: credential.id,
    userId: credential.userId,
    type: credential.type,
    enabledAt: credential.enabledAt.toISOString(),
    recoveryCodeCount: input.recoveryCodeHashes.length,
  };
}

async disableTotpCredential(userId: string): Promise<{ disabledCredentials: number; disabledRecoveryCodes: number }> {
  const credentials = await this.db.mfaCredential.deleteMany({
    where: { userId, type: 'TOTP' },
  });
  const recoveryCodes = await this.db.mfaRecoveryCode.deleteMany({
    where: { userId, usedAt: null },
  });
  return {
    disabledCredentials: credentials.count,
    disabledRecoveryCodes: recoveryCodes.count,
  };
}

}
