import type { EntityColumnConfig } from '@/modules/masters/columns';

export const customerInvoiceColumns: EntityColumnConfig[] = [
  { key: 'invoiceNo', label: 'Invoice No' },
  { key: 'customerId', label: 'Customer' },
  { key: 'projectId', label: 'Project' },
  { key: 'status', label: 'Status' },
  { key: 'subtotal', label: 'Subtotal' },
  { key: 'tax', label: 'Tax' },
  { key: 'total', label: 'Total' },
  { key: 'balance', label: 'Balance' },
  { key: 'dueDate', label: 'Due Date' },
];

export const supplierInvoiceColumns: EntityColumnConfig[] = [
  { key: 'invoiceNo', label: 'Invoice No' },
  { key: 'vendorId', label: 'Vendor' },
  { key: 'purchaseOrderId', label: 'PO' },
  { key: 'goodsReceiptId', label: 'GRN' },
  { key: 'matchStatus', label: 'Match' },
  { key: 'status', label: 'Status' },
  { key: 'total', label: 'Total' },
];

export const paymentColumns: EntityColumnConfig[] = [
  { key: 'paymentNo', label: 'Payment No' },
  { key: 'direction', label: 'Direction' },
  { key: 'partyType', label: 'Party Type' },
  { key: 'partyId', label: 'Party' },
  { key: 'amount', label: 'Amount' },
  { key: 'method', label: 'Method' },
  { key: 'status', label: 'Status' },
  { key: 'paidAt', label: 'Paid At' },
];

export const expenseColumns: EntityColumnConfig[] = [
  { key: 'employeeId', label: 'Employee' },
  { key: 'projectId', label: 'Project' },
  { key: 'category', label: 'Category' },
  { key: 'incurredAt', label: 'Incurred' },
  { key: 'status', label: 'Status' },
  { key: 'total', label: 'Total' },
];

export const accountColumns: EntityColumnConfig[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Account' },
  { key: 'type', label: 'Type' },
  { key: 'parentId', label: 'Parent' },
  { key: 'active', label: 'Active' },
];

export const journalEntryColumns: EntityColumnConfig[] = [
  { key: 'entryNo', label: 'Entry No' },
  { key: 'periodId', label: 'Period' },
  { key: 'referenceType', label: 'Reference Type' },
  { key: 'referenceId', label: 'Reference' },
  { key: 'status', label: 'Status' },
  { key: 'postedAt', label: 'Posted At' },
];

export const taxCodeColumns: EntityColumnConfig[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'taxType', label: 'Type' },
  { key: 'ratePct', label: 'Rate %' },
  { key: 'status', label: 'Status' },
  { key: 'recoverable', label: 'Recoverable' },
];

export const taxReportColumns: EntityColumnConfig[] = [
  { key: 'period', label: 'Period' },
  { key: 'taxType', label: 'Tax Type' },
  { key: 'taxableAmount', label: 'Taxable Amount' },
  { key: 'taxAmount', label: 'Tax Amount' },
  { key: 'sourceType', label: 'Source' },
];

export const bankAccountColumns: EntityColumnConfig[] = [
  { key: 'bankName', label: 'Bank' },
  { key: 'accountTitle', label: 'Account Title' },
  { key: 'accountNoMasked', label: 'Account No' },
  { key: 'currency', label: 'Currency' },
  { key: 'active', label: 'Active' },
];

export const agingColumns: EntityColumnConfig[] = [
  { key: 'partyName', label: 'Party' },
  { key: 'current', label: 'Current' },
  { key: 'days30', label: '30 Days' },
  { key: 'days60', label: '60 Days' },
  { key: 'days90', label: '90 Days' },
  { key: 'total', label: 'Total' },
];

export const financeColumnSets = {
  customerInvoiceColumns,
  supplierInvoiceColumns,
  paymentColumns,
  expenseColumns,
  accountColumns,
  journalEntryColumns,
  taxCodeColumns,
  taxReportColumns,
  bankAccountColumns,
  agingColumns,
} as const;
