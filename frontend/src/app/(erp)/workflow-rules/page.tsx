import { EntityList } from '@/modules/masters/entity-list';

export default function WorkflowRulesPage() {
  return (
    <EntityList
      title="Workflow & Fraud Control Rules"
      endpoint="/workflow-rules"
      columns={[
        { key: 'triggerType', label: 'Trigger' },
        { key: 'subjectType', label: 'Subject' },
        { key: 'name', label: 'Rule' },
        { key: 'severity', label: 'Severity' },
        { key: 'active', label: 'Active' },
      ]}
    />
  );
}
