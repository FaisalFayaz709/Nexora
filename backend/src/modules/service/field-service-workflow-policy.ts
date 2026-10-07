import { AppError } from '../../core/http/errors.js';

export const C8_FIELD_SERVICE_TECHNICIAN_FLOW = 'C8_FIELD_SERVICE_TECHNICIAN_FLOW' as const;

export type TicketState = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'WAITING_VENDOR' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
export type WorkOrderState = 'NEW' | 'VALIDATED' | 'ASSIGNED' | 'TECHNICIAN_ACCEPTED' | 'TRAVELLING' | 'ON_SITE' | 'DIAGNOSIS' | 'WORK_IN_PROGRESS' | 'WAITING_FOR_PART' | 'RESOLVED' | 'CUSTOMER_CONFIRMATION' | 'CLOSED' | 'CANCELLED';
export type ServiceProductTrackingType = 'NONE' | 'SERIAL' | 'BATCH';

export type TechnicianVisitPolicy = {
  locationEnabled: boolean;
  requirePhotoProof: boolean;
  requireCustomerSignature: boolean;
  retentionDays: number;
};

export type ServiceReportPartPolicyInput = {
  productId: string;
  trackingType: ServiceProductTrackingType;
  batchCount: number;
};

export type FieldServiceTransactionBoundary = {
  name: string;
  atomicWrites: readonly string[];
  asyncAfterCommit: readonly string[];
};

export const FieldServiceTransactionBoundaries: readonly FieldServiceTransactionBoundary[] = [
  {
    name: 'ticket-create',
    atomicWrites: ['Ticket', 'SlaPolicy lookup', 'AuditLog', 'BusinessEvent(ticket.created)'],
    asyncAfterCommit: ['notification fan-out', 'email where configured'],
  },
  {
    name: 'work-order-assignment',
    atomicWrites: ['WorkOrderAssignment', 'WorkOrder status', 'TechnicianProfile availability', 'Ticket first response', 'AuditLog', 'BusinessEvent(work_order.assigned)'],
    asyncAfterCommit: ['technician notification'],
  },
  {
    name: 'technician-visit-proof',
    atomicWrites: ['ServiceVisit', 'ServiceVisitLocation', 'WorkOrderCheckIn/CheckOut', 'TechnicianRoute', 'TechnicianLocationPing', 'AuditLog'],
    asyncAfterCommit: ['optional dashboard refresh'],
  },
  {
    name: 'work-order-completion',
    atomicWrites: ['ServiceReport finalization', 'ServiceReportPart stock transaction links', 'StockTransaction consumption', 'WorkOrder status close', 'Ticket resolution update', 'TechnicianProfile availability', 'AssetHistory', 'AuditLog', 'BusinessEvent(work_order.completed)'],
    asyncAfterCommit: ['customer service report PDF', 'notification', 'email', 'webhook'],
  },
] as const;

const assignableTicketStates: readonly TicketState[] = ['OPEN', 'ASSIGNED'];
const resolvableTicketStates: readonly TicketState[] = ['ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_VENDOR'];
const assignableWorkOrderStates: readonly WorkOrderState[] = ['NEW', 'VALIDATED', 'ASSIGNED'];
const onsiteReportStates: readonly WorkOrderState[] = ['ON_SITE', 'DIAGNOSIS', 'WORK_IN_PROGRESS', 'WAITING_FOR_PART'];

export function assertTicketAssetPlacement(input: { assetCustomerId: string | null; assetSiteId: string | null; ticketCustomerId: string; ticketSiteId: string }) {
  if (input.assetCustomerId !== input.ticketCustomerId || input.assetSiteId !== input.ticketSiteId) {
    throw new AppError(400, 'TICKET_ASSET_PLACEMENT_INVALID', 'Ticket asset must belong to the selected customer and site.');
  }
}

export function assertTicketAssignable(status: TicketState) {
  if (!assignableTicketStates.includes(status)) {
    throw new AppError(409, 'TICKET_ASSIGN_INVALID_STATE', 'Only OPEN or ASSIGNED tickets can be assigned.', { currentStatus: status });
  }
}

export function assertTicketResolvable(status: TicketState) {
  if (!resolvableTicketStates.includes(status)) {
    throw new AppError(409, 'TICKET_RESOLVE_INVALID_STATE', 'Ticket is not in a resolvable state.', { currentStatus: status });
  }
}

