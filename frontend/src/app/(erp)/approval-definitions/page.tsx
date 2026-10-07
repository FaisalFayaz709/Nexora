import { EntityList } from '@/modules/masters/entity-list';

export default function ApprovalDefinitionsPage() {
  return (
    <EntityList
      title="Approval Definitions"
      endpoint="/approval-definitions"
      columns={[
        { key: 'subjectType', label: 'Subject Type' },
        { key: 'name', label: 'Definition' },
        { key: 'active', label: 'Active' },
      ]}
    />
  );
}
