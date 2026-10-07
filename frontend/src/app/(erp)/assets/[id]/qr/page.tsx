import { AssetScopedSurface } from '@/modules/assets/asset-scoped-surface';
import { getAssetScopedSurfaceConfig } from '@/modules/assets/asset-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <AssetScopedSurface assetId={params.id} surface={getAssetScopedSurfaceConfig('qr')} />;
}
