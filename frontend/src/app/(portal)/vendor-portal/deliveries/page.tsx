import { PortalResourcePage } from '@/modules/portals/portal-resource-page';
import { getPortalResourceConfig } from '@/modules/portals/portal-resource-config';

export default function Page() {
  return <PortalResourcePage resource={getPortalResourceConfig('vendor-deliveries')} />;
}
