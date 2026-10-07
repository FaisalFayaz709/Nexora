import { EntityList } from '@/modules/masters/entity-list';
export default function AttendancePage() {
  return <EntityList title="Attendance" endpoint="/attendance" columns={[{ key: 'workDate', label: 'Date' }, { key: 'employee.name', label: 'Employee' }, { key: 'status', label: 'Status' }, { key: 'checkIn', label: 'Check In' }, { key: 'checkOut', label: 'Check Out' }]} />;
}
