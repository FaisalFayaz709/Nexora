import { InventoryResourceList } from './inventory-resource-list';
import { getInventoryResourceConfig } from './inventory-resource-config';

export function StockBalanceList() {
  return <InventoryResourceList resource={getInventoryResourceConfig('stock-balances')} />;
}

export function StockLedgerList() {
  return <InventoryResourceList resource={getInventoryResourceConfig('stock-ledger')} />;
}
