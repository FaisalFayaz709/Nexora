import type { TransactionClient } from '@nexora/database';
import { redactSecuritySensitiveValue } from '../security/audit-redaction.js';

export interface AuditEntry {
  readonly organizationId: string;
  readonly actorUserId?: string | null;
  readonly action: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly beforeJson?: unknown;
  readonly afterJson?: unknown;
  readonly ip?: string | null;
}

export class AuditWriter {
  async append(tx: TransactionClient, entry: AuditEntry): Promise<void> {
    await tx.auditLog.create({
      data: {
        organizationId: entry.organizationId,
        actorUserId: entry.actorUserId ?? null,
        action: entry.action,
        subjectType: entry.subjectType,
        subjectId: entry.subjectId,
        beforeJson: redactSecuritySensitiveValue(entry.beforeJson) as never,
        afterJson: redactSecuritySensitiveValue(entry.afterJson) as never,
        ip: entry.ip ?? null,
      },
    });
  }
}
