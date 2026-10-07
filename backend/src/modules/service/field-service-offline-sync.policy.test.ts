import { describe, expect, it } from 'vitest';
import {
  assertOfflineBatchOrdering,
  assertOfflineCommandFresh,
  assertOfflineTechnicianScope,
  offlineCommandIdempotencyKey,
  offlineCommandType,
  sortedOfflineCommands,
} from './field-service-offline-sync.policy.js';

describe('R5 technician offline sync policy', () => {
  it('normalizes canonical type and legacy action', () => {
    expect(offlineCommandType({ clientCommandId: 'cmd-0001', workOrderId: 'wo', type: 'CHECK_IN', occurredAt: new Date().toISOString(), payload: {} })).toBe('CHECK_IN');
    expect(offlineCommandType({ clientCommandId: 'cmd-0002', workOrderId: 'wo', action: 'ARRIVE', occurredAt: new Date().toISOString(), payload: {} })).toBe('ARRIVE');
  });

  it('uses organization-scoped idempotency keys with device and client command identity', () => {
    expect(offlineCommandIdempotencyKey('device-a', 'cmd-0001')).toBe('technician-offline:device-a:cmd-0001');
  });

  it('rejects mismatched technician payload or unassigned work orders', () => {
    expect(() => assertOfflineTechnicianScope({ authenticatedTechnicianEmployeeId: 'emp-1', assignedTechnicianId: 'emp-1', clientCommandId: 'cmd-0001' })).not.toThrow();
    expect(() => assertOfflineTechnicianScope({ authenticatedTechnicianEmployeeId: 'emp-1', payloadTechnicianEmployeeId: 'emp-2', assignedTechnicianId: 'emp-1', clientCommandId: 'cmd-0001' })).toThrow('technicianEmployeeId');
    expect(() => assertOfflineTechnicianScope({ authenticatedTechnicianEmployeeId: 'emp-1', assignedTechnicianId: 'emp-2', clientCommandId: 'cmd-0001' })).toThrow('assigned');
  });

  it('rejects stale or future-skewed commands', () => {
    expect(() => assertOfflineCommandFresh({ occurredAt: new Date('2026-09-08T10:00:00.000Z'), tenantClockAt: new Date('2026-09-08T11:00:00.000Z'), maxOfflineHours: 72, clientCommandId: 'cmd-0001' })).not.toThrow();
    expect(() => assertOfflineCommandFresh({ occurredAt: new Date('2026-09-01T10:00:00.000Z'), tenantClockAt: new Date('2026-09-08T11:00:00.000Z'), maxOfflineHours: 72, clientCommandId: 'cmd-0001' })).toThrow('older');
    expect(() => assertOfflineCommandFresh({ occurredAt: new Date('2026-09-08T11:30:01.000Z'), tenantClockAt: new Date('2026-09-08T11:00:00.000Z'), maxOfflineHours: 72, clientCommandId: 'cmd-0001' })).toThrow('ahead');
  });

  it('sorts commands by occurredAt and rejects duplicate command ids inside the same batch', () => {
    const commands = sortedOfflineCommands([
      { clientCommandId: 'cmd-0002', workOrderId: 'wo', type: 'ARRIVE', occurredAt: '2026-09-08T10:10:00.000Z', payload: {} },
      { clientCommandId: 'cmd-0001', workOrderId: 'wo', type: 'START_TRAVEL', occurredAt: '2026-09-08T10:00:00.000Z', payload: {} },
    ]);
    expect(commands.map((command) => command.clientCommandId)).toEqual(['cmd-0001', 'cmd-0002']);
    expect(() => assertOfflineBatchOrdering([
      { clientCommandId: 'cmd-0001', workOrderId: 'wo', type: 'ARRIVE', occurredAt: '2026-09-08T10:10:00.000Z', payload: {} },
      { clientCommandId: 'cmd-0001', workOrderId: 'wo', type: 'START_TRAVEL', occurredAt: '2026-09-08T10:00:00.000Z', payload: {} },
    ])).toThrow('duplicate');
  });
});