export function assertTicketClosable(status: TicketState, customerConfirmed: boolean) {
  if (status !== 'RESOLVED') {
    throw new AppError(409, 'TICKET_CLOSE_INVALID_STATE', 'Ticket must be RESOLVED before customer-confirmed closure.', { currentStatus: status });
  }
  if (!customerConfirmed) {
    throw new AppError(400, 'TICKET_CUSTOMER_CONFIRMATION_REQUIRED', 'Customer confirmation is required before closing the ticket.');
  }
}

export function assertWorkOrderAssignable(status: WorkOrderState) {
  if (!assignableWorkOrderStates.includes(status)) {
    throw new AppError(409, 'WORK_ORDER_ASSIGN_INVALID_STATE', 'Work order can only be assigned before technician acceptance.', { currentStatus: status });
  }
}

export function assertTechnicianAssignmentScope(input: { assignedTechnicianId: string | null | undefined; actorEmployeeId: string }) {
  if (!input.assignedTechnicianId || input.assignedTechnicianId !== input.actorEmployeeId) {
    throw new AppError(403, 'WORK_ORDER_TECHNICIAN_SCOPE_DENIED', 'This command is restricted to the currently assigned technician.');
  }
}

export function assertAcceptedAssignmentRequired(input: { status: WorkOrderState; acceptedAt: Date | string | null | undefined }) {
  if (input.status !== 'ASSIGNED' || !input.acceptedAt) {
    throw new AppError(409, 'WORK_ORDER_ACCEPTED_ASSIGNMENT_REQUIRED', 'Technician commands require an accepted work-order assignment.');
  }
}

export function nextTechnicianCommandStatus(command: 'start-travel' | 'arrive' | 'start', current: WorkOrderState): WorkOrderState {
  if (command === 'start-travel') {
    if (current !== 'TECHNICIAN_ACCEPTED') throw new AppError(409, 'WORK_ORDER_TRAVEL_INVALID_STATE', 'Travel can start only after technician acceptance.', { currentStatus: current });
    return 'TRAVELLING';
  }
  if (command === 'arrive') {
    if (current !== 'TRAVELLING') throw new AppError(409, 'WORK_ORDER_ARRIVE_INVALID_STATE', 'Arrival can be recorded only while travelling.', { currentStatus: current });
    return 'ON_SITE';
  }
  if (!['ON_SITE', 'WAITING_FOR_PART'].includes(current)) {
    throw new AppError(409, 'WORK_ORDER_START_INVALID_STATE', 'Work can start onsite or resume from WAITING_FOR_PART.', { currentStatus: current });
  }
  return 'WORK_IN_PROGRESS';
}

export function assertServiceReportAllowed(status: WorkOrderState) {
  if (!onsiteReportStates.includes(status)) {
    throw new AppError(409, 'SERVICE_REPORT_INVALID_WORK_ORDER_STATE', 'Service report can only be submitted during onsite service.', { currentStatus: status });
  }
}

export function assertServiceReportTimeWindow(arrivalAt: Date, departureAt: Date) {
  if (departureAt.getTime() < arrivalAt.getTime()) {
    throw new AppError(400, 'SERVICE_REPORT_TIME_WINDOW_INVALID', 'Service report departure time cannot precede arrival time.');
  }
}

export function assertServicePartTracking(input: ServiceReportPartPolicyInput) {
  if (input.trackingType === 'SERIAL') {
    throw new AppError(409, 'SERVICE_SERIAL_PART_REQUIRES_ASSET_WORKFLOW', 'Serialized equipment must use the Asset install/replace workflow.');
  }
  if (input.trackingType === 'BATCH' && input.batchCount <= 0) {
    throw new AppError(400, 'SERVICE_BATCH_ALLOCATION_REQUIRED', 'Batch-tracked service parts require lot allocations.');
  }
}

export function assertVisitCheckInAllowed(input: { status: WorkOrderState; activeVisitExists: boolean; policy: TechnicianVisitPolicy; hasLocation: boolean; hasPhotoProof: boolean }) {
  if (!['TECHNICIAN_ACCEPTED', 'TRAVELLING', 'ON_SITE'].includes(input.status)) {
    throw new AppError(409, 'WORK_ORDER_CHECKIN_INVALID_STATE', 'Technician check-in requires accepted/travelling/onsite work order.', { currentStatus: input.status });
  }
  if (input.activeVisitExists) {
    throw new AppError(409, 'WORK_ORDER_VISIT_ALREADY_OPEN', 'An active service visit already exists for this work order.');
  }
  assertVisitLocationPolicy(input.policy, input.hasLocation);
  if (input.policy.requirePhotoProof && !input.hasPhotoProof) {
    throw new AppError(400, 'TECHNICIAN_VISIT_PHOTO_REQUIRED', 'Tenant policy requires site-arrival photo proof.');
  }
}

