import { InventoryResourceFormPage } from '@/modules/inventory/inventory-resource-form-page';
import { getInventoryResourceConfig } from '@/modules/inventory/inventory-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <InventoryResourceFormPage mode="edit" resource={getInventoryResourceConfig('warehouse-locations')} recordId={params.id} />;
}
