import { Prisma } from '@nexora/database';
import { AppError } from '../../core/http/errors.js';

export type PurchaseRequestWorkflowStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED_TO_RFQ'
  | 'CANCELLED';

export type RfqWorkflowStatus = 'DRAFT' | 'PUBLISHED' | 'OPEN' | 'CLOSED' | 'AWARDED' | 'CANCELLED';
export type SupplierQuotationWorkflowStatus = 'DRAFT' | 'SUBMITTED' | 'VALID' | 'SELECTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
export type PurchaseOrderWorkflowStatus =
  | 'DRAFT'
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'SENT'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CLOSED'
  | 'CANCELLED';
export type GoodsReceiptWorkflowStatus = 'DRAFT' | 'RECEIVED' | 'INSPECTION_PENDING' | 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED';
export type GoodsReceiptInspectionResult = 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED';

export interface SupplierQuotationComparisonLine {
  readonly id: string;
  readonly vendorId: string;
  readonly quoteRef: string;
  readonly total: Prisma.Decimal;
  readonly deliveryDays: readonly number[];
  readonly warrantyMonths: readonly number[];
  readonly status: SupplierQuotationWorkflowStatus;
}

export interface SupplierQuotationComparisonResult {
  readonly id: string;
  readonly vendorId: string;
  readonly quoteRef: string;
  readonly total: Prisma.Decimal;
  readonly rank: number;
  readonly averageDeliveryDays: number;
  readonly maxWarrantyMonths: number;
  readonly isLowestCost: boolean;
  readonly isFastestDelivery: boolean;
  readonly isStrongestWarranty: boolean;
}

function assertAllowed<T extends string>(
  current: T,
  allowed: readonly T[],
  code: string,
  message: string,
  extra?: Record<string, unknown>,
): T {
  if (!allowed.includes(current)) {
    throw new AppError(409, code, message, { currentStatus: current, allowedStatuses: allowed, ...extra });
  }
  return current;
}

function decimal(value: string | number | Prisma.Decimal): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) return value;
  return new Prisma.Decimal(value);
}

export function assertPurchaseRequestCanSubmit(status: PurchaseRequestWorkflowStatus) {
  return assertAllowed(status, ['DRAFT'], 'PURCHASE_REQUEST_INVALID_STATE', 'Only DRAFT purchase requests can be submitted.');
}

export function assertPurchaseRequestCanBeDecided(status: PurchaseRequestWorkflowStatus) {
  return assertAllowed(status, ['UNDER_REVIEW'], 'PURCHASE_REQUEST_INVALID_STATE', 'Purchase request is not awaiting approval.');
}

export function assertPurchaseRequestCanCreateRfq(status: PurchaseRequestWorkflowStatus) {
  return assertAllowed(status, ['APPROVED'], 'RFQ_PURCHASE_REQUEST_NOT_APPROVED', 'RFQ requires an APPROVED purchase request.');
}

export function assertRfqCanInviteVendors(status: RfqWorkflowStatus) {
  return assertAllowed(status, ['DRAFT'], 'RFQ_INVALID_STATE', 'Vendors can be invited only while RFQ is DRAFT.');
}

export function assertRfqCanPublish(status: RfqWorkflowStatus, invitedVendorCount: number) {
  assertAllowed(status, ['DRAFT'], 'RFQ_INVALID_STATE', 'Only DRAFT RFQs can be published.');
  if (invitedVendorCount <= 0) {
    throw new AppError(409, 'RFQ_NOT_PUBLISHABLE', 'RFQ must have at least one invited vendor before publishing.');
  }
}

export function assertRfqCanAcceptQuotation(status: RfqWorkflowStatus) {
  return assertAllowed(status, ['PUBLISHED', 'OPEN', 'CLOSED'], 'RFQ_NOT_ACCEPTING_QUOTES', 'RFQ is not available for quotations.');
}

export function assertRfqCanClose(status: RfqWorkflowStatus) {
  return assertAllowed(status, ['PUBLISHED', 'OPEN'], 'RFQ_INVALID_STATE', 'Only published/open RFQs can be closed.');
}

export function normalizeInvitedVendorIds(vendorIds: readonly string[]) {
  const normalized = [...new Set(vendorIds.map((value) => value.trim()).filter(Boolean))];
  if (!normalized.length) {
    throw new AppError(400, 'RFQ_VENDOR_REQUIRED', 'At least one vendor must be invited.');
  }
  return normalized;
}

