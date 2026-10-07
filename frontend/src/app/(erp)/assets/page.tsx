import { AssetResourceList } from '@/modules/assets/asset-resource-list';
import { getAssetResourceConfig } from '@/modules/assets/asset-resource-config';

export default function AssetsPage() {
  return <AssetResourceList resource={getAssetResourceConfig('assets')} />;
}
