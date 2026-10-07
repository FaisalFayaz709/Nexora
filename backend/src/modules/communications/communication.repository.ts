import { prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class CommunicationRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new CommunicationRepository(db); }

  list(input: { organizationId: string; subjectType?: string; subjectId?: string; channel?: string; status?: string; recipient?: string; skip: number; take: number }) {
    const where = {
      organizationId: input.organizationId,
      ...(input.subjectType ? { subjectType: input.subjectType } : {}),
      ...(input.subjectId ? { subjectId: input.subjectId } : {}),
      ...(input.channel ? { channel: input.channel } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.recipient ? { recipient: { contains: input.recipient, mode: 'insensitive' as const } } : {}),
    };
    return Promise.all([
      this.db.communicationLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: input.skip,
        take: input.take,
        include: { attachments: true },
      }),
      this.db.communicationLog.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  }

  findTemplate(organizationId: string, key: string, channel: string) {
    return this.db.communicationTemplate.findFirst({ where: { organizationId, key, channel, active: true } });
  }


  activeDocumentIds(organizationId: string, documentIds: string[]) {
    if (!documentIds.length) return Promise.resolve([]);
    return (this.db as any).document.findMany({
      where: { organizationId, id: { in: documentIds }, status: 'ACTIVE' },
      select: { id: true },
    });
  }

  createLog(tx: TransactionClient, data: any, attachments: Array<{ organizationId: string; documentId: string; fileName: string | null }>) {
    return tx.communicationLog.create({
      data: {
        ...data,
        attachments: { create: attachments },
      },
      include: { attachments: true },
    });
  }

  createEmailDelivery(tx: TransactionClient, data: any) {
    return tx.emailDeliveryLog.create({ data });
  }

  createEmailOutbox(tx: TransactionClient, data: any) {
    return (tx as any).emailOutbox.create({ data });
  }

  createSmsDelivery(tx: TransactionClient, data: any) {
    return tx.smsDeliveryLog.create({ data });
  }

  delivery(organizationId: string, id: string) {
    return this.db.communicationLog.findFirst({
      where: { organizationId, id },
      include: { emailDeliveryLogs: true, smsDeliveryLogs: true, attachments: true, template: true },
    });
  }
}
