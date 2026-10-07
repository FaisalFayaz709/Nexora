import { createHash } from 'node:crypto';
import { Prisma } from '@nexora/database';
import { AppError } from '../../core/http/errors.js';

export const CanonicalInvoiceStatuses = [
  'DRAFT',
  'APPROVAL_PENDING',
  'APPROVED',
  'POSTED',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'REVERSED',
] as const;

export const SupplierInvoiceMatchStatuses = [
  'NOT_MATCHED',
  'MATCHED',
  'VARIANCE',
  'BLOCKED',
] as const;

export const FinanceCriticalCommands = [
  'customer-invoice-post',
  'supplier-invoice-match',
  'supplier-invoice-approve',
  'payment-post',
  'expense-submit',
  'expense-finance-verify',
  'journal-post',
] as const;

export type CanonicalInvoiceStatus = typeof CanonicalInvoiceStatuses[number];
export type SupplierInvoiceMatchStatus = typeof SupplierInvoiceMatchStatuses[number];

export interface ThreeWayMatchLine {
  readonly poItemId: string | null;
  readonly orderedQty: Prisma.Decimal | string | number;
  readonly receivedAcceptedQty: Prisma.Decimal | string | number;
  readonly invoicedQty: Prisma.Decimal | string | number;
  readonly poUnitPrice: Prisma.Decimal | string | number;
  readonly invoiceUnitPrice: Prisma.Decimal | string | number;
  readonly damagedQty?: Prisma.Decimal | string | number;
}

export interface ThreeWayMatchDecision {
  readonly matchStatus: SupplierInvoiceMatchStatus;
  readonly reasons: readonly string[];
}

const dec = (value: Prisma.Decimal | string | number) => new Prisma.Decimal(value);


export interface SupplierInvoiceSourceLine {
  readonly poItemId: string;
  readonly productId: string;
  readonly orderedQty: Prisma.Decimal | string | number;
  readonly receivedAcceptedQty: Prisma.Decimal | string | number;
  readonly damagedQty?: Prisma.Decimal | string | number;
  readonly poUnitPrice: Prisma.Decimal | string | number;
  readonly poTax?: Prisma.Decimal | string | number;
}

export interface SupplierInvoiceMatchInputLine {
  readonly poItemId?: string | null;
  readonly qty: Prisma.Decimal | string | number;
  readonly unitPrice: Prisma.Decimal | string | number;
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Prisma.Decimal) return value.toString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, nested]) => nested !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

export function financeRequestHash(payload: unknown) {
  return createHash('sha256').update(JSON.stringify(canonicalize(payload))).digest('hex');
}

