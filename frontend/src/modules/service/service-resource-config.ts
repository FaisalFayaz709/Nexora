import type { PermissionKey } from '@nexora/shared';
import type { EntityColumnConfig } from '@/modules/masters/columns';

export type ServiceResourceKey = 'tickets' | 'work-orders';
export type ServiceScopedSurfaceKey = 'assignment' | 'service-report' | 'parts-used' | 'technician-timeline' | 'sla';
export type ServiceCommandKey =
  | 'assign-ticket'
  | 'resolve-ticket'
  | 'close-ticket'
  | 'assign-work-order'
  | 'accept-work-order'
  | 'start-work-order-travel'
  | 'arrive-work-order'
  | 'start-work-order'
  | 'create-service-report'
  | 'complete-work-order'
  | 'check-in-work-order'
  | 'location-work-order'
  | 'check-out-work-order';

export type ServiceCommandConfig = {
  key: ServiceCommandKey;
  label: string;
  endpointTemplate: string;
  requiredPermission: PermissionKey;
  idempotent: boolean;
  allowedStates: readonly string[];
  destructive?: boolean;
  irreversibleEffects: readonly string[];
};

export type ServiceResourceConfig = {
  key: ServiceResourceKey;
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
  relatedPanels: readonly { title: string; description: string; href?: string }[];
  commands: readonly ServiceCommandConfig[];
};

export type ServiceScopedSurfaceConfig = {
  key: ServiceScopedSurfaceKey;
  title: string;
  description: string;
  endpointTemplate: string;
  requiredPermission: PermissionKey;
  command?: ServiceCommandKey;
  auditFocus: readonly string[];
};

export const ServiceCompletionPrinciples = [
  'Tickets and work orders are lifecycle records, not isolated CRUD rows.',
  'Ticket assignment, resolution and closure use explicit Fastify command endpoints and customer-confirmation rules.',
  'Work-order assignment, technician accept/travel/arrival/start/complete transitions are status-aware commands.',
  'Service reports and parts usage are captured through the work-order command surface; parts consumption must create inventory transactions server-side.',
  'Technician actions are tenant, branch, assignment and permission scoped by the backend.',
  'Offline technician commands are replayed through /api/v1/portal/technician/offline-sync with idempotency and conflict handling.',
  'PDF generation, notifications and analytics can be queued after commit; status, stock, asset history and audit remain transaction-bound.',
] as const;

