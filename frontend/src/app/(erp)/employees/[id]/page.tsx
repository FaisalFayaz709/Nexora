import { BusinessMasterDetail } from '@/modules/masters/business-master-detail';
import { getBusinessMasterConfig } from '@/modules/masters/business-master-config';

export default function Page({ params }: { params: { id: string } }) {
  const resource = getBusinessMasterConfig('employees');
  return <BusinessMasterDetail resource={resource} recordId={params.id} />;
}
