import { z } from 'zod';

/**
 * Pass C3 manifest for the inventory core. This is browser-safe shared
 * metadata: no Prisma, Fastify, MinIO, Redis, secrets, node APIs or server-only
 * imports are allowed here.
 */
export const InventoryCorePass = 'C3_INVENTORY_CORE' as const;

export const InventoryCoreSubjects = [
  'STOCK_BALANCE',
  'STOCK_LEDGER',
  'STOCK_RESERVATION',
  'STOCK_TRANSFER',
  'STOCK_ADJUSTMENT',
  'SERIAL_NUMBER',
  'BATCH_LOT',
] as const;

export const InventoryCoreCommands = [
  'inventory.reservation.reserve',
  'inventory.reservation.release',
  'inventory.transfer.create',
  'inventory.transfer.dispatch',
  'inventory.transfer.receive',
  'inventory.adjustment.create',
  'inventory.adjustment.post',
  'inventory.serial.lookup',
] as const;

export const InventoryLedgerTypes = [
  'PURCHASE_RECEIPT',
  'STOCK_TRANSFER',
  'PROJECT_ISSUE',
  'PROJECT_RETURN',
  'TECHNICIAN_ISSUE',
  'TECHNICIAN_RETURN',
  'SALES_ISSUE',
  'DAMAGED',
  'ADJUSTMENT',
  'CUSTOMER_INSTALLATION',
] as const;

export const InventoryTrackingTypes = ['NONE', 'SERIAL', 'BATCH'] as const;

export const InventoryTransferStates = ['DRAFT', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'] as const;
export const StockReservationStates = ['ACTIVE', 'RELEASED', 'CONSUMED', 'CANCELLED'] as const;
export const StockAdjustmentStates = ['DRAFT', 'APPROVAL_PENDING', 'APPROVED', 'POSTED', 'CANCELLED'] as const;
export const SerialNumberStates = [
  'AVAILABLE',
  'RESERVED',
  'IN_TRANSIT',
  'ISSUED',
  'INSTALLED',
  'REMOVED',
  'RETIRED',
] as const;

export const InventoryCoreCommandSchema = z.enum(InventoryCoreCommands);
export const InventoryLedgerTypeSchema = z.enum(InventoryLedgerTypes);
export const InventoryTrackingTypeSchema = z.enum(InventoryTrackingTypes);

export const InventoryCoreDefinitionOfDone = [
  'Tenant-owned stock queries always include organizationId from authenticated membership.',
  'Branch-scoped users can mutate only warehouses in their active branch scope.',
  'Stock balances are updated only in PostgreSQL transactions that also write immutable stock ledger entries.',
  'Reservations lock the warehouse aggregate balance and cannot reserve more than free stock.',
  'Stock transfers lock source/destination balances and serial rows before status transitions.',
  'Serial-tracked operations require one unique serial per unit and update serial state atomically.',
  'Batch-tracked operations require batch allocations that reconcile to the command quantity.',
  'Physical stock-count freeze blocks reservation, transfer and adjustment mutations for affected stock.',
  'Critical inventory commands append audit logs and domain events where required.',
  'Inventory logic never uses BullMQ for stock balance, serial, batch or ledger mutations.',
] as const;

export type InventoryCoreSubject = (typeof InventoryCoreSubjects)[number];
export type InventoryCoreCommand = (typeof InventoryCoreCommands)[number];
export type InventoryLedgerType = (typeof InventoryLedgerTypes)[number];
export type InventoryTrackingType = (typeof InventoryTrackingTypes)[number];
