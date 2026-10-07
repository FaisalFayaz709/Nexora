import { z } from 'zod';

export const PurchaseRequestStatusSchema = z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CONVERTED_TO_RFQ", "CANCELLED"]);
export type PurchaseRequestStatus = z.infer<typeof PurchaseRequestStatusSchema>;

export const RFQStatusSchema = z.enum(["DRAFT", "PUBLISHED", "OPEN", "CLOSED", "AWARDED", "CANCELLED"]);
export type RFQStatus = z.infer<typeof RFQStatusSchema>;

export const PurchaseOrderStatusSchema = z.enum(["DRAFT", "APPROVAL_PENDING", "APPROVED", "SENT", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED", "CANCELLED"]);
export type PurchaseOrderStatus = z.infer<typeof PurchaseOrderStatusSchema>;

export const GoodsReceiptStatusSchema = z.enum(["DRAFT", "RECEIVED", "INSPECTION_PENDING", "ACCEPTED", "PARTIALLY_ACCEPTED", "REJECTED"]);
export type GoodsReceiptStatus = z.infer<typeof GoodsReceiptStatusSchema>;

export const ProjectStatusSchema = z.enum(["DRAFT", "PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "HANDED_OVER", "CANCELLED"]);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const AssetStatusSchema = z.enum(["PROCURED", "IN_WAREHOUSE", "ALLOCATED", "ISSUED", "INSTALLED", "ACTIVE", "UNDER_MAINTENANCE", "REPAIRED", "REPLACED", "RETIRED"]);
export type AssetStatus = z.infer<typeof AssetStatusSchema>;

export const TicketStatusSchema = z.enum(["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER", "WAITING_VENDOR", "RESOLVED", "CLOSED", "CANCELLED"]);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const WorkOrderStatusSchema = z.enum(["NEW", "VALIDATED", "ASSIGNED", "TECHNICIAN_ACCEPTED", "TRAVELLING", "ON_SITE", "DIAGNOSIS", "WORK_IN_PROGRESS", "WAITING_FOR_PART", "RESOLVED", "CUSTOMER_CONFIRMATION", "CLOSED", "CANCELLED"]);
export type WorkOrderStatus = z.infer<typeof WorkOrderStatusSchema>;

export const InvoiceStatusSchema = z.enum(["DRAFT", "APPROVAL_PENDING", "APPROVED", "POSTED", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED", "REVERSED"]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const ApprovalRequestStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "APPROVED", "REJECTED", "RETURNED", "CANCELLED"]);
export type ApprovalRequestStatus = z.infer<typeof ApprovalRequestStatusSchema>;

export const ContractStatusSchema = z.enum(["DRAFT", "UNDER_REVIEW", "ACTIVE", "EXPIRING", "EXPIRED", "TERMINATED"]);
export type ContractStatus = z.infer<typeof ContractStatusSchema>;

export const LeaveRequestStatusSchema = z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CANCELLED"]);
export type LeaveRequestStatus = z.infer<typeof LeaveRequestStatusSchema>;
