import { MaintenanceScopedCommandPage } from '@/modules/maintenance/maintenance-scoped-command-page';

export default function Page({ params }: { params: { id: string } }) {
  return <MaintenanceScopedCommandPage commandKey="generate-maintenance-work-order" recordId={params.id} />;
}
