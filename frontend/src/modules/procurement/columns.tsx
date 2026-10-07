import type { EntityColumnConfig } from '@/modules/masters/columns';

export const purchaseRequestColumns: EntityColumnConfig[] = [
  { key: 'prNo', label: 'PR No' },
  { key: 'projectId', label: 'Project' },
  { key: 'requesterId', label: 'Requester' },
  { key: 'requiredDate', label: 'Required' },
  { key: 'status', label: 'Status' },
];

export const rfqColumns: EntityColumnConfig[] = [
  { key: 'rfqNo', label: 'RFQ No' },
  { key: 'purchaseRequestId', label: 'PR' },
  { key: 'closesAt', label: 'Closes' },
  { key: 'status', label: 'Status' },
];

export const supplierQuotationColumns: EntityColumnConfig[] = [
  { key: 'quoteRef', label: 'Quote ref' },
  { key: 'rfqId', label: 'RFQ' },
  { key: 'vendorId', label: 'Vendor' },
  { key: 'total', label: 'Total' },
  { key: 'status', label: 'Status' },
];

export const purchaseOrderColumns: EntityColumnConfig[] = [
  { key: 'poNo', label: 'PO No' },
  { key: 'vendorId', label: 'Vendor' },
  { key: 'supplierQuotationId', label: 'Supplier quotation' },
  { key: 'expectedDate', label: 'Expected' },
  { key: 'status', label: 'Status' },
  { key: 'total', label: 'Total' },
];

export const goodsReceiptColumns: EntityColumnConfig[] = [
  { key: 'grnNo', label: 'GRN No' },
  { key: 'purchaseOrderId', label: 'PO' },
  { key: 'warehouseId', label: 'Warehouse' },
  { key: 'receivedAt', label: 'Received' },
  { key: 'status', label: 'Status' },
];

export const purchaseContractColumns: EntityColumnConfig[] = [
  { key: 'contractNo', label: 'Contract no' },
  { key: 'vendorId', label: 'Vendor' },
  { key: 'status', label: 'Status' },
  { key: 'maxValue', label: 'Max value' },
];

export const landedCostColumns: EntityColumnConfig[] = [
  { key: 'purchaseOrderId', label: 'PO' },
  { key: 'goodsReceiptId', label: 'GRN' },
  { key: 'allocationMethod', label: 'Allocation' },
  { key: 'status', label: 'Status' },
];

export const vendorOnboardingColumns: EntityColumnConfig[] = [
  { key: 'vendorId', label: 'Vendor' },
  { key: 'status', label: 'Status' },
  { key: 'riskRating', label: 'Risk' },
  { key: 'approvalRequestId', label: 'Approval' },
];

export const procurementColumnSets = {
  purchaseRequestColumns,
  rfqColumns,
  supplierQuotationColumns,
  purchaseOrderColumns,
  goodsReceiptColumns,
  purchaseContractColumns,
  landedCostColumns,
  vendorOnboardingColumns,
} as const;
