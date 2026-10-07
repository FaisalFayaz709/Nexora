import { z } from 'zod';
import { DecimalStringSchema, UuidSchema } from '../common';

export const Pass09ProcurementCompletionMaturity =
  'PASS_09_SOURCE_LEVEL_PROCUREMENT_E2E_COMPLETION_RUNTIME_PENDING' as const;

export const ProcurementCompletionStages = Object.freeze([
  'MATERIAL_REQUIREMENT',
  'PURCHASE_REQUEST',
  'PURCHASE_REQUEST_APPROVAL',
  'RFQ',
  'VENDOR_INVITATION',
  'SUPPLIER_QUOTATION',
  'QUOTATION_COMPARISON',
  'SUPPLIER_SELECTION',
  'PURCHASE_ORDER',
  'PURCHASE_ORDER_APPROVAL',
  'PURCHASE_ORDER_SEND',
  'GOODS_RECEIPT_NOTE',
  'QUALITY_INSPECTION',
  'STOCK_LEDGER_POSTING',
  'SUPPLIER_INVOICE_SOURCE',
] as const);

export const ProcurementCompletionCommandRoutes = Object.freeze([
  { route: 'POST /api/v1/purchase-requests', permission: 'purchase_request.create', atomic: true },
  { route: 'POST /api/v1/purchase-requests/:id/submit', permission: 'purchase_request.submit', atomic: true },
  { route: 'POST /api/v1/purchase-requests/:id/approve', permission: 'purchase_request.approve', atomic: true },
  { route: 'POST /api/v1/purchase-requests/:id/reject', permission: 'purchase_request.approve', atomic: true },
  { route: 'POST /api/v1/purchase-requests/:id/create-rfq', permission: 'rfq.create', atomic: true },
  { route: 'POST /api/v1/rfqs/:id/invite-vendors', permission: 'rfq.update', atomic: true },
  { route: 'POST /api/v1/rfqs/:id/publish', permission: 'rfq.publish', atomic: true },
  { route: 'POST /api/v1/rfqs/:id/close', permission: 'rfq.close', atomic: true },
  { route: 'POST /api/v1/supplier-quotations', permission: 'supplier_quotation.create', atomic: true },
  { route: 'POST /api/v1/supplier-quotations/:id/select', permission: 'supplier_quotation.select', atomic: true },
  { route: 'POST /api/v1/purchase-orders', permission: 'purchase_order.create', atomic: true },
  { route: 'POST /api/v1/purchase-orders/:id/submit', permission: 'purchase_order.submit', atomic: true },
  { route: 'POST /api/v1/purchase-orders/:id/approve', permission: 'purchase_order.approve', atomic: true },
  { route: 'POST /api/v1/purchase-orders/:id/send', permission: 'purchase_order.send', atomic: true },
  { route: 'POST /api/v1/purchase-orders/:id/cancel', permission: 'purchase_order.cancel', atomic: true },
  { route: 'POST /api/v1/goods-receipts', permission: 'goods_receipt.create', atomic: true, idempotencyKey: true },
  { route: 'POST /api/v1/goods-receipts/:id/inspect', permission: 'goods_receipt.inspect', atomic: true },
] as const);

export const ProcurementCompletionInvariants = Object.freeze([
  'RFQ can be created only from an approved purchase request',
  'Supplier quotations must cover the source purchase request item set and quantities',
  'Only invited and approved vendors can submit supplier quotations',
  'Quotation comparison exposes deterministic rank, lowest-cost, fastest-delivery and warranty indicators',
  'Only one supplier quotation can be selected for an RFQ',
  'Purchase order can be created only from the selected supplier quotation and its source RFQ/PR chain',
  'PO approval uses maker-checker through the approval module facade',
  'Goods receipt requires Idempotency-Key and row locks PO lines before receiving',
  'Goods receipt writes GRN header, lines, PO received quantity, stock ledger, serial/batch state, audit and event in one transaction',
  'Supplier invoice source handed to Finance must be tenant scoped to PO plus GRN',
  'No procurement approval, receiving, stock or supplier-invoice source state is moved to BullMQ/eventual consistency',
] as const);

export const ProcurementQuotationCoverageLineSchema = z.object({
  productId: UuidSchema,
  quantity: DecimalStringSchema.refine((value) => Number(value) > 0),
});

export const ProcurementQuotationCoverageSchema = z.object({
  purchaseRequestId: UuidSchema,
  rfqId: UuidSchema,
  requestItems: z.array(ProcurementQuotationCoverageLineSchema).min(1),
  quotationItems: z.array(ProcurementQuotationCoverageLineSchema).min(1),
});

export const ProcurementFrontendLineArrayRequirements = Object.freeze([
  'purchase_request_items_field_array',
  'supplier_quotation_items_field_array',
  'goods_receipt_items_field_array',
  'grn_serial_numbers_json_array',
  'grn_batch_lot_json_array',
  'approved_vendor_ids_json_array_for_invitation',
] as const);

export const ProcurementCompletionRuntimeEvidence = Object.freeze([
  'runtime_pr_to_rfq_state_test_pending',
  'runtime_vendor_governance_test_pending',
  'runtime_quotation_coverage_test_pending',
  'runtime_quote_selection_uniqueness_test_pending',
  'runtime_po_source_chain_test_pending',
  'runtime_po_maker_checker_test_pending',
  'runtime_grn_idempotency_and_row_lock_test_pending',
  'runtime_grn_stock_ledger_atomicity_test_pending',
  'runtime_finance_source_po_grn_test_pending',
] as const);
