import { describe, expect, it } from 'vitest';
import { AppError } from '../../core/http/errors.js';
import {
  assertServicePartTracking,
  assertVisitLocationPolicy,
  assertWorkOrderCompletionAllowed,
} from './field-service-workflow-policy.js';

function expectAppErrorCode(action: () => void, code: string) {
  try {
    action();
    throw new Error(`Expected AppError ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
  }
}

describe('Field-service locked workflow policy invariants', () => {
  it('requires customer confirmation before work-order completion', () => {
    expectAppErrorCode(
      () =>
        assertWorkOrderCompletionAllowed({
          status: 'WORK_IN_PROGRESS',
          acceptedAssignment: true,
          reportIsDraft: true,
          reportTechnicianMatchesAssignment: true,
          completedVisitExists: true,
          customerConfirmed: false,
        }),
      'WORK_ORDER_CUSTOMER_CONFIRMATION_REQUIRED',
    );
  });

  it('requires technician check-out evidence before work-order completion', () => {
    expectAppErrorCode(
      () =>
        assertWorkOrderCompletionAllowed({
          status: 'WORK_IN_PROGRESS',
          acceptedAssignment: true,
          reportIsDraft: true,
          reportTechnicianMatchesAssignment: true,
          completedVisitExists: false,
          customerConfirmed: true,
        }),
      'WORK_ORDER_CHECKOUT_REQUIRED',
    );
  });

  it('blocks anonymous consumption of serial-tracked equipment as service parts', () => {
    expectAppErrorCode(
      () => assertServicePartTracking({ productId: 'camera', trackingType: 'SERIAL', batchCount: 0 }),
      'SERVICE_SERIAL_PART_REQUIRES_ASSET_WORKFLOW',
    );
  });

  it('blocks GPS collection when tenant policy disables technician location capture', () => {
    expectAppErrorCode(
      () =>
        assertVisitLocationPolicy(
          { locationEnabled: false, requirePhotoProof: false, requireCustomerSignature: false, retentionDays: 30 },
          true,
        ),
      'TECHNICIAN_LOCATION_COLLECTION_DISABLED',
    );
  });
});
