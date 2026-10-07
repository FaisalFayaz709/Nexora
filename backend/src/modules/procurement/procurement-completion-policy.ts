import { Prisma } from '@nexora/database';
import { AppError } from '../../core/http/errors.js';
import { assertSelectedQuotationCanCreatePo } from './procurement-workflow-policy.js';

export const Pass09ProcurementCompletionPolicy =
  'PASS_09_SOURCE_LEVEL_PROCUREMENT_E2E_COMPLETION_RUNTIME_PENDING' as const;

export const RuntimeProcurementSubjects = Object.freeze([
  'MATERIAL_REQUIREMENT',
  'PURCHASE_REQUEST',
  'APPROVAL',
  'RFQ',
  'SUPPLIER_QUOTATION',
  'QUOTATION_COMPARISON',
  'SUPPLIER_SELECTION',
  'PURCHASE_ORDER',
  'GOODS_RECEIPT',
  'STOCK_LEDGER',
  'SUPPLIER_INVOICE_SOURCE',
] as const);

export const ProcurementTransactionalCommands = Object.freeze([
  'createPurchaseRequest',
  'submitPurchaseRequest',
  'decidePurchaseRequest',
  'createRfqFromPurchaseRequest',
  'inviteVendors',
  'publishRfq',
  'closeRfq',
  'recordSupplierQuotation',
  'selectSupplierQuotation',
  'createPurchaseOrder',
  'submitPurchaseOrder',
  'approvePurchaseOrder',
  'sendPurchaseOrder',
  'cancelPurchaseOrder',
  'receiveGoods',
  'inspectGoodsReceipt',
] as const);

export interface ProcurementCoverageLine {
  readonly productId: string;
  readonly qty?: string | number | Prisma.Decimal;
  readonly quantity?: string | number | Prisma.Decimal;
}

function decimal(value: string | number | Prisma.Decimal | undefined): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) return value;
  if (value === undefined) throw new AppError(400, 'PROCUREMENT_QUANTITY_REQUIRED', 'Procurement quantity is required.');
  return new Prisma.Decimal(value);
}

function aggregate(lines: readonly ProcurementCoverageLine[]) {
  const byProduct = new Map<string, Prisma.Decimal>();
  for (const line of lines) {
    const qty = decimal(line.qty ?? line.quantity);
    if (!qty.isFinite() || !qty.isPositive()) {
      throw new AppError(400, 'PROCUREMENT_QUANTITY_INVALID', 'Procurement quantities must be positive decimal values.');
    }
    byProduct.set(line.productId, (byProduct.get(line.productId) ?? new Prisma.Decimal(0)).add(qty));
  }
  return byProduct;
}

export function assertQuotationCoversPurchaseRequest(input: {
  readonly purchaseRequestId: string;
  readonly rfqId: string;
  readonly requestItems: readonly ProcurementCoverageLine[];
  readonly quotationItems: readonly ProcurementCoverageLine[];
}) {
  const requested = aggregate(input.requestItems);
  const quoted = aggregate(input.quotationItems);
  const missingProducts: string[] = [];
  const unexpectedProducts: string[] = [];
  const quantityMismatches: Array<{ productId: string; requestedQty: string; quotedQty: string }> = [];

  for (const [productId, requestedQty] of requested) {
    const quotedQty = quoted.get(productId);
    if (!quotedQty) {
      missingProducts.push(productId);
      continue;
    }
    if (!quotedQty.equals(requestedQty)) {
      quantityMismatches.push({ productId, requestedQty: requestedQty.toString(), quotedQty: quotedQty.toString() });
    }
  }

  for (const productId of quoted.keys()) {
    if (!requested.has(productId)) unexpectedProducts.push(productId);
  }

  if (missingProducts.length || unexpectedProducts.length || quantityMismatches.length) {
    throw new AppError(409, 'SUPPLIER_QUOTATION_ITEM_COVERAGE_INVALID', 'Supplier quotation must match the RFQ purchase-request item set and quantities.', {
      purchaseRequestId: input.purchaseRequestId,
      rfqId: input.rfqId,
      missingProducts,
      unexpectedProducts,
      quantityMismatches,
    });
  }

  return {
    purchaseRequestId: input.purchaseRequestId,
    rfqId: input.rfqId,
    matchedProductCount: requested.size,
    requestedTotalQty: [...requested.values()].reduce((sum, qty) => sum.add(qty), new Prisma.Decimal(0)).toString(),
    quotedTotalQty: [...quoted.values()].reduce((sum, qty) => sum.add(qty), new Prisma.Decimal(0)).toString(),
  };
}

