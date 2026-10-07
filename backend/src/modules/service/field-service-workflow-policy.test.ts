import { describe, expect, it } from 'vitest';
import {
  assertActiveVisitRequired,
  assertNoAsyncFieldServiceCriticalMutation,
  assertServicePartTracking,
  assertServiceReportAllowed,
  assertServiceReportTimeWindow,
  assertTicketAssetPlacement,
  assertTicketAssignable,
  assertTicketClosable,
  assertTicketResolvable,
  assertTechnicianAssignmentScope,
  assertVisitCheckInAllowed,
  assertVisitCheckOutAllowed,
  assertVisitLocationPolicy,
  assertWorkOrderAssignable,
  assertWorkOrderCompletionAllowed,
  FieldServiceTransactionBoundaries,
  nextTechnicianCommandStatus,
} from './field-service-workflow-policy.js';

const policy = { locationEnabled: true, requirePhotoProof: false, requireCustomerSignature: false, retentionDays: 30 };

describe('C8 field-service workflow policy', () => {
  it('C8-FIELD-SERVICE-TICKET-ASSET-PLACEMENT: ties a ticket to the same customer site asset', () => {
    expect(() => assertTicketAssetPlacement({ assetCustomerId: 'c1', assetSiteId: 's1', ticketCustomerId: 'c1', ticketSiteId: 's1' })).not.toThrow();
    expect(() => assertTicketAssetPlacement({ assetCustomerId: 'c1', assetSiteId: 's2', ticketCustomerId: 'c1', ticketSiteId: 's1' })).toThrow('Ticket asset must belong');
  });

  it('C8-FIELD-SERVICE-TICKET-ASSIGN-RESOLVE-CLOSE: enforces ticket lifecycle commands', () => {
    expect(() => assertTicketAssignable('OPEN')).not.toThrow();
    expect(() => assertTicketAssignable('CLOSED')).toThrow('Only OPEN or ASSIGNED');
    expect(() => assertTicketResolvable('WAITING_VENDOR')).not.toThrow();
    expect(() => assertTicketResolvable('OPEN')).toThrow('not in a resolvable state');
    expect(() => assertTicketClosable('RESOLVED', true)).not.toThrow();
    expect(() => assertTicketClosable('ASSIGNED', true)).toThrow('must be RESOLVED');
  });

  it('C8-FIELD-SERVICE-WORK-ORDER-ASSIGN-ACCEPT-TRAVEL-ONSITE-START: preserves canonical transitions', () => {
    expect(() => assertWorkOrderAssignable('NEW')).not.toThrow();
    expect(() => assertWorkOrderAssignable('TECHNICIAN_ACCEPTED')).toThrow('before technician acceptance');
    expect(nextTechnicianCommandStatus('start-travel', 'TECHNICIAN_ACCEPTED')).toBe('TRAVELLING');
    expect(nextTechnicianCommandStatus('arrive', 'TRAVELLING')).toBe('ON_SITE');
    expect(nextTechnicianCommandStatus('start', 'ON_SITE')).toBe('WORK_IN_PROGRESS');
    expect(() => nextTechnicianCommandStatus('arrive', 'ASSIGNED')).toThrow('while travelling');
  });

  it('C8-FIELD-SERVICE-TECHNICIAN-SCOPE: restricts technician-only commands to assigned technician', () => {
    expect(() => assertTechnicianAssignmentScope({ assignedTechnicianId: 'emp-1', actorEmployeeId: 'emp-1' })).not.toThrow();
    expect(() => assertTechnicianAssignmentScope({ assignedTechnicianId: 'emp-2', actorEmployeeId: 'emp-1' })).toThrow('restricted to the currently assigned technician');
  });

  it('C8-FIELD-SERVICE-SERVICE-REPORT-PARTS: validates service report state, time and part tracking', () => {
    expect(() => assertServiceReportAllowed('WORK_IN_PROGRESS')).not.toThrow();
    expect(() => assertServiceReportAllowed('ASSIGNED')).toThrow('during onsite service');
    expect(() => assertServiceReportTimeWindow(new Date('2026-09-05T10:00:00Z'), new Date('2026-09-05T11:00:00Z'))).not.toThrow();
    expect(() => assertServiceReportTimeWindow(new Date('2026-09-05T11:00:00Z'), new Date('2026-09-05T10:00:00Z'))).toThrow('departure time cannot precede');
    expect(() => assertServicePartTracking({ productId: 'p1', trackingType: 'SERIAL', batchCount: 0 })).toThrow('Asset install/replace workflow');
    expect(() => assertServicePartTracking({ productId: 'p2', trackingType: 'BATCH', batchCount: 0 })).toThrow('Batch-tracked');
  });

  it('C8-FIELD-SERVICE-VISIT-PROOF: enforces visit, location, photo and signature controls', () => {
    expect(() => assertVisitLocationPolicy({ ...policy, locationEnabled: false }, true)).toThrow('GPS collection');
    expect(() => assertVisitCheckInAllowed({ status: 'TECHNICIAN_ACCEPTED', activeVisitExists: false, policy: { ...policy, requirePhotoProof: true }, hasLocation: true, hasPhotoProof: false })).toThrow('photo proof');
    expect(() => assertActiveVisitRequired(null)).toThrow('active checked-in service visit');
    expect(() => assertVisitCheckOutAllowed({ policy: { ...policy, requireCustomerSignature: true }, hasLocation: true, hasPhotoProof: false, hasCustomerSignature: false, checkedInAt: new Date('2026-09-05T10:00:00Z'), checkedOutAt: new Date('2026-09-05T11:00:00Z') })).toThrow('customer signature');
  });

  it('C8-FIELD-SERVICE-COMPLETION-ATOMICITY: gates final close on report, visit, customer and assignment evidence', () => {
    expect(() => assertWorkOrderCompletionAllowed({ status: 'WORK_IN_PROGRESS', acceptedAssignment: true, reportIsDraft: true, reportTechnicianMatchesAssignment: true, completedVisitExists: true, customerConfirmed: true })).not.toThrow();
    expect(() => assertWorkOrderCompletionAllowed({ status: 'ON_SITE', acceptedAssignment: true, reportIsDraft: true, reportTechnicianMatchesAssignment: true, completedVisitExists: true, customerConfirmed: true })).toThrow('active work state');
    expect(() => assertWorkOrderCompletionAllowed({ status: 'WORK_IN_PROGRESS', acceptedAssignment: true, reportIsDraft: true, reportTechnicianMatchesAssignment: true, completedVisitExists: false, customerConfirmed: true })).toThrow('check out');
  });

  it('C8-FIELD-SERVICE-NO-ASYNC-CRITICAL-MUTATION: documents allowed transaction boundaries', () => {
    expect(FieldServiceTransactionBoundaries.map((item) => item.name)).toContain('work-order-completion');
    expect(() => assertNoAsyncFieldServiceCriticalMutation(['email-after-commit'])).not.toThrow();
    expect(() => assertNoAsyncFieldServiceCriticalMutation(['stock-consumption-async'])).toThrow('must remain in one PostgreSQL transaction');
  });
});
