import { prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class PlatformRuntimeRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new PlatformRuntimeRepository(db); }

  search(organizationId: string, branchId: string | null, q: string, permissionKeys: string[], entityTypes: string[] | null, skip: number, take: number) {
    const where: any = {
      organizationId,
      permissionKey: { in: permissionKeys },
      searchText: { contains: q, mode: 'insensitive' },
      ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}),
      ...(entityTypes?.length ? { entityType: { in: entityTypes } } : {}),
    };
    return Promise.all([
      this.db.searchIndexEntry.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take }),
      this.db.searchIndexEntry.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  }

  calendar(organizationId: string, branchId: string | null, permissionKeys: string[], from: Date, to: Date, entityTypes: string[] | null, skip: number, take: number) {
    const where: any = {
      organizationId,
      permissionKey: { in: permissionKeys },
      startsAt: { gte: from, lte: to },
      ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}),
      ...(entityTypes?.length ? { entityType: { in: entityTypes } } : {}),
    };
    return Promise.all([
      this.db.calendarFeedItem.findMany({ where, orderBy: [{ startsAt: 'asc' }, { title: 'asc' }], skip, take }),
      this.db.calendarFeedItem.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  }

  auditLogs(organizationId: string, query: any, skip: number, take: number) {
    const where: any = {
      organizationId,
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.subjectType ? { subjectType: query.subjectType } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
      ...(query.from || query.to ? { createdAt: { ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}), ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}) } } : {}),
    };
    return Promise.all([
      this.db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.db.auditLog.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  }

  auditLog(organizationId: string, id: string) {
    return this.db.auditLog.findFirst({ where: { organizationId, id } });
  }
}
