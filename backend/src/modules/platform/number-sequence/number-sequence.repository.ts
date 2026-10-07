import { prisma, type TransactionClient } from '@nexora/database';
type Db = typeof prisma | TransactionClient;
export class NumberSequenceRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new NumberSequenceRepository(db); }
  async list(input: { organizationId: string; branchScopeId: string | null; entityType?: string; branchId?: string; fiscalYear?: number; skip: number; take: number }) {
    const where = {
      organizationId: input.organizationId,
      ...(input.branchScopeId ? { branchId: input.branchScopeId } : input.branchId ? { branchId: input.branchId } : {}),
      ...(input.entityType ? { entityType: input.entityType } : {}),
      ...(input.fiscalYear ? { fiscalYear: input.fiscalYear } : {}),
    };
    const [rows,total] = await Promise.all([
      this.db.numberSequence.findMany({ where, orderBy: [{ entityType: 'asc' },{ fiscalYear: 'desc' },{ branchScopeKey: 'asc' }], skip: input.skip, take: input.take }),
      this.db.numberSequence.count({ where }),
    ]);
    return { rows,total };
  }
  findById(organizationId: string,id: string) { return this.db.numberSequence.findFirst({ where: { id,organizationId } }); }
  create(data: any) { return this.db.numberSequence.create({ data }); }
  allocateNext(input: { organizationId:string; branchScopeKey:string; entityType:string; fiscalYear:number }) {
    return this.db.numberSequence.update({
      where: { organizationId_branchScopeKey_entityType_fiscalYear: input },
      data: { currentNumber: { increment: 1 }, lockedAt: new Date() },
    });
  }
  createReservation(data: any) { return this.db.numberSequenceReservation.create({ data }); }
  reservationCount(sequenceId: string) { return this.db.numberSequenceReservation.count({ where: { sequenceId } }); }
  consumeReservation(id:string,targetId:string) { return this.db.numberSequenceReservation.update({ where:{id}, data:{targetId,status:'CONSUMED',consumedAt:new Date()} }); }
  reset(id:string) { return this.db.numberSequence.update({ where:{id}, data:{currentNumber:0n,lockedAt:null} }); }
}
