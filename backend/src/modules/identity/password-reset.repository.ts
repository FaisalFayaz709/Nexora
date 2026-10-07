import { prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class PasswordResetRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new PasswordResetRepository(db); }

  create(input: { userId: string; tokenHash: string; expiresAt: Date }) {
    return this.db.passwordResetToken.create({ data: input });
  }

  findUsable(tokenHash: string) {
    return this.db.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async consume(
    tx: TransactionClient,
    input: { tokenId: string; userId: string; passwordHash: string },
  ) {
    await tx.passwordResetToken.update({
      where: { id: input.tokenId },
      data: { usedAt: new Date() },
    });
    await tx.user.update({
      where: { id: input.userId },
      data: {
        passwordHash: input.passwordHash,
        passwordChangedAt: new Date(),
        status: 'ACTIVE',
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await tx.session.updateMany({
      where: { userId: input.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
