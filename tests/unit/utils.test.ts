import { describe, it, expect } from 'vitest';
import { formatCurrency, formatCurrencyShort, formatEnum, formatDate, getDateRange } from '@/lib/utils';

describe('formatCurrency', () => {
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('Rs. 0.00');
  });

  it('formats small amounts', () => {
    expect(formatCurrency(500)).toBe('Rs. 500.00');
  });

  it('formats thousands with Pakistani grouping', () => {
    expect(formatCurrency(12345)).toBe('Rs. 12,345.00');
  });

  it('formats lakhs', () => {
    expect(formatCurrency(123456)).toBe('Rs. 1,23,456.00');
  });

  it('formats crores', () => {
    expect(formatCurrency(12345678)).toBe('Rs. 1,23,45,678.00');
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-5000)).toBe('-Rs. 5,000.00');
  });

  it('handles string input', () => {
    expect(formatCurrency('75000')).toBe('Rs. 75,000.00');
  });

  it('handles NaN', () => {
    expect(formatCurrency('abc')).toBe('Rs. 0');
  });

  it('handles Decimal-like objects', () => {
    expect(formatCurrency({ toString: () => '250000' })).toBe('Rs. 2,50,000.00');
  });

  it('preserves decimal precision', () => {
    expect(formatCurrency(1234.56)).toBe('Rs. 1,234.56');
  });
});

describe('formatCurrencyShort', () => {
  it('shows full number under 1 lakh', () => {
    expect(formatCurrencyShort(50000)).toBe('Rs. 50,000');
  });

  it('abbreviates lakhs', () => {
    expect(formatCurrencyShort(250000)).toBe('Rs. 2.50 Lac');
  });

  it('abbreviates crores', () => {
    expect(formatCurrencyShort(15000000)).toBe('Rs. 1.50 Cr');
  });

  it('handles negatives in Lac', () => {
    expect(formatCurrencyShort(-500000)).toBe('-Rs. 5.00 Lac');
  });
});

describe('formatEnum', () => {
  it('converts single word', () => {
    expect(formatEnum('INCOME')).toBe('Income');
  });

  it('converts multi-word enums', () => {
    expect(formatEnum('BANK_TRANSFER')).toBe('Bank Transfer');
  });

  it('converts lowercase enums', () => {
    expect(formatEnum('mutual_fund')).toBe('Mutual Fund');
  });

  it('handles single char words', () => {
    expect(formatEnum('A_B')).toBe('A B');
  });
});

describe('formatDate', () => {
  it('formats Date object', () => {
    const result = formatDate(new Date(2024, 0, 15));
    expect(result).toBe('15 Jan 2024');
  });

  it('formats ISO string', () => {
    const result = formatDate('2024-06-30T00:00:00.000Z');
    expect(result).toBe('30 Jun 2024');
  });
});

describe('getDateRange', () => {
  it('returns null for "all"', () => {
    expect(getDateRange('all')).toBeNull();
  });

  it('returns null for custom without dates', () => {
    expect(getDateRange('custom')).toBeNull();
  });

  it('returns range for custom with dates', () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 0, 31);
    const result = getDateRange('custom', start, end);
    expect(result).not.toBeNull();
    expect(result!.start.getDate()).toBe(1);
    expect(result!.end.getDate()).toBe(31);
  });

  it('returns range for today', () => {
    const result = getDateRange('today');
    expect(result).not.toBeNull();
    expect(result!.start.getDate()).toBe(result!.end.getDate());
  });
});
