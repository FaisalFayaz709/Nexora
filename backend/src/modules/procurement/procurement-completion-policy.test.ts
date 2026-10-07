import { describe, expect, it } from 'vitest';
import {
  assertProcurementCompletionMatrix,
  assertPurchaseOrderSourceChain,
  assertQuotationCoversPurchaseRequest,
  assertSingleSelectedSupplierQuotation,
} from './procurement-completion-policy.js';

describe('M9 procurement completion policy', () => {
  it('requires supplier quotations to cover the source purchase request items exactly', () => {
    const result = assertQuotationCoversPurchaseRequest({
      purchaseRequestId: '00000000-0000-0000-0000-000000000001',
      rfqId: '00000000-0000-0000-0000-000000000002',
      requestItems: [
        { productId: '00000000-0000-0000-0000-000000000101', qty: '2' },
        { productId: '00000000-0000-0000-0000-000000000102', qty: '3' },
      ],
      quotationItems: [
        { productId: '00000000-0000-0000-0000-000000000101', quantity: '2' },
        { productId: '00000000-0000-0000-0000-000000000102', quantity: '3' },
      ],
    });
    expect(result.matchedProductCount).toBe(2);
    expect(() => assertQuotationCoversPurchaseRequest({
      purchaseRequestId: '00000000-0000-0000-0000-000000000001',
      rfqId: '00000000-0000-0000-0000-000000000002',
      requestItems: [{ productId: '00000000-0000-0000-0000-000000000101', qty: '2' }],
      quotationItems: [{ productId: '00000000-0000-0000-0000-000000000101', quantity: '1' }],
    })).toThrow('item set and quantities');
  });

  it('prevents selecting more than one supplier quotation for the same RFQ', () => {
    expect(assertSingleSelectedSupplierQuotation({ rfqId: 'rfq-1', selectedQuotationCount: 0 })).toBe(true);
    expect(() => assertSingleSelectedSupplierQuotation({ rfqId: 'rfq-1', selectedQuotationCount: 1 })).toThrow('Only one supplier quotation');
  });

  it('requires purchase orders to come from one selected quotation RFQ PR source chain', () => {
    expect(assertPurchaseOrderSourceChain({
      supplierQuotationId: 'quote-1',
      quoteStatus: 'SELECTED',
      rfqPurchaseRequestId: 'pr-1',
      purchaseRequestId: 'pr-1',
      purchaseRequestStatus: 'CONVERTED_TO_RFQ',
      purchaseRequestBranchId: 'branch-1',
      activeBranchId: 'branch-1',
    })).toBe(true);
    expect(() => assertPurchaseOrderSourceChain({
      supplierQuotationId: 'quote-1',
      quoteStatus: 'SUBMITTED',
      rfqPurchaseRequestId: 'pr-1',
      purchaseRequestId: 'pr-1',
      purchaseRequestStatus: 'CONVERTED_TO_RFQ',
      purchaseRequestBranchId: 'branch-1',
      activeBranchId: 'branch-1',
    })).toThrow('selected quotation');
  });

  it('publishes the M9 completion matrix without runtime certification claims', () => {
    const matrix = assertProcurementCompletionMatrix();
    expect(matrix.subjects).toContain('SUPPLIER_INVOICE_SOURCE');
    expect(matrix.runtimeCertification).toBe('runtime_procurement_workflow_certification_pending');
  });
});
