import { Prisma, prisma, type TransactionClient } from '@nexora/database';

type Db = typeof prisma | TransactionClient;

export class CommercialFinanceRepository {
  constructor(private readonly db: Db = prisma) {}
  withDb(db: TransactionClient) { return new CommercialFinanceRepository(db); }

  listBankAccounts(organizationId: string, branchId: string | null, skip: number, take: number) {
    const where = { organizationId, ...(branchId ? { branchId } : {}), active: true };
    return Promise.all([
      this.db.bankAccount.findMany({ where, orderBy: [{ bankName: 'asc' }, { accountTitle: 'asc' }], skip, take }),
      this.db.bankAccount.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  }

  getBankAccount(organizationId: string, branchId: string | null, id: string) {
    return this.db.bankAccount.findFirst({ where: { id, organizationId, ...(branchId ? { branchId } : {}) } });
  }

  getCashAccount(organizationId: string, branchId: string | null, id: string) {
    return this.db.cashAccount.findFirst({ where: { id, organizationId, ...(branchId ? { branchId } : {}) } });
  }

  createBankStatement(tx: TransactionClient, data: any, lines: any[]) {
    return tx.bankStatement.create({
      data: { ...data, lines: { create: lines } },
      include: { lines: true },
    });
  }

  createBankReconciliation(tx: TransactionClient, data: any) {
    return tx.bankReconciliation.create({ data });
  }

  async lockReconciliation(tx: TransactionClient, organizationId: string, id: string) {
    const rows = await tx.$queryRaw<Array<any>>`
      SELECT * FROM "BankReconciliation"
      WHERE "id"=${id}::uuid AND "organizationId"=${organizationId}::uuid
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  closeReconciliation(tx: TransactionClient, id: string, data: any) {
    return tx.bankReconciliation.update({ where: { id }, data });
  }

  createPaymentVoucher(tx: TransactionClient, data: any) {
    return tx.paymentVoucher.create({ data });
  }

  linkPaymentVoucherJournal(tx: TransactionClient, id: string, journalEntryId: string) {
    return tx.paymentVoucher.update({ where: { id }, data: { journalEntryId } });
  }

  createReceiptVoucher(tx: TransactionClient, data: any) {
    return tx.receiptVoucher.create({ data });
  }

  linkReceiptVoucherJournal(tx: TransactionClient, id: string, journalEntryId: string) {
    return tx.receiptVoucher.update({ where: { id }, data: { journalEntryId } });
  }

  createCheque(tx: TransactionClient, data: any) {
    return tx.chequeRegister.create({ data });
  }

  createLandedCost(tx: TransactionClient, data: any, lines: any[]) {
    return tx.landedCost.create({
      data: { ...data, lines: { create: lines } },
      include: { lines: true },
    });
  }

  getLandedCost(organizationId: string, id: string) {
    return this.db.landedCost.findFirst({
      where: { organizationId, id },
      include: { lines: true, allocations: true },
    });
  }

  async lockLandedCost(tx: TransactionClient, organizationId: string, id: string) {
    const rows = await tx.$queryRaw<Array<any>>`
      SELECT * FROM "LandedCost"
      WHERE "id"=${id}::uuid AND "organizationId"=${organizationId}::uuid
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  replaceLandedCostAllocations(tx: TransactionClient, landedCostId: string, allocations: any[]) {
    return tx.landedCostAllocation.deleteMany({ where: { landedCostId } }).then(() =>
      tx.landedCostAllocation.createMany({ data: allocations }),
    );
  }

  allocations(tx: TransactionClient, landedCostId: string) {
    return tx.landedCostAllocation.findMany({ where: { landedCostId }, orderBy: { id: 'asc' } });
  }

  updateAllocationCostLayer(tx: TransactionClient, id: string, costLayerId: string) {
    return tx.landedCostAllocation.update({ where: { id }, data: { costLayerId, postedAt: new Date() } });
  }

  updateLandedCost(tx: TransactionClient, id: string, data: any) {
    return tx.landedCost.update({ where: { id }, data, include: { lines: true, allocations: true } });
  }

  listTaxCodes(organizationId: string, skip: number, take: number) {
    const where = { organizationId };
    return Promise.all([
      this.db.taxCode.findMany({ where, include: { rates: true }, orderBy: [{ code: 'asc' }], skip, take }),
      this.db.taxCode.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  }

  createTaxRuleBundle(tx: TransactionClient, input: {
    organizationId: string;
    jurisdictionName: string;
    taxCodeName: string;
    taxCode: string;
    taxType: string;
    ratePct: Prisma.Decimal;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    priority: number;
    active: boolean;
  }) {
    return tx.taxJurisdiction.upsert({
      where: { organizationId_name: { organizationId: input.organizationId, name: input.jurisdictionName } },
      update: { active: true },
      create: { organizationId: input.organizationId, name: input.jurisdictionName, active: true },
    }).then(async (jurisdiction) => {
      const taxCode = await tx.taxCode.upsert({
        where: { organizationId_code: { organizationId: input.organizationId, code: input.taxCode } },
        update: { name: input.taxCodeName, taxType: input.taxType, status: input.active ? 'ACTIVE' : 'INACTIVE' },
        create: {
          organizationId: input.organizationId,
          code: input.taxCode,
          name: input.taxCodeName,
          taxType: input.taxType,
          status: input.active ? 'ACTIVE' : 'INACTIVE',
          recoverable: input.taxType === 'PURCHASE',
        },
      });
      const rate = await tx.taxRate.create({
        data: {
          organizationId: input.organizationId,
          taxCodeId: taxCode.id,
          jurisdictionId: jurisdiction.id,
          ratePct: input.ratePct,
          effectiveFrom: input.effectiveFrom,
          effectiveTo: input.effectiveTo,
          active: input.active,
        },
      });
      const rule = await tx.taxRule.create({
        data: {
          organizationId: input.organizationId,
          taxCodeId: taxCode.id,
          jurisdictionId: jurisdiction.id,
          priority: input.priority,
          conditionJson: { taxType: input.taxType } as never,
          effectiveFrom: input.effectiveFrom,
          effectiveTo: input.effectiveTo,
          active: input.active,
        },
      });
      return { jurisdiction, taxCode, rate, rule };
    });
  }

  activeTaxRule(organizationId: string, taxCodeId: string, transactionDate: Date, jurisdictionId?: string | null) {
    return this.db.taxRule.findFirst({
      where: {
        organizationId,
        taxCodeId,
        active: true,
        effectiveFrom: { lte: transactionDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: transactionDate } }],
        ...(jurisdictionId ? { jurisdictionId } : {}),
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      include: { taxCode: { include: { rates: true } } },
    });
  }

  createTaxTransaction(tx: TransactionClient, data: any) {
    return tx.taxTransaction.create({ data });
  }

  taxReport(organizationId: string, from: Date | null, to: Date | null, taxType?: string) {
    return this.db.taxTransaction.groupBy({
      by: ['taxCodeId'],
      where: {
        organizationId,
        ...(from || to ? { transactionDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        ...(taxType ? { taxCode: { taxType } } : {}),
      },
      _sum: { taxableAmount: true, taxAmount: true },
      _count: { id: true },
    });
  }
}
