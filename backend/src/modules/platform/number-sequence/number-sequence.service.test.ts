import { describe, expect, it } from 'vitest';
import { formatBusinessNumber, numberSequenceScopeKey } from './number-sequence.service.js';
describe('number sequence formatting/scope',()=>{
 it('uses organization scope when branch absent',()=>expect(numberSequenceScopeKey(null)).toBe('ORG'));
 it('uses branch scope when supplied',()=>expect(numberSequenceScopeKey('branch-id')).toBe('branch-id'));
 it('pads without modifying configured prefix',()=>expect(formatBusinessNumber('PR-2026-',31n,4)).toBe('PR-2026-0031'));
});
