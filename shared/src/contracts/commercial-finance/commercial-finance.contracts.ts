import { z } from 'zod';
import {
  DecimalStringSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  PageQuerySchema,
  UuidSchema,
} from '../common';

export const CommercialFinanceContractMaturity =
  'PASS_15_SOURCE_LEVEL_FINANCE_TAX_BANK_RECONCILIATION_COMPLETION' as const;

export const LandedCostAllocationMethodSchema = z.enum([
  'VALUE',
  'QUANTITY',
  'WEIGHT',
  'MANUAL',
]);

export const LandedCostStatusSchema = z.enum([
  'DRAFT',
  'ALLOCATED',
  'POSTED',
  'CANCELLED',
]);

export const LandedCostLineTypeSchema = z.enum([
  'FREIGHT',
  'CUSTOMS',
  'INSURANCE',
  'HANDLING',
  'TRANSPORT',
  'OTHER',
]);

export const CreateLandedCostSchema = z.object({
  purchaseOrderId: UuidSchema,
  goodsReceiptId: UuidSchema,
  supplierInvoiceId: UuidSchema.optional(),
  allocationMethod: LandedCostAllocationMethodSchema.default('VALUE'),
  lines: z.array(z.object({
    costType: LandedCostLineTypeSchema,
    description: z.string().min(1).max(500),
    amount: DecimalStringSchema,
    accountId: UuidSchema.optional(),
  })).min(1),
});

export const LandedCostAllocationInputSchema = z.object({
  goodsReceiptItemId: UuidSchema,
  productId: UuidSchema,
  warehouseId: UuidSchema,
  quantity: DecimalStringSchema,
  allocatedAmount: DecimalStringSchema,
});

export const AllocateLandedCostSchema = z.object({
  allocations: z.array(LandedCostAllocationInputSchema).min(1),
}).superRefine((value, ctx) => {
  for (const allocation of value.allocations) {
    if (Number(allocation.quantity) <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Allocation quantity must be positive.' });
    }
    if (Number(allocation.allocatedAmount) < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Allocated amount cannot be negative.' });
    }
  }
});

export const PostLandedCostSchema = z.object({
  postingDate: IsoDateSchema.optional(),
});

export const TaxTypeSchema = z.enum([
  'SALES',
  'PURCHASE',
  'WITHHOLDING',
  'REVERSE_CHARGE',
]);

export const TaxCodeStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export const TaxTransactionSourceSchema = z.enum([
  'QUOTATION',
  'CUSTOMER_INVOICE',
  'SUPPLIER_INVOICE',
  'PURCHASE_ORDER',
  'EXPENSE',
  'PREVIEW',
]);

export const TaxCalculationLineSchema = z.object({
  lineId: z.string().min(1).max(120).optional(),
  productId: UuidSchema.optional(),
  description: z.string().max(500).optional(),
  quantity: DecimalStringSchema.default('1'),
  unitPrice: DecimalStringSchema,
  discount: DecimalStringSchema.default('0'),
  taxCodeId: UuidSchema,
});

export const TaxCalculateSchema = z.object({
  sourceType: TaxTransactionSourceSchema.default('PREVIEW'),
  sourceId: UuidSchema.optional(),
  partyType: z.enum(['CUSTOMER', 'VENDOR', 'EMPLOYEE', 'OTHER']).default('OTHER'),
  partyId: UuidSchema.optional(),
  jurisdictionId: UuidSchema.optional(),
  transactionDate: IsoDateSchema,
  lines: z.array(TaxCalculationLineSchema).min(1),
});

export const CreateTaxRuleSchema = z.object({
  jurisdictionName: z.string().min(1).max(160).default('Default'),
  taxCodeName: z.string().min(1).max(160),
  taxCode: z.string().min(1).max(80),
  taxType: TaxTypeSchema,
  ratePct: DecimalStringSchema,
  effectiveFrom: IsoDateSchema,
  effectiveTo: IsoDateSchema.optional(),
  priority: z.number().int().min(0).max(9999).default(100),
  active: z.boolean().default(true),
});

export const TaxReportQuerySchema = PageQuerySchema.extend({
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
  taxType: TaxTypeSchema.optional(),
});

export const BankStatementLineInputSchema = z.object({
  occurredAt: IsoDateSchema,
  description: z.string().min(1).max(1000),
  reference: z.string().max(160).optional(),
  debit: DecimalStringSchema.default('0'),
  credit: DecimalStringSchema.default('0'),
});

export const ImportBankStatementSchema = z.object({
  bankAccountId: UuidSchema,
  statementNo: z.string().min(1).max(160),
  periodStart: IsoDateSchema,
  periodEnd: IsoDateSchema,
  openingBalance: DecimalStringSchema,
  closingBalance: DecimalStringSchema,
  lines: z.array(BankStatementLineInputSchema).min(1),
}).refine(
  (value) => new Date(value.periodEnd).getTime() >= new Date(value.periodStart).getTime(),
  'Statement period end cannot precede start.',
);

export const CloseBankReconciliationSchema = z.object({
  journalEntryIds: z.array(UuidSchema).default([]),
  paymentIds: z.array(UuidSchema).default([]),
  voucherIds: z.array(UuidSchema).default([]),
  closingNote: z.string().max(2000).optional(),
});

const VoucherFundingAccountRule = (value: { bankAccountId?: string; cashAccountId?: string }, ctx: z.RefinementCtx) => {
  if (!value.bankAccountId && !value.cashAccountId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Either bankAccountId or cashAccountId is required.' });
  }
  if (value.bankAccountId && value.cashAccountId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Use bank or cash account, not both.' });
  }
};

export const PaymentVoucherSchema = z.object({
  bankAccountId: UuidSchema.optional(),
  cashAccountId: UuidSchema.optional(),
  payeeType: z.enum(['VENDOR', 'CUSTOMER', 'EMPLOYEE', 'OTHER']),
  payeeId: UuidSchema.optional(),
  amount: DecimalStringSchema,
  method: z.enum(['BANK_TRANSFER', 'CASH', 'CHEQUE', 'ONLINE']),
  voucherDate: IsoDateTimeSchema,
  memo: z.string().max(2000).optional(),
  chequeNo: z.string().max(160).optional(),
}).superRefine((value, ctx) => {
  VoucherFundingAccountRule(value, ctx);
  if (value.method === 'CHEQUE' && !value.chequeNo) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'chequeNo is required for cheque vouchers.' });
  }
});

export const ReceiptVoucherSchema = z.object({
  bankAccountId: UuidSchema.optional(),
  cashAccountId: UuidSchema.optional(),
  payerType: z.enum(['CUSTOMER', 'VENDOR', 'EMPLOYEE', 'OTHER']),
  payerId: UuidSchema.optional(),
  amount: DecimalStringSchema,
  method: z.enum(['BANK_TRANSFER', 'CASH', 'CHEQUE', 'ONLINE']),
  voucherDate: IsoDateTimeSchema,
  memo: z.string().max(2000).optional(),
  referenceNo: z.string().max(160).optional(),
}).superRefine(VoucherFundingAccountRule);

export const CommercialFinanceListQuerySchema = PageQuerySchema.extend({
  status: z.string().optional(),
});
