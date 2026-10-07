import { InventoryResourceFormPage } from '@/modules/inventory/inventory-resource-form-page';
import { getInventoryResourceConfig } from '@/modules/inventory/inventory-resource-config';

export default function Page() {
  return <InventoryResourceFormPage mode="create" resource={getInventoryResourceConfig('warehouse-locations')} />;
}
