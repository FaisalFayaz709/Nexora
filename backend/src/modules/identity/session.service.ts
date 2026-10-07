import { withTransaction } from '@nexora/database';
import { AppError } from '../../core/http/errors.js';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { IdentityRepository } from './identity.repository.js';

export class SessionService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly auditWriter = new AuditWriter(),
  ) {}

  async assertActive(userId: string, sessionId: string): Promise<void> {
    const session = await this.repository.findActiveSession(sessionId, userId);
    if (!session) {
      throw new AppError(401, 'AUTH_SESSION_INVALID', 'The session is invalid, expired or revoked.');
    }
  }

  async list(userId: string, currentSessionId: string) {
    const sessions = await this.repository.listSessions(userId);
    return sessions.map((session) => ({
      id: session.id,
      device: session.device,
      ip: session.ip,
      expiresAt: session.expiresAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      current: session.id === currentSessionId,
    }));
  }

  async revokeOwn(
    userId: string,
    sessionId: string,
    actorIp: string | null,
  ): Promise<void> {
    const organizations = await this.repository.listActiveMembershipOrganizations(userId);

    await withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      const revoked = await repo.revokeSession(sessionId, userId, new Date());
      if (!revoked) {
        throw new AppError(404, 'AUTH_SESSION_NOT_FOUND', 'Session not found.');
      }

      for (const organizationId of organizations) {
        await this.auditWriter.append(tx, {
          organizationId,
          actorUserId: userId,
          action: 'IDENTITY_SESSION_REVOKED',
          subjectType: 'Session',
          subjectId: sessionId,
          ip: actorIp,
        });
      }
    });
  }

  async revokeAll(userId: string, actorIp: string | null): Promise<number> {
    const organizations = await this.repository.listActiveMembershipOrganizations(userId);
    let revokedCount = 0;

    await withTransaction(async (tx) => {
      const repo = this.repository.withDb(tx);
      revokedCount = await repo.revokeAllSessions(userId, new Date());

      for (const organizationId of organizations) {
        await this.auditWriter.append(tx, {
          organizationId,
          actorUserId: userId,
          action: 'IDENTITY_ALL_SESSIONS_REVOKED',
          subjectType: 'User',
          subjectId: userId,
          afterJson: { revokedCount },
          ip: actorIp,
        });
      }
    });

    return revokedCount;
  }
}
