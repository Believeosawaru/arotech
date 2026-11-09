import { describe, it, expect } from 'vitest';
import { validateLines } from '../src/services/ledger.js';
describe('immutable journal line invariants', () => {
    const a = 'a', b = 'b';
    it('accepts balanced entries', () => expect(validateLines([{ accountId: a, debitMinor: 2500, creditMinor: 0 }, { accountId: b, debitMinor: 0, creditMinor: 2500 }])).toBe(true));
    it('rejects unbalanced entries', () => expect(() => validateLines([{ accountId: a, debitMinor: 2500, creditMinor: 0 }, { accountId: b, debitMinor: 0, creditMinor: 2400 }])).toThrow('Unbalanced'));
    it('rejects malformed double-sided lines', () => expect(() => validateLines([{ accountId: a, debitMinor: 500, creditMinor: 500 }, { accountId: b, debitMinor: 500, creditMinor: 500 }])).toThrow('Invalid'));
    it('rejects decimal currency values', () => expect(() => validateLines([{ accountId: a, debitMinor: 10.5, creditMinor: 0 }, { accountId: b, debitMinor: 0, creditMinor: 10.5 }])).toThrow('Invalid'));
});

