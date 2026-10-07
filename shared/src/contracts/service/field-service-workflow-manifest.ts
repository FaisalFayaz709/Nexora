export const C8_FIELD_SERVICE_TECHNICIAN_FLOW = 'C8_FIELD_SERVICE_TECHNICIAN_FLOW' as const;

export const FieldServiceLockedWorkflowStages = [
  'CUSTOMER_OR_EMPLOYEE_TICKET_CREATED',
  'SLA_POLICY_ASSIGNED_AT_TICKET_OPEN',
  'TICKET_ASSIGNED_TO_OWNER_OR_TECHNICIAN',
  'WORK_ORDER_CREATED_FROM_TICKET_OR_MAINTENANCE',
  'WORK_ORDER_VALIDATED_AND_ASSIGNED',
  'TECHNICIAN_ACCEPTS_ASSIGNED_WORK_ORDER',
  'TECHNICIAN_STARTS_TRAVEL',
  'TECHNICIAN_CHECKS_IN_ON_SITE_WITH_OPTIONAL_LOCATION_AND_PHOTO_PROOF',
  'TECHNICIAN_RECORDS_DIAGNOSIS_AND_WORK_IN_PROGRESS',
  'SERVICE_REPORT_CAPTURES_WORK_ROOT_CAUSE_RESOLUTION_PHOTOS_SIGNATURES_AND_PARTS',
  'TECHNICIAN_CHECKS_OUT_WITH_POLICY_CONTROLLED_SIGNATURE_OR_PHOTO',
  'WORK_ORDER_COMPLETION_CONSUMES_PARTS_UPDATES_ASSET_HISTORY_AND_CLOSE_STATE_ATOMICALLY',
  'TICKET_RESOLUTION_OR_CUSTOMER_CONFIRMED_CLOSE',
] as const;

export const FieldServiceCommandEndpointManifest = [
  'GET /api/v1/tickets',
  'POST /api/v1/tickets',
  'PATCH /api/v1/tickets/:id',
  'POST /api/v1/tickets/:id/assign',
  'POST /api/v1/tickets/:id/resolve',
  'POST /api/v1/tickets/:id/close',
  'GET /api/v1/work-orders',
  'POST /api/v1/work-orders',
  'PATCH /api/v1/work-orders/:id',
  'POST /api/v1/work-orders/:id/assign',
  'POST /api/v1/work-orders/:id/accept',
  'POST /api/v1/work-orders/:id/start-travel',
  'POST /api/v1/work-orders/:id/arrive',
  'POST /api/v1/work-orders/:id/start',
  'POST /api/v1/work-orders/:id/check-in',
  'POST /api/v1/work-orders/:id/location',
  'POST /api/v1/work-orders/:id/check-out',
  'POST /api/v1/work-orders/:id/service-report',
  'POST /api/v1/work-orders/:id/complete',
] as const;

export const FieldServiceAtomicTransactionRules = [
  'TICKET_CREATE_WITH_SLA_AUDIT_AND_EVENT_IS_TRANSACTIONAL',
  'WORK_ORDER_ASSIGNMENT_UPDATES_TECHNICIAN_AVAILABILITY_AND_TICKET_FIRST_RESPONSE_TRANSACTIONALLY',
  'SERVICE_REPORT_COMPLETION_CONSUMES_SPARE_PARTS_AND_WRITES_ASSET_HISTORY_IN_ONE_TRANSACTION',
  'WORK_ORDER_CLOSE_REQUIRES_CUSTOMER_CONFIRMATION_AND_COMPLETED_VISIT_EVIDENCE',
  'LOCATION_COLLECTION_IS_TENANT_POLICY_CONTROLLED_AND_RETENTION_SCOPED',
  'NO_BULLMQ_FOR_WORK_ORDER_STATUS_PART_CONSUMPTION_ASSET_HISTORY_OR_TICKET_CLOSE_MUTATION',
] as const;

export const FieldServicePolicyMarkers = [
  'assigned-technician-only-command-scope',
  'sla-response-and-resolution-deadlines',
  'accepted-assignment-required-before-travel-onsite-start',
  'active-service-visit-required-for-location-pings',
  'check-out-required-before-final-completion',
  'customer-signature-and-photo-proof-driven-by-tenant-policy',
  'serialized-spare-parts-use-asset-install-or-replacement-workflow',
  'batch-tracked-service-parts-require-lot-allocations',
  'service-parts-consumption-is-not-async',
] as const;

export type FieldServiceLockedWorkflowStage = (typeof FieldServiceLockedWorkflowStages)[number];
export type FieldServiceCommandEndpoint = (typeof FieldServiceCommandEndpointManifest)[number];
