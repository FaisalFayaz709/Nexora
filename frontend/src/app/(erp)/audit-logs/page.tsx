import { PlatformResourceList } from '@/modules/platform/platform-resource-list';
import { getPlatformResourceConfig } from '@/modules/platform/platform-resource-config';

export default function Page() {
  return <PlatformResourceList resource={getPlatformResourceConfig('audit-logs')} />;
}
