import { z } from 'zod';
import {
  apiDataEnvelope,
  apiListEnvelope,
  DecimalStringSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  PageQuerySchema,
  UuidSchema,
} from '../common';
import { CreateStockTransferRequestSchema } from './create-stock-transfer.contract';

export const InventoryOperationContractsMaturity =
  'IMPLEMENTATION_DERIVED_FROM_ENTITY_CATALOG_FUNCTIONAL_SPEC_AND_LOCKED_ROUTE_SEMANTICS' as const;

export const StockBalanceQuerySchema = PageQuerySchema.extend({
  warehouseId: UuidSchema.optional(),
  locationId: UuidSchema.optional(),
  productId: UuidSchema.optional(),
});

export const StockLedgerQuerySchema = PageQuerySchema.extend({
  warehouseId: UuidSchema.optional(),
  locationId: UuidSchema.optional(),
  productId: UuidSchema.optional(),
  type: z.enum([
    'PURCHASE_RECEIPT','STOCK_TRANSFER','PROJECT_ISSUE','PROJECT_RETURN',
    'TECHNICIAN_ISSUE','TECHNICIAN_RETURN','SALES_ISSUE','DAMAGED',
    'ADJUSTMENT','CUSTOMER_INSTALLATION',
  ]).optional(),
  referenceType: z.string().max(100).optional(),
  referenceId: UuidSchema.optional(),
  from: IsoDateTimeSchema.optional(),
  to: IsoDateTimeSchema.optional(),
});

export const StockBalanceDataSchema = z.object({
  id: UuidSchema,
  warehouseId: UuidSchema,
  locationId: UuidSchema.nullable(),
  productId: UuidSchema,
  onHand: DecimalStringSchema,
  reserved: DecimalStringSchema,
  available: DecimalStringSchema,
});
export const StockBalanceListResponseSchema = apiListEnvelope(StockBalanceDataSchema);

export const StockTransactionDataSchema = z.object({
  id: UuidSchema,
  productId: UuidSchema,
  warehouseId: UuidSchema,
  locationId: UuidSchema.nullable(),
  type: z.string(),
  qty: DecimalStringSchema,
  referenceType: z.string(),
  referenceId: UuidSchema,
  occurredAt: IsoDateTimeSchema,
});
export const StockLedgerListResponseSchema = apiListEnvelope(StockTransactionDataSchema);

export const CreateStockReservationSchema = z.object({
  productId: UuidSchema,
  warehouseId: UuidSchema,
  projectId: UuidSchema,
  quantity: DecimalStringSchema.refine((value) => Number(value) > 0, 'quantity must be positive'),
});
export const StockReservationDataSchema = z.object({
  id: UuidSchema,
  productId: UuidSchema,
  warehouseId: UuidSchema,
  projectId: UuidSchema,
  qty: DecimalStringSchema,
  status: z.string(),
});
export const StockReservationResponseSchema = apiDataEnvelope(StockReservationDataSchema);

export const TransferBatchAllocationSchema = z.object({
  lotNo: z.string().min(1).max(160),
  quantity: DecimalStringSchema.refine((value) => Number(value) > 0, 'quantity must be positive'),
});
export const StockTransferCommandSchema = CreateStockTransferRequestSchema.extend({
  items: z.array(z.object({
    productId: UuidSchema,
    quantity: DecimalStringSchema.refine((value) => Number(value) > 0, 'quantity must be positive'),
    serialNumbers: z.array(z.string().min(1).max(200)).optional(),
    batches: z.array(TransferBatchAllocationSchema).optional(),
  })).min(1),
});
export const StockTransferDataSchema = z.object({
  id: UuidSchema,
  transferNo: z.string().min(1),
  fromWarehouseId: UuidSchema,
  toWarehouseId: UuidSchema,
  status: z.string(),
});
export const StockTransferResponseSchema = apiDataEnvelope(StockTransferDataSchema);

export const AdjustmentBatchAllocationSchema = z.object({
  lotNo: z.string().min(1).max(160),
  quantity: DecimalStringSchema.refine((value) => Number(value) > 0, 'quantity must be positive'),
  manufactureDate: IsoDateSchema.nullable().optional(),
  expiryDate: IsoDateSchema.nullable().optional(),
});
export const CreateStockAdjustmentSchema = z.object({
  warehouseId: UuidSchema,
  reason: z.string().min(1).max(1000),
  lines: z.array(z.object({
    productId: UuidSchema,
    locationId: UuidSchema.nullable().optional(),
    quantityDelta: DecimalStringSchema.refine((value) => Number(value) !== 0, 'quantityDelta cannot be zero'),
    serialNumbers: z.array(z.string().min(1).max(200)).optional(),
    batches: z.array(AdjustmentBatchAllocationSchema).optional(),
  })).min(1),
});
export const StockAdjustmentDataSchema = z.object({
  id: UuidSchema,
  warehouseId: UuidSchema,
  reason: z.string(),
  status: z.string(),
  approvalRequestId: UuidSchema.nullable(),
});
export const StockAdjustmentResponseSchema = apiDataEnvelope(StockAdjustmentDataSchema);

export const SerialNumberDataSchema = z.object({
  id: UuidSchema,
  productId: UuidSchema,
  serialNo: z.string(),
  status: z.string(),
  currentWarehouseId: UuidSchema.nullable(),
  assetId: UuidSchema.nullable(),
});
export const SerialNumberResponseSchema = apiDataEnvelope(SerialNumberDataSchema);
