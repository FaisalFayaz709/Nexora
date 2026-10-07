import { PlatformResourceDetail } from '@/modules/platform/platform-resource-detail';
import { getPlatformResourceConfig } from '@/modules/platform/platform-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <PlatformResourceDetail resource={getPlatformResourceConfig('saas-usage')} recordId={params.id} />;
}
