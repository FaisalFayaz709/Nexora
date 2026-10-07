import { Prisma, withTransaction } from '@nexora/database';
import { AuditWriter } from '../../core/audit/audit-writer.js';
import { BusinessEventWriter } from '../../core/events/business-event-writer.js';
import { AppError } from '../../core/http/errors.js';
import type { TenantRequestContext } from '../../core/tenant/tenant-context.js';
import type { FinanceFacade } from '../finance/index.js';
import type { InventoryFacade } from '../inventory/index.js';
import type { NumberSequenceFacade } from '../platform/number-sequence/index.js';
import type { PlatformAccessFacade } from '../platform/configuration/index.js';
import type { ProcurementFacade } from '../procurement/index.js';
import { CommercialFinanceRepository } from './commercial-finance.repository.js';

function page(query: { page?: number; pageSize?: number }) {
  const current = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 25, 100);
  return { page: current, pageSize, skip: (current - 1) * pageSize, take: pageSize };
}
function dec(value: string | number | Prisma.Decimal) { return new Prisma.Decimal(value); }
function dateOnly(value: string) { return new Date(`${value}T00:00:00.000Z`); }
function assertPositiveMoney(value: Prisma.Decimal, code: string) {
  if (!value.isPositive()) throw new AppError(400, code, 'Amount must be greater than zero.');
}

function assertExactlyOneFundingAccount(input: { bankAccountId?: string | null; cashAccountId?: string | null }) {
  if (!input.bankAccountId && !input.cashAccountId) throw new AppError(400, 'VOUCHER_FUNDING_ACCOUNT_REQUIRED', 'A voucher must use either bank or cash account.');
  if (input.bankAccountId && input.cashAccountId) throw new AppError(400, 'VOUCHER_FUNDING_ACCOUNT_EXCLUSIVE', 'A voucher cannot use both bank and cash account.');
}

function assertReconciliationNotClosed(status: string) {
  if (status === 'CLOSED') throw new AppError(409, 'BANK_RECONCILIATION_ALREADY_CLOSED', 'Closed reconciliations cannot be silently edited.');
}

export class CommercialFinanceService {
  constructor(
    private readonly numbers: NumberSequenceFacade,
    private readonly finance: FinanceFacade,
    private readonly procurement: ProcurementFacade,
    private readonly inventory: InventoryFacade,
    private readonly access: PlatformAccessFacade,
    private readonly repository = new CommercialFinanceRepository(),
    private readonly audit = new AuditWriter(),
    private readonly events = new BusinessEventWriter(),
  ) {}

  private async enabled(organizationId: string) {
    await this.access.assertModuleEnabled(organizationId, 'finance');
  }

  async createLandedCost(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, input: any) {
    await this.enabled(tenant.organizationId);
    await this.procurement.supplierInvoiceSource(
      tenant.organizationId,
      input.purchaseOrderId,
      input.goodsReceiptId,
    );

    const total = input.lines.reduce(
      (sum: Prisma.Decimal, line: any) => sum.add(dec(line.amount)),
      new Prisma.Decimal(0),
    );
    assertPositiveMoney(total, 'LANDED_COST_TOTAL_INVALID');

    return this.numbers.withBusinessNumber({
      organizationId: tenant.organizationId,
      branchId: tenant.branchId,
      entityType: 'LANDED_COST',
      fiscalYear: new Date().getUTCFullYear(),
      targetType: 'LandedCost',
      createTarget: async (tx, landedCostNo) => {
        const accounts = await this.finance.ensureCommercialAccounts(tx, tenant.organizationId);
        const row = await this.repository.createLandedCost(
          tx,
          {
            organizationId: tenant.organizationId,
            landedCostNo,
            purchaseOrderId: input.purchaseOrderId,
            goodsReceiptId: input.goodsReceiptId,
            supplierInvoiceId: input.supplierInvoiceId ?? null,
            allocationMethod: input.allocationMethod,
            status: 'DRAFT',
            totalCost: total,
          },
          input.lines.map((line: any) => ({
            costType: line.costType,
            description: line.description,
            amount: dec(line.amount),
            accountId: line.accountId ?? accounts['5000'],
          })),
        );
        await this.audit.append(tx, {
          organizationId: tenant.organizationId,
          actorUserId: actor.userId,
          action: 'LANDED_COST_CREATED',
          subjectType: 'LandedCost',
          subjectId: row.id,
          afterJson: { landedCostNo, totalCost: total.toString(), allocationMethod: input.allocationMethod },
          ip: actor.ip,
        });
        return row;
      },
    });
  }

