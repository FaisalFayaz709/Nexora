import { MaintenanceScopedCommandPage } from '@/modules/maintenance/maintenance-scoped-command-page';

export default function Page({ params }: { params: { id: string } }) {
  return <MaintenanceScopedCommandPage commandKey="complete-maintenance-execution" recordId={params.id} />;
}
