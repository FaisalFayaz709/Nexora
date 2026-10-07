import { InventoryWorkflowWorkbench } from './inventory-workflow-workbench';
import { getInventoryResourceConfig } from './inventory-resource-config';

export function StockReservationList() {
  return <InventoryWorkflowWorkbench resource={getInventoryResourceConfig('reservations')} />;
}

export function StockTransferList() {
  return <InventoryWorkflowWorkbench resource={getInventoryResourceConfig('transfers')} />;
}

export function StockAdjustmentList() {
  return <InventoryWorkflowWorkbench resource={getInventoryResourceConfig('adjustments')} />;
}

export function SerialLookupNotice() {
  return <InventoryWorkflowWorkbench resource={getInventoryResourceConfig('serial-lookup')} />;
}
