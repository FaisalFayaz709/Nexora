import { EntityList } from '@/modules/masters/entity-list';
export default function LeaveRequestsPage() {
  return <EntityList title="Leave Requests" endpoint="/leave-requests" columns={[{ key: 'employee.name', label: 'Employee' }, { key: 'leaveType.name', label: 'Type' }, { key: 'fromDate', label: 'From' }, { key: 'toDate', label: 'To' }, { key: 'status', label: 'Status' }]} />;
}
