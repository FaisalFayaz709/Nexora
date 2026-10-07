import { ServiceScopedSurface } from '@/modules/service/service-scoped-surface';
import { getServiceScopedSurfaceConfig } from '@/modules/service/service-resource-config';

export default function Page({ params }: { params: { id: string } }) {
  return <ServiceScopedSurface workOrderId={params.id} surface={getServiceScopedSurfaceConfig('assignment')} />;
}
