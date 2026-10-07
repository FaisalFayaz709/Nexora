import { AssetResourceFormPage } from '@/modules/assets/asset-resource-form-page';
import { getAssetResourceConfig } from '@/modules/assets/asset-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <AssetResourceFormPage resource={getAssetResourceConfig('assets')} mode="edit" recordId={params.id} />;
}
