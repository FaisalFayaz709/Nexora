import type { PermissionKey } from '@nexora/shared';
import type { EntityColumnConfig } from '@/modules/masters/columns';

export type MaintenanceResourceKey = 'plans' | 'schedule';
export type MaintenanceCommandKey = 'generate-maintenance-work-order' | 'complete-maintenance-execution';

export type MaintenanceCommandConfig = {
  key: MaintenanceCommandKey;
  label: string;
  endpointTemplate: string;
  requiredPermission: PermissionKey;
  idempotent: boolean;
  allowedStates: readonly string[];
  irreversibleEffects: readonly string[];
};

export type MaintenanceResourceConfig = {
  key: MaintenanceResourceKey;
  title: string;
  singularTitle: string;
  routeBase: string;
  endpoint: string;
  viewPermission: PermissionKey;
  createPermission?: PermissionKey;
  updatePermission?: PermissionKey;
  description: string;
  columns: readonly EntityColumnConfig[];
  identityFields: readonly string[];
  profileFields: readonly string[];
  commands: readonly MaintenanceCommandConfig[];
  relatedPanels: readonly { title: string; description: string; href?: string }[];
};

export const MaintenanceCompletionPrinciples = [
  'Preventive maintenance plans define deterministic frequencies, start dates, asset and contract linkage.',
  'Maintenance schedule grids are read-models; generation of work orders is an idempotent command.',
  'Maintenance execution completion waits for service evidence and can create next due schedule.',
  'Parts used in maintenance must create stock ledger entries through backend transaction handling.',
  'Failed/replaced results create warranty/RMA review evidence without bypassing asset lifecycle history.',
  'Workers can scan due schedules, but work-order generation and completion remain service transactions.',
] as const;

export const MaintenanceCommandConfigs = {
  'generate-maintenance-work-order': {
    key: 'generate-maintenance-work-order',
    label: 'Generate work order',
    endpointTemplate: '/maintenance/schedules/:id/generate-work-order',
    requiredPermission: 'maintenance.execute',
    idempotent: true,
    allowedStates: ['DUE', 'SCHEDULED'],
    irreversibleEffects: ['Creates or returns the one generated work order for this schedule.', 'Links maintenance schedule to field-service work-order workflow.'],
  },
  'complete-maintenance-execution': {
    key: 'complete-maintenance-execution',
    label: 'Complete maintenance execution',
    endpointTemplate: '/maintenance/executions/:id/complete',
    requiredPermission: 'maintenance.execute',
    idempotent: true,
    allowedStates: ['IN_PROGRESS', 'PENDING'],
    irreversibleEffects: ['Records maintenance result and parts consumption evidence.', 'Updates next due date and asset maintenance history through backend transaction rules.'],
  },
} satisfies Record<MaintenanceCommandKey, MaintenanceCommandConfig>;

export const MaintenanceResourceConfigs = {
  plans: {
    key: 'plans',
    title: 'Maintenance Plans',
    singularTitle: 'Maintenance Plan',
    routeBase: '/maintenance',
    endpoint: '/maintenance/plans',
    viewPermission: 'maintenance.view',
    createPermission: 'maintenance.create',
    updatePermission: 'maintenance.create',
    description: 'Preventive maintenance configuration linked to asset, optional contract, frequency and checklist policy.',
    columns: [
      { key: 'name', label: 'Plan' },
      { key: 'assetId', label: 'Asset' },
      { key: 'contractId', label: 'Contract' },
      { key: 'frequencyType', label: 'Frequency' },
      { key: 'intervalValue', label: 'Interval' },
      { key: 'active', label: 'Active' },
    ],
    identityFields: ['name', 'assetId', 'contractId', 'frequencyType', 'intervalValue', 'startAt', 'active'],
    profileFields: ['checklistId', 'createdAt', 'updatedAt'],
    commands: [],
    relatedPanels: [
      { title: 'Maintenance schedule', description: 'Plans generate schedule occurrences that can become work orders.', href: '/maintenance/schedule' },
      { title: 'Asset warranty and RMA', description: 'Failed/replaced maintenance can trigger warranty/RMA review linked to asset lifecycle.' },
    ],
  },
  schedule: {
    key: 'schedule',
    title: 'Maintenance Schedule',
    singularTitle: 'Maintenance Schedule',
    routeBase: '/maintenance/schedule',
    endpoint: '/maintenance/schedule',
    viewPermission: 'maintenance.view',
    description: 'Upcoming and due maintenance occurrences. Generation of work orders is command-only and idempotent.',
    columns: [
      { key: 'dueAt', label: 'Due at' },
      { key: 'assetId', label: 'Asset' },
      { key: 'status', label: 'Status' },
      { key: 'generatedWorkOrderId', label: 'Generated work order' },
    ],
    identityFields: ['dueAt', 'assetId', 'status', 'generatedWorkOrderId'],
    profileFields: ['maintenancePlanId', 'branchId', 'siteId', 'generatedAt', 'completedAt'],
    commands: [MaintenanceCommandConfigs['generate-maintenance-work-order']],
    relatedPanels: [
      { title: 'Generate work order', description: 'Due schedule creates one field-service work order through an idempotent command.' },
      { title: 'Execution completion', description: 'Completion captures result, parts and next schedule after service execution.', href: '/maintenance/executions/[id]/complete' },
    ],
  },
} satisfies Record<MaintenanceResourceKey, MaintenanceResourceConfig>;

export function getMaintenanceResourceConfig(key: MaintenanceResourceKey): MaintenanceResourceConfig {
  return MaintenanceResourceConfigs[key];
}

export function getMaintenanceCommandConfig(key: MaintenanceCommandKey): MaintenanceCommandConfig {
  return MaintenanceCommandConfigs[key];
}
