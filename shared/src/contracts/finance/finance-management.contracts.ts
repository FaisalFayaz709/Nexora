import { z } from 'zod';
import {
  DecimalStringSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  PageQuerySchema,
  UuidSchema,
} from '../common';
import { InvoiceStatusSchema } from '../../schemas/status-models';

export const FinanceManagementContractMaturity =
  'SOURCE_EXAMPLES_PLUS_IMPLEMENTATION_DERIVED_LOCKED_ROUTE_CONTRACTS' as const;

export const CustomerInvoiceStatusSchema = InvoiceStatusSchema;
export const SupplierInvoiceStatusSchema = InvoiceStatusSchema;
export const ExpenseStatusSchema = z.enum([
  'DRAFT','SUBMITTED','APPROVAL_PENDING','APPROVED','REJECTED',
  'FINANCE_VERIFIED','PAID','CANCELLED',
]);
export const FinancialPeriodStatusSchema = z.enum(['OPEN','CLOSED','LOCKED']);
export const AccountTypeSchema = z.enum(['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE']);
export const JournalStatusSchema = z.enum(['DRAFT','POSTED','REVERSED']);
export const PaymentDirectionSchema = z.enum(['INBOUND','OUTBOUND']);
export const PaymentPartyTypeSchema = z.enum(['CUSTOMER','VENDOR','EMPLOYEE','OTHER']);
export const PaymentMethodSchema = z.enum(['CASH','BANK_TRANSFER','CHEQUE','CARD','ONLINE']);
export const PaymentStatusSchema = z.enum(['DRAFT','POSTED','VOID','REVERSED']);
export const SupplierInvoiceMatchStatusSchema = z.enum(['NOT_MATCHED','MATCHED','VARIANCE','BLOCKED']);
export const NoteStatusSchema = z.enum(['DRAFT','POSTED','CANCELLED','REVERSED']);

const InvoiceItemInputSchema = z.object({
  productId: UuidSchema.nullable().optional(),
  description: z.string().min(1).max(500),
  qty: DecimalStringSchema,
  unitPrice: DecimalStringSchema,
  tax: DecimalStringSchema.default('0'),
});

export const CustomerInvoiceListQuerySchema = PageQuerySchema.extend({
  status: CustomerInvoiceStatusSchema.optional(),
  customerId: UuidSchema.optional(),
  projectId: UuidSchema.optional(),
  dueBefore: IsoDateSchema.optional(),
});

export const CreateCustomerInvoiceSchema = z.object({
  customerId: UuidSchema,
  projectId: UuidSchema.nullable().optional(),
  contractId: UuidSchema.nullable().optional(),
  workOrderId: UuidSchema.nullable().optional(),
  maintenanceExecutionId: UuidSchema.nullable().optional(),
  issueDate: IsoDateSchema,
  dueDate: IsoDateSchema,
  items: z.array(InvoiceItemInputSchema).min(1),
}).refine((value) => value.dueDate >= value.issueDate, 'Invoice due date cannot precede issue date.');

export const UpdateCustomerInvoiceSchema = z.object({
  issueDate: IsoDateSchema.optional(),
  dueDate: IsoDateSchema.optional(),
  items: z.array(InvoiceItemInputSchema).min(1).optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one editable field is required.');

const SupplierInvoiceItemInputSchema = z.object({
  poItemId: UuidSchema.nullable().optional(),
  description: z.string().min(1).max(500),
  qty: DecimalStringSchema,
  unitPrice: DecimalStringSchema,
});

export const SupplierInvoiceListQuerySchema = PageQuerySchema.extend({
  status: SupplierInvoiceStatusSchema.optional(),
  matchStatus: SupplierInvoiceMatchStatusSchema.optional(),
  vendorId: UuidSchema.optional(),
  purchaseOrderId: UuidSchema.optional(),
  goodsReceiptId: UuidSchema.optional(),
});

export const CreateSupplierInvoiceSchema = z.object({
  vendorId: UuidSchema,
  purchaseOrderId: UuidSchema,
  goodsReceiptId: UuidSchema,
  externalInvoiceNo: z.string().min(1).max(160).optional(),
  items: z.array(SupplierInvoiceItemInputSchema).min(1),
});

export const UpdateSupplierInvoiceSchema = z.object({
  externalInvoiceNo: z.string().min(1).max(160).optional(),
  items: z.array(SupplierInvoiceItemInputSchema).min(1).optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one editable field is required.');

const ExpenseItemInputSchema = z.object({
  description: z.string().min(1).max(500),
  amount: DecimalStringSchema,
  tax: DecimalStringSchema.default('0'),
  documentId: UuidSchema.nullable().optional(),
});

export const ExpenseListQuerySchema = PageQuerySchema.extend({
  status: ExpenseStatusSchema.optional(),
  employeeId: UuidSchema.optional(),
  projectId: UuidSchema.optional(),
});

export const CreateExpenseSchema = z.object({
  employeeId: UuidSchema,
  projectId: UuidSchema.nullable().optional(),
  category: z.string().min(1).max(120),
  incurredAt: IsoDateTimeSchema,
  items: z.array(ExpenseItemInputSchema).min(1),
});

export const UpdateExpenseSchema = z.object({
  category: z.string().min(1).max(120).optional(),
  incurredAt: IsoDateTimeSchema.optional(),
  status: z.enum(['SUBMITTED','CANCELLED','FINANCE_VERIFIED']).optional(),
  items: z.array(ExpenseItemInputSchema).min(1).optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one editable field is required.');

export const PaymentAllocationInputSchema = z.object({
  invoiceType: z.enum(['CUSTOMER_INVOICE','SUPPLIER_INVOICE','EXPENSE']),
  invoiceId: UuidSchema,
  amount: DecimalStringSchema,
});

export const PaymentListQuerySchema = PageQuerySchema.extend({
  direction: PaymentDirectionSchema.optional(),
  partyType: PaymentPartyTypeSchema.optional(),
  partyId: UuidSchema.optional(),
  status: PaymentStatusSchema.optional(),
});

export const CreatePaymentSchema = z.object({
  direction: PaymentDirectionSchema,
  partyType: PaymentPartyTypeSchema,
  partyId: UuidSchema,
  amount: DecimalStringSchema,
  method: PaymentMethodSchema,
  paidAt: IsoDateTimeSchema,
  allocations: z.array(PaymentAllocationInputSchema).min(1),
});

export const AccountListQuerySchema = PageQuerySchema.extend({
  type: AccountTypeSchema.optional(),
  active: z.coerce.boolean().optional(),
});

export const CreateJournalLineSchema = z.object({
  accountId: UuidSchema,
  debit: DecimalStringSchema.default('0'),
  credit: DecimalStringSchema.default('0'),
  projectId: UuidSchema.nullable().optional(),
  branchId: UuidSchema.nullable().optional(),
});

export const CreateJournalEntrySchema = z.object({
  periodId: UuidSchema,
  postedAt: IsoDateTimeSchema.nullable().optional(),
  referenceType: z.string().min(1).max(120).optional(),
  referenceId: UuidSchema.nullable().optional(),
  lines: z.array(CreateJournalLineSchema).min(2),
});

export const EmptyCommandSchema = z.object({}).passthrough();

export const FinanceAgingQuerySchema = PageQuerySchema.extend({
  asOf: IsoDateSchema.optional(),
  partyId: UuidSchema.optional(),
});
