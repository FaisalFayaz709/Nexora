import type { EntityColumnConfig } from '@/modules/masters/columns';

export const projectColumns: EntityColumnConfig[] = [
  { key: 'projectNo', label: 'Project No' },
  { key: 'name', label: 'Project' },
  { key: 'customerId', label: 'Customer' },
  { key: 'managerId', label: 'Manager' },
  { key: 'status', label: 'Status' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'contractValue', label: 'Contract Value' },
];

export const projectTaskColumns: EntityColumnConfig[] = [
  { key: 'title', label: 'Task' },
  { key: 'projectId', label: 'Project' },
  { key: 'assigneeId', label: 'Assignee' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'completionPct', label: 'Completion %' },
];

export const projectsColumnSets = {
  projectColumns,
  projectTaskColumns,
} as const;
