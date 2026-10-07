import { EntityList } from '@/modules/masters/entity-list';
export default function PayrollRunsPage() {
  return <EntityList title="Payroll Runs" endpoint="/payroll-runs" columns={[{ key: 'payrollNo', label: 'Payroll No' }, { key: 'periodStart', label: 'Start' }, { key: 'periodEnd', label: 'End' }, { key: 'status', label: 'Status' }, { key: 'netTotal', label: 'Net Total' }]} />;
}
