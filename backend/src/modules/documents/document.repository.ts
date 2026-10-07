import { prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class DocumentRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new DocumentRepository(db); }

  async list(organizationId: string, q: any, skip: number, take: number) {
    const where = {
      organizationId,
      ...(q.subjectType ? { subjectType: q.subjectType } : {}),
      ...(q.subjectId ? { subjectId: q.subjectId } : {}),
      ...(q.category ? { category: q.category } : {}),
      status: 'ACTIVE',
    };
    const [rows, total] = await Promise.all([
      (this.db as any).document.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      (this.db as any).document.count({ where }),
    ]);
    return { rows, total };
  }

  get(organizationId: string, id: string) {
    return (this.db as any).document.findFirst({ where: { organizationId, id, status: { not: 'DELETED' } } });
  }

  latestVersion(organizationId: string, documentId: string) {
    return (this.db as any).documentVersion.findFirst({ where: { organizationId, documentId }, orderBy: { versionNo: 'desc' } });
  }

  createDocument(data: any) {
    return (this.db as any).document.create({ data });
  }

  async setCurrentVersion(organizationId: string, id: string, currentVersionId: string) {
    const result = await (this.db as any).document.updateMany({
      where: { organizationId, id, status: { not: 'DELETED' } },
      data: { currentVersionId },
    });
    if (result.count !== 1) return null;
    return this.get(organizationId, id);
  }

  async softDelete(organizationId: string, id: string) {
    const result = await (this.db as any).document.updateMany({
      where: { organizationId, id, status: { not: 'DELETED' } },
      data: { status: 'DELETED' },
    });
    if (result.count !== 1) return null;
    return (this.db as any).document.findFirst({ where: { organizationId, id } });
  }

  addVersion(data: any) {
    return (this.db as any).documentVersion.create({ data });
  }

  createLink(data: any) {
    return (this.db as any).documentLink.create({ data });
  }

  listLinks(organizationId: string, subjectType: string, subjectId: string) {
    return (this.db as any).documentLink.findMany({ where: { organizationId, subjectType, subjectId }, orderBy: { createdAt: 'desc' } });
  }

  access(data: any) {
    return (this.db as any).documentAccessLog.create({ data });
  }
}