export function assertIdempotentReplay(existing: { requestHash: string; responseJson?: unknown | null }, currentHash: string) {
  if (existing.requestHash !== currentHash) {
    throw new AppError(409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency key was used with a different finance request.');
  }
  if (!existing.responseJson) {
    throw new AppError(409, 'IDEMPOTENCY_REQUEST_IN_PROGRESS', 'The same finance request is already processing.');
  }
}

export function calculateSupplierInvoiceThreeWayMatch(
  invoiceItems: readonly SupplierInvoiceMatchInputLine[],
  sourceLines: readonly SupplierInvoiceSourceLine[],
): ThreeWayMatchDecision {
  const sourceByPoItem = new Map(sourceLines.map((line) => [line.poItemId, line]));
  return calculateThreeWayMatchStatus(invoiceItems.map((invoiceItem) => {
    const sourceLine = invoiceItem.poItemId ? sourceByPoItem.get(invoiceItem.poItemId) : null;
    return {
      poItemId: invoiceItem.poItemId ?? null,
      orderedQty: sourceLine?.orderedQty ?? '0',
      receivedAcceptedQty: sourceLine?.receivedAcceptedQty ?? '0',
      damagedQty: sourceLine?.damagedQty ?? '0',
      invoicedQty: invoiceItem.qty,
      poUnitPrice: sourceLine?.poUnitPrice ?? '0',
      invoiceUnitPrice: invoiceItem.unitPrice,
    } satisfies ThreeWayMatchLine;
  }));
}

export function assertCanonicalInvoiceStatus(status: string) {
  if (!CanonicalInvoiceStatuses.includes(status as CanonicalInvoiceStatus)) {
    throw new AppError(409, 'FINANCE_NON_CANONICAL_INVOICE_STATUS', 'Invoice status must use the canonical blueprint status model.', { status });
  }
}

export function assertSupplierInvoiceMatchStatusSeparateFromStatus(status: string, matchStatus: string) {
  assertCanonicalInvoiceStatus(status);
  if (!SupplierInvoiceMatchStatuses.includes(matchStatus as SupplierInvoiceMatchStatus)) {
    throw new AppError(409, 'SUPPLIER_INVOICE_MATCH_STATUS_INVALID', 'Supplier invoice matchStatus must be stored separately from canonical invoice status.', { matchStatus });
  }
  if (status === 'MATCHED') {
    throw new AppError(409, 'SUPPLIER_INVOICE_MATCHED_IS_NOT_STATUS', 'MATCHED belongs to matchStatus, not invoice status.');
  }
}

export function assertCustomerInvoiceCanSubmit(status: string) {
  if (status !== 'DRAFT') throw new AppError(409, 'CUSTOMER_INVOICE_SUBMIT_INVALID_STATE', 'Only DRAFT customer invoices can be submitted.');
}

export function assertCustomerInvoiceCanApprove(status: string) {
  if (!['APPROVAL_PENDING', 'DRAFT'].includes(status)) throw new AppError(409, 'CUSTOMER_INVOICE_APPROVE_INVALID_STATE', 'Customer invoice cannot be approved from current state.');
}

export function assertCustomerInvoiceCanPost(status: string) {
  if (status !== 'APPROVED') throw new AppError(409, 'CUSTOMER_INVOICE_POST_INVALID_STATE', 'Only APPROVED customer invoices can be posted.');
}

export function assertCustomerInvoiceCanSend(status: string) {
  if (!['POSTED', 'SENT'].includes(status)) throw new AppError(409, 'CUSTOMER_INVOICE_SEND_INVALID_STATE', 'Only POSTED customer invoices can be sent.');
}

export function assertCustomerInvoiceCanCancel(status: string) {
  if (['PAID', 'REVERSED', 'CANCELLED'].includes(status)) throw new AppError(409, 'CUSTOMER_INVOICE_CANCEL_INVALID_STATE', 'Customer invoice cannot be cancelled from current state.');
}

export function assertSupplierInvoiceCanMatch(status: string) {
  assertCanonicalInvoiceStatus(status);
  if (status !== 'DRAFT') throw new AppError(409, 'SUPPLIER_INVOICE_MATCH_INVALID_STATE', 'Only DRAFT supplier invoices can be three-way matched.');
}

export function assertSupplierInvoiceCanApprove(status: string, matchStatus: string) {
  assertSupplierInvoiceMatchStatusSeparateFromStatus(status, matchStatus);
  if (matchStatus !== 'MATCHED') throw new AppError(409, 'SUPPLIER_INVOICE_APPROVE_INVALID_MATCH', 'Only matched supplier invoices can be approved.');
  if (!['DRAFT', 'APPROVAL_PENDING'].includes(status)) throw new AppError(409, 'SUPPLIER_INVOICE_APPROVE_INVALID_STATE', 'Supplier invoice cannot be approved from current state.');
}

export function calculateThreeWayMatchStatus(lines: readonly ThreeWayMatchLine[]): ThreeWayMatchDecision {
  if (lines.length === 0) return { matchStatus: 'BLOCKED', reasons: ['NO_LINES'] };
  const reasons: string[] = [];
  for (const line of lines) {
    if (!line.poItemId) reasons.push('MISSING_PO_LINE');
    if (dec(line.invoicedQty).lte(0)) reasons.push('INVOICE_QTY_NOT_POSITIVE');
    if (dec(line.invoicedQty).gt(dec(line.receivedAcceptedQty))) reasons.push('INVOICED_QTY_EXCEEDS_ACCEPTED_GRN_QTY');
    if (!dec(line.invoiceUnitPrice).eq(dec(line.poUnitPrice))) reasons.push('UNIT_PRICE_VARIANCE');
    if (dec(line.damagedQty ?? 0).gt(0) && dec(line.invoicedQty).gt(dec(line.receivedAcceptedQty))) reasons.push('DAMAGED_QTY_CANNOT_BE_INVOICED');
  }
  if (reasons.includes('MISSING_PO_LINE') || reasons.includes('INVOICE_QTY_NOT_POSITIVE')) return { matchStatus: 'BLOCKED', reasons };
  if (reasons.length > 0) return { matchStatus: 'VARIANCE', reasons };
  return { matchStatus: 'MATCHED', reasons: [] };
}

export function assertPaymentIdempotencyKey(key: string | undefined | null) {
  if (!key) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Payment requires Idempotency-Key.');
}

export function assertPaymentAllocationTotal(amount: Prisma.Decimal | string | number, allocations: readonly { amount: Prisma.Decimal | string | number }[]) {
  const expected = dec(amount);
  const actual = allocations.reduce((sum, allocation) => sum.add(dec(allocation.amount)), new Prisma.Decimal(0));
  if (!actual.eq(expected)) throw new AppError(400, 'PAYMENT_ALLOCATION_MISMATCH', 'Payment allocations must equal payment amount.');
}

export function assertInvoiceCanReceivePayment(kind: 'CUSTOMER_INVOICE' | 'SUPPLIER_INVOICE' | 'EXPENSE', status: string, balance: Prisma.Decimal | string | number, allocationAmount: Prisma.Decimal | string | number) {
  const allowed = kind === 'CUSTOMER_INVOICE'
    ? ['POSTED', 'SENT', 'PARTIALLY_PAID', 'OVERDUE']
    : kind === 'SUPPLIER_INVOICE'
      ? ['POSTED', 'APPROVED', 'PARTIALLY_PAID']
      : ['FINANCE_VERIFIED'];
  if (!allowed.includes(status)) throw new AppError(409, `PAYMENT_${kind}_INVALID`, 'Invoice or expense is not payable from current state.', { kind, status });
  if (dec(balance).lt(dec(allocationAmount))) throw new AppError(409, 'PAYMENT_OVER_ALLOCATED', 'Payment allocation exceeds invoice balance.');
}

export function assertJournalBalanced(lines: readonly { debit?: Prisma.Decimal | string | number; credit?: Prisma.Decimal | string | number }[]) {
  const debit = lines.reduce((sum, line) => sum.add(dec(line.debit ?? 0)), new Prisma.Decimal(0));
  const credit = lines.reduce((sum, line) => sum.add(dec(line.credit ?? 0)), new Prisma.Decimal(0));
  if (!debit.eq(credit) || !debit.gt(0)) throw new AppError(400, 'JOURNAL_ENTRY_UNBALANCED', 'Journal entry debits must equal credits.');
}

export function assertPostedLedgerIsReversalOnly(currentStatus: string, operation: 'edit' | 'delete' | 'reverse') {
  if (currentStatus === 'POSTED' && operation !== 'reverse') {
    throw new AppError(409, 'POSTED_LEDGER_REVERSAL_REQUIRED', 'Posted finance ledger effects must be corrected through reversal, not destructive edit/delete.');
  }
}

export function assertNoAsyncFinanceCriticalMutation(action: string) {
  if (/(payment|journal|invoice|tax|bank|reconciliation|ledger|approval|posting|match)/i.test(action) && !/document|email|notification|report|webhook|export/i.test(action)) {
    throw new AppError(409, 'FINANCE_ASYNC_CRITICAL_MUTATION_FORBIDDEN', 'Finance critical mutation must stay in a service/database transaction, not a BullMQ side effect.', { action });
  }
}
