import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatCurrency, formatCurrencyShort, formatEnum, formatDate, formatDateTime, cn, generateId, getDateRange } from '@/lib/utils';

// --- FIN-QA-0040 through FIN-QA-0055: Extended utility function tests ---

describe('FIN-QA-0040: formatCurrency edge cases', () => {
  it('Infinity returns Rs. 0 (FIN-BUG-0001 regression)', () => {
    expect(formatCurrency(Infinity)).toBe('Rs. 0');
  });

  it('-Infinity returns Rs. 0 (FIN-BUG-0001 regression)', () => {
    expect(formatCurrency(-Infinity)).toBe('Rs. 0');
  });

  it('handles very precise decimals', () => {
    const result = formatCurrency(0.1 + 0.2);
    expect(result).toContain('0.30');
  });

  it('handles Decimal object with many digits', () => {
    const result = formatCurrency({ toString: () => '12345678901234.56' });
    expect(result).toContain('Rs.');
  });

  it('handles negative zero', () => {
    const result = formatCurrency(-0);
    expect(result).toBe('Rs. 0.00');
  });

  it('handles empty string', () => {
    expect(formatCurrency('')).toBe('Rs. 0');
  });

  it('property: output always starts with Rs. for PKR currency', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e12, max: 1e12, noNaN: true }),
        (amount) => {
          const result = formatCurrency(amount);
          expect(result).toMatch(/^-?Rs\./);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: negative amounts produce leading minus', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e12, max: -0.01, noNaN: true }),
        (amount) => {
          const result = formatCurrency(amount);
          expect(result.startsWith('-')).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('FIN-QA-0043: formatCurrencyShort boundaries', () => {
  it('below 1 lakh shows full number', () => {
    expect(formatCurrencyShort(99999)).toBe('Rs. 99,999');
  });

  it('exactly 1 lakh shows Lac', () => {
    expect(formatCurrencyShort(100000)).toBe('Rs. 1.00 Lac');
  });

  it('below 1 crore shows Lac', () => {
    expect(formatCurrencyShort(9999999)).toBe('Rs. 100.00 Lac');
  });

  it('exactly 1 crore shows Cr', () => {
    expect(formatCurrencyShort(10000000)).toBe('Rs. 1.00 Cr');
  });

  it('handles NaN string input', () => {
    expect(formatCurrencyShort('abc')).toBe('Rs. 0');
  });

  it('handles zero', () => {
    expect(formatCurrencyShort(0)).toBe('Rs. 0');
  });
});

describe('FIN-QA-0046: formatEnum edge cases', () => {
  it('handles empty string', () => {
    expect(formatEnum('')).toBe('');
  });

  it('handles single character', () => {
    expect(formatEnum('X')).toBe('X');
  });

  it('handles triple underscore', () => {
    expect(formatEnum('A__B')).toBe('A  B');
  });
});

describe('FIN-QA-0048: formatDate and formatDateTime', () => {
  it('formats date with time correctly', () => {
    const result = formatDateTime(new Date(2024, 5, 15, 14, 30));
    expect(result).toContain('15 Jun 2024');
    expect(result).toContain('02:30 PM');
  });

  it('handles midnight correctly', () => {
    const result = formatDateTime(new Date(2024, 0, 1, 0, 0));
    expect(result).toContain('01 Jan 2024');
    expect(result).toContain('12:00 AM');
  });
});

describe('FIN-QA-0050: cn utility', () => {
  it('merges tailwind classes', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra');
  });

  it('handles undefined and null', () => {
    expect(cn('base', undefined, null, 'extra')).toBe('base extra');
  });
});

describe('FIN-QA-0052: generateId', () => {
  it('generates non-empty string', () => {
    expect(generateId().length).toBeGreaterThan(0);
  });

  it('generates unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('FIN-QA-0054: getDateRange extended', () => {
  it('week range starts on Monday', () => {
    const result = getDateRange('week');
    expect(result).not.toBeNull();
    expect(result!.start.getDay()).toBe(1); // Monday
  });

  it('month range covers full month', () => {
    const result = getDateRange('month');
    expect(result).not.toBeNull();
    expect(result!.start.getDate()).toBe(1);
  });

  it('year range starts Jan 1', () => {
    const result = getDateRange('year');
    expect(result).not.toBeNull();
    expect(result!.start.getMonth()).toBe(0);
    expect(result!.start.getDate()).toBe(1);
  });

  it('default falls back to month', () => {
    const result = getDateRange('unknown' as any);
    expect(result).not.toBeNull();
    expect(result!.start.getDate()).toBe(1);
  });
});
