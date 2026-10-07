import { EntityList } from '@/modules/masters/entity-list';

export default function ApprovalsPage() {
  return (
    <EntityList
      title="Approval Inbox"
      endpoint="/approvals/inbox"
      columns={[
        { key: 'subjectType', label: 'Subject' },
        { key: 'subjectId', label: 'Subject ID' },
        { key: 'definitionName', label: 'Workflow' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
