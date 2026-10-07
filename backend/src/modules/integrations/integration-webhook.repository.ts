import { prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class IntegrationWebhookRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new IntegrationWebhookRepository(db); }

  async listWebhooks(input: { organizationId: string; eventType?: string; active?: boolean; skip: number; take: number }) {
    const where = {
      organizationId: input.organizationId,
      ...(input.eventType ? { eventType: input.eventType } : {}),
      ...(typeof input.active === 'boolean' ? { active: input.active } : {}),
    };
    const [rows, total] = await Promise.all([
      (this.db as any).integrationWebhook.findMany({ where, orderBy: { createdAt: 'desc' }, skip: input.skip, take: input.take, include: { connection: true } }),
      (this.db as any).integrationWebhook.count({ where }),
    ]);
    return { rows, total };
  }

  getWebhook(organizationId: string, id: string) {
    return (this.db as any).integrationWebhook.findFirst({ where: { organizationId, id }, include: { connection: true } });
  }

  getConnection(organizationId: string, id: string) {
    return (this.db as any).integrationConnection.findFirst({ where: { organizationId, id } });
  }

  createWebhook(data: any) {
    return (this.db as any).integrationWebhook.create({ data });
  }

  async updateWebhook(organizationId: string, id: string, data: any) {
    const result = await (this.db as any).integrationWebhook.updateMany({ where: { organizationId, id }, data });
    if (result.count !== 1) return null;
    return this.getWebhook(organizationId, id);
  }

  listDeliveries(input: { organizationId: string; webhookId?: string; eventId?: string; status?: string; skip: number; take: number }) {
    const where = {
      organizationId: input.organizationId,
      ...(input.webhookId ? { webhookId: input.webhookId } : {}),
      ...(input.eventId ? { eventId: input.eventId } : {}),
      ...(input.status ? { status: input.status } : {}),
    };
    return Promise.all([
      (this.db as any).integrationWebhookDelivery.findMany({ where, orderBy: { createdAt: 'desc' }, skip: input.skip, take: input.take, include: { webhook: true } }),
      (this.db as any).integrationWebhookDelivery.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  }

  createDelivery(data: any) {
    return (this.db as any).integrationWebhookDelivery.create({ data });
  }
}