export function assertVisitLocationPolicy(policy: TechnicianVisitPolicy, hasLocation: boolean) {
  if (!policy.locationEnabled && hasLocation) {
    throw new AppError(403, 'TECHNICIAN_LOCATION_COLLECTION_DISABLED', 'Tenant policy does not allow technician GPS collection.');
  }
}

export function assertActiveVisitRequired<T>(activeVisit: T): asserts activeVisit is NonNullable<T> {
  if (!activeVisit) {
    throw new AppError(409, 'TECHNICIAN_ACTIVE_VISIT_REQUIRED', 'Location and check-out commands require an active checked-in service visit.');
  }
}

export function assertVisitCheckOutAllowed(input: { policy: TechnicianVisitPolicy; hasLocation: boolean; hasPhotoProof: boolean; hasCustomerSignature: boolean; checkedInAt: Date; checkedOutAt: Date }) {
  assertVisitLocationPolicy(input.policy, input.hasLocation);
  if (input.policy.requirePhotoProof && !input.hasPhotoProof) {
    throw new AppError(400, 'TECHNICIAN_VISIT_PHOTO_REQUIRED', 'Tenant policy requires check-out photo proof.');
  }
  if (input.policy.requireCustomerSignature && !input.hasCustomerSignature) {
    throw new AppError(400, 'TECHNICIAN_CUSTOMER_SIGNATURE_REQUIRED', 'Tenant policy requires customer signature at check-out.');
  }
  if (input.checkedOutAt.getTime() < input.checkedInAt.getTime()) {
    throw new AppError(400, 'TECHNICIAN_CHECKOUT_TIME_INVALID', 'Check-out cannot precede check-in.');
  }
}

export function assertWorkOrderCompletionAllowed(input: { status: WorkOrderState; acceptedAssignment: boolean; reportIsDraft: boolean; reportTechnicianMatchesAssignment: boolean; completedVisitExists: boolean; customerConfirmed: boolean }) {
  if (!input.customerConfirmed) {
    throw new AppError(400, 'WORK_ORDER_CUSTOMER_CONFIRMATION_REQUIRED', 'Customer confirmation is required to close the work order.');
  }
  if (!['WORK_IN_PROGRESS', 'WAITING_FOR_PART'].includes(input.status)) {
    throw new AppError(409, 'WORK_ORDER_COMPLETE_INVALID_STATE', 'Work order must be in active work state before completion.', { currentStatus: input.status });
  }
  if (!input.acceptedAssignment) {
    throw new AppError(409, 'WORK_ORDER_ACCEPTED_ASSIGNMENT_REQUIRED', 'Completion requires an accepted technician assignment.');
  }
  if (!input.reportIsDraft) {
    throw new AppError(409, 'WORK_ORDER_DRAFT_SERVICE_REPORT_REQUIRED', 'Completion requires the selected DRAFT service report.');
  }
  if (!input.reportTechnicianMatchesAssignment) {
    throw new AppError(409, 'WORK_ORDER_SERVICE_REPORT_TECHNICIAN_MISMATCH', 'Service report must belong to the assigned technician.');
  }
  if (!input.completedVisitExists) {
    throw new AppError(409, 'WORK_ORDER_CHECKOUT_REQUIRED', 'Technician must check out from the service visit before completion.');
  }
}

export function assertNoAsyncFieldServiceCriticalMutation(markers: readonly string[]) {
  const forbidden = ['work-order-status-async', 'ticket-close-async', 'stock-consumption-async', 'asset-history-async', 'approval-state-async'];
  for (const marker of markers) {
    if (forbidden.includes(marker)) {
      throw new AppError(500, 'FIELD_SERVICE_ASYNC_CRITICAL_MUTATION_FORBIDDEN', 'Critical field-service, stock and asset-history mutations must remain in one PostgreSQL transaction.');
    }
  }
}
