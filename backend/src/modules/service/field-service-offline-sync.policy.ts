import { AppError } from '../../core/http/errors.js';

export const R5_TECHNICIAN_OFFLINE_SYNC_POLICY = 'R5_TECHNICIAN_OFFLINE_SYNC_POLICY' as const;

export type OfflineTechnicianCommandType =
  | 'ACCEPT'
  | 'START_TRAVEL'
  | 'ARRIVE'
  | 'STATUS_CHANGE'
  | 'CHECKLIST_UPDATE'
  | 'CHECK_IN'
  | 'LOCATION'
  | 'START_WORK'
  | 'ADD_PHOTO'
  | 'USE_PART'
  | 'SIGNATURE'
  | 'SERVICE_REPORT'
  | 'CHECK_OUT'
  | 'COMPLETE';

export interface OfflineCommandEnvelope {
  readonly clientCommandId: string;
  readonly workOrderId: string;
  readonly technicianEmployeeId?: string | null;
  readonly type?: OfflineTechnicianCommandType;
  readonly action?: OfflineTechnicianCommandType;
  readonly occurredAt: string;
  readonly payload: Record<string, unknown>;
}

export function offlineCommandType(command: OfflineCommandEnvelope): OfflineTechnicianCommandType {
  const type = command.type ?? command.action;
  if (!type) {
    throw new AppError(400, 'OFFLINE_COMMAND_TYPE_REQUIRED', 'Offline command requires type or legacy action.');
  }
  return type;
}

export function offlineCommandIdempotencyKey(deviceId: string, clientCommandId: string): string {
  return `technician-offline:${deviceId}:${clientCommandId}`;
}

export function assertOfflineTechnicianScope(input: {
  readonly authenticatedTechnicianEmployeeId: string;
  readonly payloadTechnicianEmployeeId?: string | null;
  readonly assignedTechnicianId?: string | null;
  readonly clientCommandId: string;
}): void {
  if (input.payloadTechnicianEmployeeId && input.payloadTechnicianEmployeeId !== input.authenticatedTechnicianEmployeeId) {
    throw new AppError(403, 'OFFLINE_SYNC_TECHNICIAN_PAYLOAD_SCOPE_DENIED', 'Offline command technicianEmployeeId does not match authenticated technician context.', {
      clientCommandId: input.clientCommandId,
    });
  }

  if (!input.assignedTechnicianId || input.assignedTechnicianId !== input.authenticatedTechnicianEmployeeId) {
    throw new AppError(403, 'OFFLINE_SYNC_ASSIGNED_TECHNICIAN_SCOPE_DENIED', 'Offline command is restricted to the technician assigned to this work order.', {
      clientCommandId: input.clientCommandId,
    });
  }
}

export function assertOfflineCommandFresh(input: {
  readonly occurredAt: Date;
  readonly tenantClockAt: Date;
  readonly maxOfflineHours: number;
  readonly clientCommandId: string;
}): void {
  const ageMs = input.tenantClockAt.getTime() - input.occurredAt.getTime();
  const maxMs = input.maxOfflineHours * 60 * 60 * 1000;
  if (Number.isNaN(ageMs) || ageMs < -5 * 60 * 1000) {
    throw new AppError(409, 'OFFLINE_SYNC_COMMAND_CLOCK_INVALID', 'Offline command timestamp is ahead of tenant clock.', {
      clientCommandId: input.clientCommandId,
    });
  }
  if (ageMs > maxMs) {
    throw new AppError(409, 'OFFLINE_SYNC_COMMAND_STALE', 'Offline command is older than the configured replay window.', {
      clientCommandId: input.clientCommandId,
      maxOfflineHours: input.maxOfflineHours,
    });
  }
}

export function assertOfflineBatchOrdering(commands: readonly OfflineCommandEnvelope[]): void {
  const seen = new Set<string>();
  for (const command of commands) {
    if (seen.has(command.clientCommandId)) {
      throw new AppError(409, 'OFFLINE_SYNC_DUPLICATE_CLIENT_COMMAND', 'Offline batch contains duplicate clientCommandId.', {
        clientCommandId: command.clientCommandId,
      });
    }
    seen.add(command.clientCommandId);
  }
}

export function sortedOfflineCommands<T extends OfflineCommandEnvelope>(commands: readonly T[]): T[] {
  assertOfflineBatchOrdering(commands);
  return [...commands].sort((left, right) => {
    const leftTime = new Date(left.occurredAt).getTime();
    const rightTime = new Date(right.occurredAt).getTime();
    if (leftTime !== rightTime) return leftTime - rightTime;
    return left.clientCommandId.localeCompare(right.clientCommandId);
  });
}
