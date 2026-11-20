import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatCurrency, formatCurrencyShort } from '@/lib/utils';
import { INFLOW_TYPES, OUTFLOW_TYPES } from '@/lib/calculations/balance';

describe('FIN-QA-0800: formatCurrency property-based fuzz tests', () => {
  it('never throws for any finite number', () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true }),
        (n) => {
          expect(() => formatCurrency(n)).not.toThrow();
        }
      ),
      { numRuns: 500, seed: 42 }
    );
  });

  it('always returns a string starting with "Rs."', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e12, max: 1e12, noNaN: true, noDefaultInfinity: true }),
        (n) => {
          const result = formatCurrency(n);
          expect(result).toMatch(/^-?Rs\./);
        }
      ),
      { numRuns: 500, seed: 42 }
    );
  });

  it('returns "Rs. 0" for NaN (FIN-BUG-0001 regression)', () => {
    expect(formatCurrency(NaN)).toBe('Rs. 0');
  });

  it('returns "Rs. 0" for Infinity (FIN-BUG-0001 regression)', () => {
    expect(formatCurrency(Infinity)).toBe('Rs. 0');
    expect(formatCurrency(-Infinity)).toBe('Rs. 0');
  });

  it('negative numbers include a minus sign', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e12, max: -0.01, noNaN: true, noDefaultInfinity: true }),
        (n) => {
          const result = formatCurrency(n);
          expect(result).toContain('-');
        }
      ),
      { numRuns: 200, seed: 42 }
    );
  });

  it('zero always formats as "Rs. 0.00"', () => {
    expect(formatCurrency(0)).toBe('Rs. 0.00');
    expect(formatCurrency(-0)).toBe('Rs. 0.00');
  });

  it('string input works the same as number input', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1e9, noNaN: true, noDefaultInfinity: true }),
        (n) => {
          const fromNum = formatCurrency(n);
          const fromStr = formatCurrency(n.toFixed(2));
          expect(fromNum).toBe(fromStr);
        }
      ),
      { numRuns: 200, seed: 42 }
    );
  });
});

describe('FIN-QA-0810: formatCurrencyShort property-based fuzz tests', () => {
  it('never throws for any finite number', () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true }),
        (n) => {
          expect(() => formatCurrencyShort(n)).not.toThrow();
        }
      ),
      { numRuns: 500, seed: 42 }
    );
  });

  it('returns "Rs. 0" for non-finite values', () => {
    expect(formatCurrencyShort(NaN)).toBe('Rs. 0');
    expect(formatCurrencyShort(Infinity)).toBe('Rs. 0');
    expect(formatCurrencyShort(-Infinity)).toBe('Rs. 0');
  });

  it('uses lakh/crore suffixes for large positive numbers', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e5, max: 1e12, noNaN: true, noDefaultInfinity: true }),
        (n) => {
          const result = formatCurrencyShort(n);
          expect(result).toMatch(/Rs\.\s[\d.]+\s?(L|Cr|K)?/);
        }
      ),
      { numRuns: 200, seed: 42 }
    );
  });
});

describe('FIN-QA-0820: Transaction type classification invariants', () => {
  it('TRANSFER appears in both INFLOW_TYPES and OUTFLOW_TYPES', () => {
    expect(INFLOW_TYPES).toContain('TRANSFER');
    expect(OUTFLOW_TYPES).toContain('TRANSFER');
  });

  it('no other type appears in both inflow and outflow (except TRANSFER)', () => {
    const overlap = INFLOW_TYPES.filter(t => OUTFLOW_TYPES.includes(t));
    expect(overlap).toEqual(['TRANSFER']);
  });

  it('all transaction types are non-empty strings', () => {
    for (const t of [...INFLOW_TYPES, ...OUTFLOW_TYPES]) {
      expect(typeof t).toBe('string');
      expect(t.length).toBeGreaterThan(0);
    }
  });

  it('inflow types count is 8', () => {
    expect(INFLOW_TYPES).toHaveLength(8);
  });

  it('outflow types count is 9', () => {
    expect(OUTFLOW_TYPES).toHaveLength(9);
  });

  it('all types use UPPER_SNAKE_CASE', () => {
    for (const t of [...INFLOW_TYPES, ...OUTFLOW_TYPES]) {
      expect(t).toMatch(/^[A-Z][A-Z_]*$/);
    }
  });
});
