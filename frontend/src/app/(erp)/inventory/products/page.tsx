import { InventoryResourceList } from '@/modules/inventory/inventory-resource-list';
import { getInventoryResourceConfig } from '@/modules/inventory/inventory-resource-config';

export default function Page() {
  return <InventoryResourceList resource={getInventoryResourceConfig('products')} />;
}