export function assertSingleSelectedSupplierQuotation(input: {
  readonly rfqId: string;
  readonly selectedQuotationCount: number;
}) {
  if (input.selectedQuotationCount > 0) {
    throw new AppError(409, 'RFQ_SUPPLIER_QUOTATION_ALREADY_SELECTED', 'Only one supplier quotation can be selected for an RFQ.', {
      rfqId: input.rfqId,
      selectedQuotationCount: input.selectedQuotationCount,
    });
  }
  return true;
}

export function assertPurchaseOrderSourceChain(input: {
  readonly supplierQuotationId: string;
  readonly quoteStatus: string;
  readonly rfqPurchaseRequestId: string | null | undefined;
  readonly purchaseRequestId: string;
  readonly purchaseRequestStatus: string;
  readonly purchaseRequestBranchId: string;
  readonly activeBranchId: string | null | undefined;
}) {
  assertSelectedQuotationCanCreatePo(input.quoteStatus as never);
  if (input.rfqPurchaseRequestId !== input.purchaseRequestId) {
    throw new AppError(409, 'PURCHASE_ORDER_SOURCE_CHAIN_BROKEN', 'Selected quotation, RFQ and purchase request do not form one source chain.', {
      supplierQuotationId: input.supplierQuotationId,
      rfqPurchaseRequestId: input.rfqPurchaseRequestId,
      purchaseRequestId: input.purchaseRequestId,
    });
  }
  if (!['CONVERTED_TO_RFQ', 'APPROVED'].includes(input.purchaseRequestStatus)) {
    throw new AppError(409, 'PURCHASE_ORDER_SOURCE_PR_INVALID_STATE', 'Purchase order source purchase request must be approved and converted into an RFQ.', {
      purchaseRequestId: input.purchaseRequestId,
      purchaseRequestStatus: input.purchaseRequestStatus,
    });
  }
  if (input.activeBranchId && input.activeBranchId !== input.purchaseRequestBranchId) {
    throw new AppError(403, 'PROCUREMENT_BRANCH_SCOPE_DENIED', 'Source purchase request is outside the active branch scope.');
  }
  return true;
}

export function assertProcurementFinanceSource(input: {
  readonly organizationId: string;
  readonly sourceOrganizationId: string;
  readonly purchaseOrderId: string;
  readonly goodsReceiptId: string;
  readonly purchaseOrderMatchesReceipt: boolean;
}) {
  if (input.organizationId !== input.sourceOrganizationId || !input.purchaseOrderMatchesReceipt) {
    throw new AppError(409, 'SUPPLIER_INVOICE_SOURCE_INVALID', 'Supplier invoice source must be tenant-scoped to a matching purchase order and goods receipt.', {
      purchaseOrderId: input.purchaseOrderId,
      goodsReceiptId: input.goodsReceiptId,
    });
  }
  return true;
}

export function assertProcurementCompletionMatrix() {
  return {
    maturity: Pass09ProcurementCompletionPolicy,
    subjects: RuntimeProcurementSubjects,
    criticalCommands: ProcurementTransactionalCommands,
    runtimeCertification: 'runtime_procurement_workflow_certification_pending',
  };
}