export function assertVendorWasInvited(invitedVendorIds: readonly string[], vendorId: string) {
  if (!invitedVendorIds.includes(vendorId)) {
    throw new AppError(403, 'RFQ_VENDOR_NOT_INVITED', 'Vendor is not invited to this RFQ.');
  }
}

export function assertSupplierQuotationCanBeSelected(status: SupplierQuotationWorkflowStatus) {
  return assertAllowed(status, ['SUBMITTED', 'VALID'], 'SUPPLIER_QUOTATION_INVALID_STATE', 'Quotation cannot be selected.');
}

export function compareSupplierQuotations(
  quotations: readonly SupplierQuotationComparisonLine[],
): SupplierQuotationComparisonResult[] {
  const selectable = quotations.filter((quotation) => ['SUBMITTED', 'VALID', 'SELECTED'].includes(quotation.status));
  if (!selectable.length) return [];

  const lowestTotal = selectable.reduce((lowest, quotation) => Prisma.Decimal.min(lowest, quotation.total), selectable[0].total);
  const averageDelivery = (quotation: SupplierQuotationComparisonLine) => quotation.deliveryDays.length
    ? Math.round(quotation.deliveryDays.reduce((sum, days) => sum + days, 0) / quotation.deliveryDays.length)
    : Number.MAX_SAFE_INTEGER;
  const fastestDelivery = Math.min(...selectable.map(averageDelivery));
  const maxWarranty = Math.max(...selectable.map((quotation) => quotation.warrantyMonths.length ? Math.max(...quotation.warrantyMonths) : 0));

  return [...selectable]
    .sort((left, right) => {
      const byTotal = left.total.cmp(right.total);
      if (byTotal !== 0) return byTotal;
      const byDelivery = averageDelivery(left) - averageDelivery(right);
      if (byDelivery !== 0) return byDelivery;
      const leftWarranty = left.warrantyMonths.length ? Math.max(...left.warrantyMonths) : 0;
      const rightWarranty = right.warrantyMonths.length ? Math.max(...right.warrantyMonths) : 0;
      if (leftWarranty !== rightWarranty) return rightWarranty - leftWarranty;
      return left.quoteRef.localeCompare(right.quoteRef);
    })
    .map((quotation, index) => {
      const avgDelivery = averageDelivery(quotation);
      const warranty = quotation.warrantyMonths.length ? Math.max(...quotation.warrantyMonths) : 0;
      return {
        id: quotation.id,
        vendorId: quotation.vendorId,
        quoteRef: quotation.quoteRef,
        total: quotation.total,
        rank: index + 1,
        averageDeliveryDays: avgDelivery === Number.MAX_SAFE_INTEGER ? 0 : avgDelivery,
        maxWarrantyMonths: warranty,
        isLowestCost: quotation.total.equals(lowestTotal),
        isFastestDelivery: avgDelivery === fastestDelivery,
        isStrongestWarranty: warranty === maxWarranty,
      };
    });
}

export function assertSelectedQuotationCanCreatePo(status: SupplierQuotationWorkflowStatus) {
  return assertAllowed(status, ['SELECTED'], 'SUPPLIER_QUOTATION_NOT_SELECTED', 'Only the selected quotation can become a purchase order.');
}