export const ServiceResourceConfigs = {
  tickets: {
    key: 'tickets',
    title: 'Service Tickets',
    singularTitle: 'Ticket',
    routeBase: '/tickets',
    endpoint: '/tickets',
    viewPermission: 'ticket.view',
    createPermission: 'ticket.create',
    updatePermission: 'ticket.update',
    description: 'Customer or internal support request. Assignment, resolution and closure remain explicit backend commands with SLA and audit evidence.',
    columns: [
      { key: 'ticketNo', label: 'Ticket No' },
      { key: 'subject', label: 'Subject' },
      { key: 'category', label: 'Category' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' },
      { key: 'assetId', label: 'Asset' },
      { key: 'assignedToId', label: 'Assigned To' },
    ],
    identityFields: ['ticketNo', 'subject', 'category', 'priority', 'status'],
    profileFields: ['customerId', 'siteId', 'assetId', 'openedById', 'assignedToId', 'slaPolicyId', 'createdAt', 'updatedAt'],
    relatedPanels: [
      { title: 'SLA tracking', description: 'Priority drives response/resolution SLA and breach visibility.', href: '/service/field-operations' },
      { title: 'Work orders', description: 'Validated tickets create work orders for technician dispatch and service evidence.', href: '/work-orders/create' },
      { title: 'Customer confirmation', description: 'Closure remains command-controlled and can require customer confirmation/signature.' },
    ],
    commands: [
      { key: 'assign-ticket', label: 'Assign ticket', endpointTemplate: '/tickets/:id/assign', requiredPermission: 'ticket.assign', idempotent: true, allowedStates: ['OPEN', 'ASSIGNED'], irreversibleEffects: ['Records assignment and notification evidence.', 'Starts or updates SLA/ownership routing.'] },
      { key: 'resolve-ticket', label: 'Resolve ticket', endpointTemplate: '/tickets/:id/resolve', requiredPermission: 'ticket.resolve', idempotent: true, allowedStates: ['IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_VENDOR'], irreversibleEffects: ['Records resolution notes.', 'Moves the ticket toward customer confirmation/closure.'] },
      { key: 'close-ticket', label: 'Close ticket', endpointTemplate: '/tickets/:id/close', requiredPermission: 'ticket.close', idempotent: true, allowedStates: ['RESOLVED'], destructive: true, irreversibleEffects: ['Closes the customer support request through customer-confirmation rules.', 'Creates final audit evidence.'] },
    ],
  },
  'work-orders': {
    key: 'work-orders',
    title: 'Work Orders',
    singularTitle: 'Work Order',
    routeBase: '/work-orders',
    endpoint: '/work-orders',
    viewPermission: 'workorder.view',
    createPermission: 'workorder.create',
    updatePermission: 'workorder.update',
    description: 'Field job connecting tickets, assets, technicians, service reports, parts usage, customer confirmation and asset history.',
    columns: [
      { key: 'workOrderNo', label: 'Work Order' },
      { key: 'ticketId', label: 'Ticket' },
      { key: 'assetId', label: 'Asset' },
      { key: 'projectId', label: 'Project' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' },
      { key: 'scheduledAt', label: 'Scheduled' },
    ],
    identityFields: ['workOrderNo', 'ticketId', 'assetId', 'projectId', 'priority', 'status', 'scheduledAt'],
    profileFields: ['technicianId', 'customerId', 'siteId', 'branchId', 'createdAt', 'updatedAt', 'closedAt'],
    relatedPanels: [
      { title: 'Technician assignment', description: 'Assign only eligible technicians and expose technician acceptance/travel status.', href: '/service/field-operations' },
      { title: 'Service report and parts', description: 'Work performed, root cause, photos, signatures and parts used are captured before closure.', href: '/work-orders/[id]/service-report' },
      { title: 'Asset service history', description: 'Completion writes asset/service history through backend facades, not frontend-local state.' },
    ],
    commands: [
      { key: 'assign-work-order', label: 'Assign technician', endpointTemplate: '/work-orders/:id/assign', requiredPermission: 'workorder.assign', idempotent: true, allowedStates: ['NEW', 'VALIDATED'], irreversibleEffects: ['Creates technician assignment evidence and notification.', 'Locks the assignment path to the selected technician scope.'] },
      { key: 'accept-work-order', label: 'Technician accept', endpointTemplate: '/work-orders/:id/accept', requiredPermission: 'workorder.accept', idempotent: true, allowedStates: ['ASSIGNED'], irreversibleEffects: ['Records technician acceptance and dispatch readiness.'] },
      { key: 'start-work-order-travel', label: 'Start travel', endpointTemplate: '/work-orders/:id/start-travel', requiredPermission: 'workorder.update', idempotent: true, allowedStates: ['TECHNICIAN_ACCEPTED'], irreversibleEffects: ['Records travel status and optional route/visit evidence.'] },
      { key: 'arrive-work-order', label: 'Mark onsite', endpointTemplate: '/work-orders/:id/arrive', requiredPermission: 'workorder.update', idempotent: true, allowedStates: ['TRAVELLING'], irreversibleEffects: ['Records onsite arrival and visit evidence.'] },
      { key: 'start-work-order', label: 'Start work', endpointTemplate: '/work-orders/:id/start', requiredPermission: 'workorder.update', idempotent: true, allowedStates: ['ON_SITE', 'DIAGNOSIS'], irreversibleEffects: ['Starts field-work execution and status history.'] },
      { key: 'check-in-work-order', label: 'Check in', endpointTemplate: '/work-orders/:id/check-in', requiredPermission: 'workorder.update', idempotent: true, allowedStates: ['TRAVELLING', 'ON_SITE'], irreversibleEffects: ['Records tenant-policy controlled visit proof and optional GPS/photo evidence.'] },
      { key: 'location-work-order', label: 'Record location ping', endpointTemplate: '/work-orders/:id/location', requiredPermission: 'workorder.update', idempotent: true, allowedStates: ['ON_SITE', 'DIAGNOSIS', 'WORK_IN_PROGRESS'], irreversibleEffects: ['Records tenant-policy controlled GPS route evidence for the active service visit.'] },
      { key: 'create-service-report', label: 'Create service report', endpointTemplate: '/work-orders/:id/service-report', requiredPermission: 'workorder.update', idempotent: true, allowedStates: ['WORK_IN_PROGRESS', 'WAITING_FOR_PART', 'RESOLVED'], irreversibleEffects: ['Captures root cause, resolution, photos/signatures and parts used.', 'Parts usage must be applied by backend stock transaction rules.'] },
      { key: 'check-out-work-order', label: 'Check out', endpointTemplate: '/work-orders/:id/check-out', requiredPermission: 'workorder.update', idempotent: true, allowedStates: ['RESOLVED', 'CUSTOMER_CONFIRMATION'], irreversibleEffects: ['Records departure/customer signature evidence under tenant privacy policy.'] },
      { key: 'complete-work-order', label: 'Complete work order', endpointTemplate: '/work-orders/:id/complete', requiredPermission: 'workorder.close', idempotent: true, allowedStates: ['RESOLVED', 'CUSTOMER_CONFIRMATION'], destructive: true, irreversibleEffects: ['Closes the work order after service report/customer confirmation.', 'Commits service report, parts consumption, asset history and audit atomically where required.'] },
    ],
  },
} satisfies Record<ServiceResourceKey, ServiceResourceConfig>;

export const ServiceScopedSurfaceConfigs = {
  assignment: {
    key: 'assignment',
    title: 'Technician assignment',
    description: 'Assign and dispatch technicians with permission, branch and availability checks.',
    endpointTemplate: '/work-orders/:id/assign',
    requiredPermission: 'workorder.assign',
    command: 'assign-work-order',
    auditFocus: ['Technician identity is backend resolved.', 'Assignment creates audit and notification evidence.'],
  },
  'service-report': {
    key: 'service-report',
    title: 'Service report',
    description: 'Capture work performed, root cause, resolution, before/after photos, signatures and completion evidence.',
    endpointTemplate: '/work-orders/:id/service-report',
    requiredPermission: 'workorder.update',
    command: 'create-service-report',
    auditFocus: ['Photos/signatures are document ids from MinIO-backed document storage.', 'Report completion feeds customer-visible history and PDF generation after commit.'],
  },
  'parts-used': {
    key: 'parts-used',
    title: 'Parts used',
    description: 'Capture service parts that the backend converts into stock transactions and asset/service history.',
    endpointTemplate: '/work-orders/:id/service-report',
    requiredPermission: 'workorder.update',
    command: 'create-service-report',
    auditFocus: ['Parts consumption cannot be a frontend-only decrement.', 'Stock ledger rows and audit must be produced transactionally server-side.'],
  },
  'technician-timeline': {
    key: 'technician-timeline',
    title: 'Technician timeline',
    description: 'Show accept/travel/onsite/start/resolve/customer-confirmation sequence for the assigned technician.',
    endpointTemplate: '/work-orders/:id',
    requiredPermission: 'workorder.view',
    auditFocus: ['Timeline reads are permission filtered.', 'Offline replay events appear in the same chronological history.'],
  },
  sla: {
    key: 'sla',
    title: 'SLA tracking',
    description: 'Expose response/resolution SLA status, breach state and priority escalation evidence.',
    endpointTemplate: '/tickets/:id',
    requiredPermission: 'ticket.view',
    auditFocus: ['SLA is deterministic business logic.', 'Breach updates are auditable and reportable.'],
  },
} satisfies Record<ServiceScopedSurfaceKey, ServiceScopedSurfaceConfig>;

export function getServiceResourceConfig(key: ServiceResourceKey): ServiceResourceConfig {
  return ServiceResourceConfigs[key];
}

export function getServiceScopedSurfaceConfig(key: ServiceScopedSurfaceKey): ServiceScopedSurfaceConfig {
  return ServiceScopedSurfaceConfigs[key];
}
