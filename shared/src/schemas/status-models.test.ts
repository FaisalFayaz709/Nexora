import { describe, expect, it } from 'vitest';
import * as statuses from './status-models';

describe('canonical status models', () => {
  it('PurchaseRequest status list stays locked', () => {
    expect(statuses.PurchaseRequestStatusSchema.options).toEqual(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CONVERTED_TO_RFQ", "CANCELLED"]);
  });
  it('RFQ status list stays locked', () => {
    expect(statuses.RFQStatusSchema.options).toEqual(["DRAFT", "PUBLISHED", "OPEN", "CLOSED", "AWARDED", "CANCELLED"]);
  });
  it('PurchaseOrder status list stays locked', () => {
    expect(statuses.PurchaseOrderStatusSchema.options).toEqual(["DRAFT", "APPROVAL_PENDING", "APPROVED", "SENT", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED", "CANCELLED"]);
  });
  it('GoodsReceipt status list stays locked', () => {
    expect(statuses.GoodsReceiptStatusSchema.options).toEqual(["DRAFT", "RECEIVED", "INSPECTION_PENDING", "ACCEPTED", "PARTIALLY_ACCEPTED", "REJECTED"]);
  });
  it('Project status list stays locked', () => {
    expect(statuses.ProjectStatusSchema.options).toEqual(["DRAFT", "PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "HANDED_OVER", "CANCELLED"]);
  });
  it('Asset status list stays locked', () => {
    expect(statuses.AssetStatusSchema.options).toEqual(["PROCURED", "IN_WAREHOUSE", "ALLOCATED", "ISSUED", "INSTALLED", "ACTIVE", "UNDER_MAINTENANCE", "REPAIRED", "REPLACED", "RETIRED"]);
  });
  it('Ticket status list stays locked', () => {
    expect(statuses.TicketStatusSchema.options).toEqual(["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER", "WAITING_VENDOR", "RESOLVED", "CLOSED", "CANCELLED"]);
  });
  it('WorkOrder status list stays locked', () => {
    expect(statuses.WorkOrderStatusSchema.options).toEqual(["NEW", "VALIDATED", "ASSIGNED", "TECHNICIAN_ACCEPTED", "TRAVELLING", "ON_SITE", "DIAGNOSIS", "WORK_IN_PROGRESS", "WAITING_FOR_PART", "RESOLVED", "CUSTOMER_CONFIRMATION", "CLOSED", "CANCELLED"]);
  });
  it('Invoice status list stays locked', () => {
    expect(statuses.InvoiceStatusSchema.options).toEqual(["DRAFT", "APPROVAL_PENDING", "APPROVED", "POSTED", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED", "REVERSED"]);
  });
  it('ApprovalRequest status list stays locked', () => {
    expect(statuses.ApprovalRequestStatusSchema.options).toEqual(["PENDING", "IN_PROGRESS", "APPROVED", "REJECTED", "RETURNED", "CANCELLED"]);
  });
  it('Contract status list stays locked', () => {
    expect(statuses.ContractStatusSchema.options).toEqual(["DRAFT", "UNDER_REVIEW", "ACTIVE", "EXPIRING", "EXPIRED", "TERMINATED"]);
  });
  it('LeaveRequest status list stays locked', () => {
    expect(statuses.LeaveRequestStatusSchema.options).toEqual(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CANCELLED"]);
  });
});
