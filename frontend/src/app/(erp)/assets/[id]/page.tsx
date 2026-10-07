import { AssetResourceDetail } from '@/modules/assets/asset-resource-detail';
import { getAssetResourceConfig } from '@/modules/assets/asset-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <AssetResourceDetail resource={getAssetResourceConfig('assets')} recordId={params.id} />;
}