  async allocateLandedCost(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, id: string, input: any) {
    await this.enabled(tenant.organizationId);
    return withTransaction(async (tx) => {
      const landed = await this.repository.lockLandedCost(tx, tenant.organizationId, id);
      if (!landed) throw new AppError(404, 'LANDED_COST_NOT_FOUND', 'Landed cost not found.');
      if (landed.status !== 'DRAFT' && landed.status !== 'ALLOCATED') {
        throw new AppError(409, 'LANDED_COST_NOT_ALLOCATABLE', 'Only DRAFT or ALLOCATED landed costs can be allocated.');
      }

      const allocated = input.allocations.reduce(
        (sum: Prisma.Decimal, allocation: any) => sum.add(dec(allocation.allocatedAmount)),
        new Prisma.Decimal(0),
      );
      if (!allocated.eq(landed.totalCost)) {
        throw new AppError(400, 'LANDED_COST_ALLOCATION_MISMATCH', 'Allocated amounts must reconcile to total landed cost.');
      }

      await this.repository.replaceLandedCostAllocations(
        tx,
        id,
        input.allocations.map((allocation: any) => {
          const quantity = dec(allocation.quantity);
          const amount = dec(allocation.allocatedAmount);
          return {
            landedCostId: id,
            goodsReceiptItemId: allocation.goodsReceiptItemId,
            productId: allocation.productId,
            warehouseId: allocation.warehouseId,
            quantity,
            allocatedAmount: amount,
            unitCostDelta: amount.div(quantity),
          };
        }),
      );
      const row = await this.repository.updateLandedCost(tx, id, { status: 'ALLOCATED' });
      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'LANDED_COST_ALLOCATED',
        subjectType: 'LandedCost',
        subjectId: id,
        afterJson: { totalCost: landed.totalCost.toString(), allocationCount: input.allocations.length },
        ip: actor.ip,
      });
      return row;
    });
  }

  async postLandedCost(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
    input: any,
    idempotencyKey: string,
  ) {
    await this.enabled(tenant.organizationId);
    if (!idempotencyKey) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Landed cost posting requires Idempotency-Key.');

    return withTransaction(async (tx) => {
      const landed = await this.repository.lockLandedCost(tx, tenant.organizationId, id);
      if (!landed) throw new AppError(404, 'LANDED_COST_NOT_FOUND', 'Landed cost not found.');
      if (landed.status === 'POSTED') return { id, status: 'POSTED', journalEntryId: landed.journalEntryId };
      if (landed.status !== 'ALLOCATED') {
        throw new AppError(409, 'LANDED_COST_POST_INVALID_STATE', 'Landed cost must be ALLOCATED before posting.');
      }
      if (landed.idempotencyKey && landed.idempotencyKey !== idempotencyKey) {
        throw new AppError(409, 'IDEMPOTENCY_KEY_REUSED', 'Landed cost was posted with another idempotency key.');
      }

      const allocations = await this.repository.allocations(tx, id);
      const allocated = allocations.reduce((sum, row) => sum.add(row.allocatedAmount), new Prisma.Decimal(0));
      if (!allocated.eq(landed.totalCost)) {
        throw new AppError(400, 'LANDED_COST_ALLOCATION_MISMATCH', 'Allocated amount must equal landed cost total before posting.');
      }

      for (const allocation of allocations) {
        const layer = await this.inventory.recordLandedCostLayer(tx, {
          organizationId: tenant.organizationId,
          warehouseId: allocation.warehouseId,
          productId: allocation.productId,
          quantity: allocation.quantity,
          unitCostDelta: allocation.unitCostDelta,
          landedCostId: id,
          allocationId: allocation.id,
        });
        await this.repository.updateAllocationCostLayer(tx, allocation.id, layer.id);
      }

      const accounts = await this.finance.ensureCommercialAccounts(tx, tenant.organizationId);
      const journal = await this.finance.postCommercialJournal(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        referenceType: 'LandedCost',
        referenceId: id,
        lines: [
          { accountId: accounts['1200'], debit: landed.totalCost, branchId: tenant.branchId },
          { accountId: accounts['2000'], credit: landed.totalCost, branchId: tenant.branchId },
        ],
      });

      const row = await this.repository.updateLandedCost(tx, id, {
        status: 'POSTED',
        postedAt: input.postingDate ? dateOnly(input.postingDate) : new Date(),
        journalEntryId: journal.id,
        idempotencyKey,
      });
      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'LANDED_COST_POSTED',
        subjectType: 'LandedCost',
        subjectId: id,
        afterJson: { status: row.status, journalEntryId: journal.id, totalCost: landed.totalCost.toString() },
        ip: actor.ip,
      });
      await this.events.append(tx, {
        organizationId: tenant.organizationId,
        type: 'landed_cost.posted',
        aggregateType: 'LandedCost',
        aggregateId: id,
        payload: { journalEntryId: journal.id, totalCost: landed.totalCost.toString() },
      });
      return row;
    });
  }

  async listTaxCodes(tenant: TenantRequestContext, query: any) {
    await this.enabled(tenant.organizationId);
    const p = page(query);
    const { rows, total } = await this.repository.listTaxCodes(tenant.organizationId, p.skip, p.take);
    return { rows, total, page: p.page, pageSize: p.pageSize };
  }

  async createTaxRule(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, input: any) {
    await this.enabled(tenant.organizationId);
    const ratePct = dec(input.ratePct);
    if (ratePct.isNegative() || ratePct.gt(100)) {
      throw new AppError(400, 'TAX_RATE_INVALID', 'Tax rate must be between 0 and 100.');
    }
    return withTransaction(async (tx) => {
      const bundle = await this.repository.createTaxRuleBundle(tx, {
        organizationId: tenant.organizationId,
        jurisdictionName: input.jurisdictionName,
        taxCodeName: input.taxCodeName,
        taxCode: input.taxCode,
        taxType: input.taxType,
        ratePct,
        effectiveFrom: dateOnly(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? dateOnly(input.effectiveTo) : null,
        priority: input.priority,
        active: input.active,
      });
      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'TAX_RULE_CREATED',
        subjectType: 'TaxRule',
        subjectId: bundle.rule.id,
        afterJson: { taxCodeId: bundle.taxCode.id, ratePct: ratePct.toString(), taxType: input.taxType },
        ip: actor.ip,
      });
      return bundle.rule;
    });
  }

  async calculateTax(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, input: any) {
    await this.enabled(tenant.organizationId);
    const transactionDate = dateOnly(input.transactionDate);

    return withTransaction(async (tx) => {
      const resultLines = [];
      let taxableTotal = new Prisma.Decimal(0);
      let taxTotal = new Prisma.Decimal(0);

      for (const line of input.lines) {
        const qty = dec(line.quantity);
        const unitPrice = dec(line.unitPrice);
        const discount = dec(line.discount ?? 0);
        const taxableAmount = unitPrice.mul(qty).sub(discount);
        if (taxableAmount.isNegative()) {
          throw new AppError(400, 'TAX_TAXABLE_AMOUNT_INVALID', 'Line taxable amount cannot be negative.');
        }

        const rule = await this.repository.activeTaxRule(
          tenant.organizationId,
          line.taxCodeId,
          transactionDate,
          input.jurisdictionId ?? null,
        );
        if (!rule) throw new AppError(404, 'TAX_RULE_NOT_FOUND', 'No active tax rule/rate exists for the selected tax code/date.');

        const rate = rule.taxCode.rates
          .filter((candidate: any) =>
            candidate.active &&
            candidate.effectiveFrom.getTime() <= transactionDate.getTime() &&
            (!candidate.effectiveTo || candidate.effectiveTo.getTime() >= transactionDate.getTime()) &&
            (!input.jurisdictionId || candidate.jurisdictionId === input.jurisdictionId)
          )
          .sort((a: any, b: any) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0];

        if (!rate) throw new AppError(404, 'TAX_RATE_NOT_FOUND', 'No active tax rate exists for the selected tax code/date.');
        const taxAmount = taxableAmount.mul(rate.ratePct).div(100);

        const transaction = await this.repository.createTaxTransaction(tx, {
          organizationId: tenant.organizationId,
          sourceType: input.sourceType,
          sourceId: input.sourceId ?? null,
          lineRef: line.lineId ?? null,
          partyType: input.partyType,
          partyId: input.partyId ?? null,
          taxCodeId: line.taxCodeId,
          taxableAmount,
          taxAmount,
          ratePct: rate.ratePct,
          transactionDate,
          calculationJson: {
            formula: 'taxableAmount * ratePct / 100',
            quantity: qty.toString(),
            unitPrice: unitPrice.toString(),
            discount: discount.toString(),
            ruleId: rule.id,
            rateId: rate.id,
          } as never,
        });
        resultLines.push({
          lineId: line.lineId ?? null,
          taxCodeId: line.taxCodeId,
          taxableAmount: taxableAmount.toFixed(2),
          ratePct: rate.ratePct.toString(),
          taxAmount: taxAmount.toFixed(2),
          taxTransactionId: transaction.id,
        });
        taxableTotal = taxableTotal.add(taxableAmount);
        taxTotal = taxTotal.add(taxAmount);
      }

      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'TAX_CALCULATED',
        subjectType: input.sourceType,
        subjectId: input.sourceId ?? null,
        afterJson: { taxableTotal: taxableTotal.toString(), taxTotal: taxTotal.toString(), lineCount: resultLines.length },
        ip: actor.ip,
      });

      return {
        taxableTotal: taxableTotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        grandTotal: taxableTotal.add(taxTotal).toFixed(2),
        lines: resultLines,
      };
    });
  }

  async taxReports(tenant: TenantRequestContext, query: any) {
    await this.enabled(tenant.organizationId);
    const rows = await this.repository.taxReport(
      tenant.organizationId,
      query.from ? dateOnly(query.from) : null,
      query.to ? dateOnly(query.to) : null,
      query.taxType,
    );
    return rows.map((row: any) => ({
      taxCodeId: row.taxCodeId,
      taxableAmount: row._sum.taxableAmount?.toString() ?? '0.00',
      taxAmount: row._sum.taxAmount?.toString() ?? '0.00',
      transactionCount: row._count.id,
    }));
  }

  async listBankAccounts(tenant: TenantRequestContext, query: any) {
    await this.enabled(tenant.organizationId);
    const p = page(query);
    const { rows, total } = await this.repository.listBankAccounts(tenant.organizationId, tenant.branchId, p.skip, p.take);
    return { rows, total, page: p.page, pageSize: p.pageSize };
  }

  async importBankStatement(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, input: any) {
    await this.enabled(tenant.organizationId);
    const bank = await this.repository.getBankAccount(tenant.organizationId, tenant.branchId, input.bankAccountId);
    if (!bank) throw new AppError(404, 'BANK_ACCOUNT_NOT_FOUND', 'Bank account not found.');
    return withTransaction(async (tx) => {
      const statement = await this.repository.createBankStatement(
        tx,
        {
          organizationId: tenant.organizationId,
          bankAccountId: input.bankAccountId,
          statementNo: input.statementNo,
          periodStart: dateOnly(input.periodStart),
          periodEnd: dateOnly(input.periodEnd),
          openingBalance: dec(input.openingBalance),
          closingBalance: dec(input.closingBalance),
          status: 'IMPORTED',
          importedById: actor.userId,
        },
        input.lines.map((line: any) => ({
          organizationId: tenant.organizationId,
          occurredAt: dateOnly(line.occurredAt),
          description: line.description,
          reference: line.reference ?? null,
          debit: dec(line.debit ?? 0),
          credit: dec(line.credit ?? 0),
          status: 'UNMATCHED',
        })),
      );
      const reconciliation = await this.repository.createBankReconciliation(tx, {
        organizationId: tenant.organizationId,
        bankAccountId: input.bankAccountId,
        bankStatementId: statement.id,
        status: 'OPEN',
      });
      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'BANK_STATEMENT_IMPORTED',
        subjectType: 'BankStatement',
        subjectId: statement.id,
        afterJson: { statementNo: statement.statementNo, lineCount: statement.lines.length, reconciliationId: reconciliation.id },
        ip: actor.ip,
      });
      return { statement, reconciliation };
    });
  }

  async closeBankReconciliation(
    tenant: TenantRequestContext,
    actor: { userId: string; ip: string | null },
    id: string,
    input: any,
  ) {
    await this.enabled(tenant.organizationId);
    return withTransaction(async (tx) => {
      const row = await this.repository.lockReconciliation(tx, tenant.organizationId, id);
      if (!row) throw new AppError(404, 'BANK_RECONCILIATION_NOT_FOUND', 'Bank reconciliation not found.');
      assertReconciliationNotClosed(row.status);
      const updated = await this.repository.closeReconciliation(tx, id, {
        status: 'CLOSED',
        closedAt: new Date(),
        closedById: actor.userId,
        closingNote: input.closingNote ?? null,
        journalLinksJson: {
          journalEntryIds: input.journalEntryIds,
          paymentIds: input.paymentIds,
          voucherIds: input.voucherIds,
        } as never,
      });
      await this.audit.append(tx, {
        organizationId: tenant.organizationId,
        actorUserId: actor.userId,
        action: 'BANK_RECONCILIATION_CLOSED',
        subjectType: 'BankReconciliation',
        subjectId: id,
        afterJson: { status: 'CLOSED', links: updated.journalLinksJson },
        ip: actor.ip,
      });
      return updated;
    });
  }

  async createPaymentVoucher(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, input: any) {
    await this.enabled(tenant.organizationId);
    const amount = dec(input.amount);
    assertPositiveMoney(amount, 'PAYMENT_VOUCHER_AMOUNT_INVALID');
    assertExactlyOneFundingAccount(input);
    const bank = input.bankAccountId ? await this.repository.getBankAccount(tenant.organizationId, tenant.branchId, input.bankAccountId) : null;
    const cash = input.cashAccountId ? await this.repository.getCashAccount(tenant.organizationId, tenant.branchId, input.cashAccountId) : null;
    if (input.bankAccountId && !bank) throw new AppError(404, 'BANK_ACCOUNT_NOT_FOUND', 'Bank account not found.');
    if (input.cashAccountId && !cash) throw new AppError(404, 'CASH_ACCOUNT_NOT_FOUND', 'Cash account not found.');

    return this.numbers.withBusinessNumber({
      organizationId: tenant.organizationId,
      branchId: tenant.branchId,
      entityType: 'PAYMENT_VOUCHER',
      fiscalYear: new Date(input.voucherDate).getUTCFullYear(),
      targetType: 'PaymentVoucher',
      createTarget: async (tx, voucherNo) => {
        const accounts = await this.finance.ensureCommercialAccounts(tx, tenant.organizationId);
        const voucher = await this.repository.createPaymentVoucher(tx, {
          organizationId: tenant.organizationId,
          branchId: tenant.branchId,
          voucherNo,
          bankAccountId: input.bankAccountId ?? null,
          cashAccountId: input.cashAccountId ?? null,
          payeeType: input.payeeType,
          payeeId: input.payeeId ?? null,
          amount,
          method: input.method,
          voucherDate: new Date(input.voucherDate),
          memo: input.memo ?? null,
          status: 'POSTED',
          createdById: actor.userId,
        });

        const creditAccount = bank?.accountId ?? cash?.accountId ?? accounts['1000'];
        const journal = await this.finance.postCommercialJournal(tx, {
          organizationId: tenant.organizationId,
          actorUserId: actor.userId,
          referenceType: 'PaymentVoucher',
          referenceId: voucher.id,
          lines: [
            { accountId: accounts['2000'], debit: amount, branchId: tenant.branchId },
            { accountId: creditAccount, credit: amount, branchId: tenant.branchId },
          ],
        });
        await this.repository.linkPaymentVoucherJournal(tx, voucher.id, journal.id);

        if (input.method === 'CHEQUE' && input.bankAccountId) {
          await this.repository.createCheque(tx, {
            organizationId: tenant.organizationId,
            branchId: tenant.branchId,
            bankAccountId: input.bankAccountId,
            paymentVoucherId: voucher.id,
            chequeNo: input.chequeNo,
            payeeName: input.payeeType,
            amount,
            status: 'ISSUED',
            issuedAt: new Date(input.voucherDate),
          });
        }

        await this.audit.append(tx, {
          organizationId: tenant.organizationId,
          actorUserId: actor.userId,
          action: 'PAYMENT_VOUCHER_POSTED',
          subjectType: 'PaymentVoucher',
          subjectId: voucher.id,
          afterJson: { voucherNo, amount: amount.toString(), journalEntryId: journal.id, method: input.method },
          ip: actor.ip,
        });
        return { ...voucher, journalEntryId: journal.id };
      },
    });
  }

  async createReceiptVoucher(tenant: TenantRequestContext, actor: { userId: string; ip: string | null }, input: any) {
    await this.enabled(tenant.organizationId);
    const amount = dec(input.amount);
    assertPositiveMoney(amount, 'RECEIPT_VOUCHER_AMOUNT_INVALID');
    assertExactlyOneFundingAccount(input);
    const bank = input.bankAccountId ? await this.repository.getBankAccount(tenant.organizationId, tenant.branchId, input.bankAccountId) : null;
    const cash = input.cashAccountId ? await this.repository.getCashAccount(tenant.organizationId, tenant.branchId, input.cashAccountId) : null;
    if (input.bankAccountId && !bank) throw new AppError(404, 'BANK_ACCOUNT_NOT_FOUND', 'Bank account not found.');
    if (input.cashAccountId && !cash) throw new AppError(404, 'CASH_ACCOUNT_NOT_FOUND', 'Cash account not found.');

    return this.numbers.withBusinessNumber({
      organizationId: tenant.organizationId,
      branchId: tenant.branchId,
      entityType: 'RECEIPT_VOUCHER',
      fiscalYear: new Date(input.voucherDate).getUTCFullYear(),
      targetType: 'ReceiptVoucher',
      createTarget: async (tx, voucherNo) => {
        const accounts = await this.finance.ensureCommercialAccounts(tx, tenant.organizationId);
        const voucher = await this.repository.createReceiptVoucher(tx, {
          organizationId: tenant.organizationId,
          branchId: tenant.branchId,
          voucherNo,
          bankAccountId: input.bankAccountId ?? null,
          cashAccountId: input.cashAccountId ?? null,
          payerType: input.payerType,
          payerId: input.payerId ?? null,
          amount,
          method: input.method,
          voucherDate: new Date(input.voucherDate),
          memo: input.memo ?? input.referenceNo ?? null,
          status: 'POSTED',
          createdById: actor.userId,
        });

        const debitAccount = bank?.accountId ?? cash?.accountId ?? accounts['1000'];
        const creditAccount = input.payerType === 'CUSTOMER' ? accounts['1100'] : accounts['4000'];
        const journal = await this.finance.postCommercialJournal(tx, {
          organizationId: tenant.organizationId,
          actorUserId: actor.userId,
          referenceType: 'ReceiptVoucher',
          referenceId: voucher.id,
          lines: [
            { accountId: debitAccount, debit: amount, branchId: tenant.branchId },
            { accountId: creditAccount, credit: amount, branchId: tenant.branchId },
          ],
        });
        await this.repository.linkReceiptVoucherJournal(tx, voucher.id, journal.id);

        await this.audit.append(tx, {
          organizationId: tenant.organizationId,
          actorUserId: actor.userId,
          action: 'RECEIPT_VOUCHER_POSTED',
          subjectType: 'ReceiptVoucher',
          subjectId: voucher.id,
          afterJson: { voucherNo, amount: amount.toString(), journalEntryId: journal.id, method: input.method, payerType: input.payerType },
          ip: actor.ip,
        });
        await this.events.append(tx, {
          organizationId: tenant.organizationId,
          type: 'receipt_voucher.posted',
          aggregateType: 'ReceiptVoucher',
          aggregateId: voucher.id,
          payload: { voucherNo, amount: amount.toString(), journalEntryId: journal.id, payerType: input.payerType },
        });
        return { ...voucher, journalEntryId: journal.id };
      },
    });
  }

}
