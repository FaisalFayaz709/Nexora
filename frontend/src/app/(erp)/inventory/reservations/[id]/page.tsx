import { InventoryResourceDetail } from '@/modules/inventory/inventory-resource-detail';
import { getInventoryResourceConfig } from '@/modules/inventory/inventory-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <InventoryResourceDetail resource={getInventoryResourceConfig('reservations')} recordId={params.id} />;
}