export function assertPurchaseOrderCommandAllowed(
  current: PurchaseOrderWorkflowStatus,
  command: 'submit' | 'approve' | 'send' | 'cancel' | 'receive',
  options: { hasReceiptHistory?: boolean } = {},
) {
  if (command === 'submit') return assertAllowed(current, ['DRAFT'], 'PURCHASE_ORDER_INVALID_STATE', 'Only DRAFT PO can be submitted.');
  if (command === 'approve') return assertAllowed(current, ['APPROVAL_PENDING'], 'PURCHASE_ORDER_INVALID_STATE', 'PO is not awaiting approval.');
  if (command === 'send') return assertAllowed(current, ['APPROVED'], 'PURCHASE_ORDER_INVALID_STATE', 'Only APPROVED PO can be sent.');
  if (command === 'receive') return assertAllowed(current, ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'], 'PURCHASE_ORDER_NOT_RECEIVABLE', 'Purchase order is not receivable.');
  if (command === 'cancel') {
    assertAllowed(current, ['DRAFT', 'APPROVAL_PENDING', 'APPROVED', 'SENT'], 'PURCHASE_ORDER_CANNOT_CANCEL', 'PO cannot be cancelled in its current state.');
    if (options.hasReceiptHistory) {
      throw new AppError(409, 'PURCHASE_ORDER_CANNOT_CANCEL', 'PO with receipt history cannot be cancelled.');
    }
  }
  return current;
}

export function assertGoodsReceiptQuantities(input: {
  readonly receivedQty: string | number | Prisma.Decimal;
  readonly acceptedQty: string | number | Prisma.Decimal;
  readonly damagedQty: string | number | Prisma.Decimal;
}) {
  const received = decimal(input.receivedQty);
  const accepted = decimal(input.acceptedQty);
  const damaged = decimal(input.damagedQty);
  if (!received.isFinite() || !received.isPositive() || accepted.isNegative() || damaged.isNegative() || accepted.add(damaged).greaterThan(received)) {
    throw new AppError(400, 'GOODS_RECEIPT_QUANTITY_INVALID', 'Invalid received/accepted/damaged quantities.');
  }
  return { received, accepted, damaged };
}

export function assertReceiptWithinTolerance(input: {
  readonly orderedQty: string | number | Prisma.Decimal;
  readonly alreadyReceivedQty: string | number | Prisma.Decimal;
  readonly incomingReceivedQty: string | number | Prisma.Decimal;
  readonly tolerancePct: string | number | Prisma.Decimal;
}) {
  const ordered = decimal(input.orderedQty);
  const alreadyReceived = decimal(input.alreadyReceivedQty);
  const incoming = decimal(input.incomingReceivedQty);
  const tolerancePct = decimal(input.tolerancePct);
  const maximum = ordered.mul(new Prisma.Decimal(1).add(tolerancePct.div(100)));
  const nextReceived = alreadyReceived.add(incoming);
  if (nextReceived.greaterThan(maximum)) {
    throw new AppError(409, 'GOODS_RECEIPT_OVER_RECEIPT', 'Receipt exceeds PO quantity plus configured tolerance.', {
      orderedQty: ordered.toString(),
      alreadyReceivedQty: alreadyReceived.toString(),
      incomingReceivedQty: incoming.toString(),
      maximumReceivableQty: maximum.toString(),
    });
  }
  return nextReceived;
}

export function assertSerializedAcceptedQuantity(input: {
  readonly trackingType: 'NONE' | 'SERIAL' | 'BATCH';
  readonly acceptedQty: string | number | Prisma.Decimal;
  readonly serialNumbers: readonly string[];
}) {
  if (input.trackingType !== 'SERIAL') return [...new Set(input.serialNumbers.map((value) => value.trim()).filter(Boolean))];
  const accepted = decimal(input.acceptedQty);
  const serials = [...new Set(input.serialNumbers.map((value) => value.trim()).filter(Boolean))];
  if (!accepted.isInteger()) {
    throw new AppError(400, 'GOODS_RECEIPT_SERIAL_QUANTITY_INVALID', 'Accepted serialized quantity must be a whole number.');
  }
  if (serials.length !== accepted.toNumber()) {
    throw new AppError(400, 'GOODS_RECEIPT_SERIAL_COUNT_MISMATCH', 'Accepted serialized quantity must equal serial count.');
  }
  return serials;
}

export function assertGoodsReceiptCanBeInspected(status: GoodsReceiptWorkflowStatus) {
  return assertAllowed(status, ['RECEIVED', 'INSPECTION_PENDING'], 'GOODS_RECEIPT_INVALID_STATE', 'Goods receipt cannot be inspected in its current state.');
}

export const ProcurementDeepWorkflowChecklist = Object.freeze([
  'approved-pr-required-before-rfq',
  'approved-vendors-only-for-rfq-quotation-po',
  'supplier-selection-before-po',
  'maker-checker-for-pr-and-po-approval',
  'po-receive-state-guard',
  'grn-idempotency-key-required',
  'grn-row-lock-required',
  'grn-stock-ledger-transaction-required',
  'serialized-quantity-equals-serial-count',
  'supplier-invoice-source-from-po-plus-grn',
  'audit-every-critical-command',
  'no-async-procurement-stock-or-approval-mutation',
] as const);
