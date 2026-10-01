import { describe, it, expect } from 'vitest';
import {
  calculateProfitShare,
  calculateAdjustedPaymentPerSlot,
  calculateMemberProfit,
  calculateMemberPayment,
  calculateRoundSummary,
  isEntryEligibleForBidding,
  hasEligibleEntries,
  calculateRemainingDues,
} from '../waiyk';

describe('calculateProfitShare', () => {
  // Test A: 5 members × 30k = 150k, winning bid 120k
  it('Test A — 5 slots, bid 120k of 150k', () => {
    const result = calculateProfitShare(150000, 120000, 5);
    expect(result.profitTotal.toNumber()).toBe(30000);
    expect(result.profitPerSlot.toNumber()).toBe(6000);
  });

  // Test B: 4 slots × 30k = 120k, winning bid 120k (zero profit)
  it('Test B — zero profit when bid equals total', () => {
    const result = calculateProfitShare(120000, 120000, 4);
    expect(result.profitTotal.toNumber()).toBe(0);
    expect(result.profitPerSlot.toNumber()).toBe(0);
  });

  // Test C: 3 slots × 30k = 90k, winning bid 70k
  it('Test C — 3 slots, bid 70k of 90k, repeating decimal', () => {
    const result = calculateProfitShare(90000, 70000, 3);
    expect(result.profitTotal.toNumber()).toBe(20000);
    // 20000 / 3 = 6666.666... — full precision, not truncated
    expect(result.profitPerSlot.toFixed(10)).toBe('6666.6666666667');
  });

  // Test D: 10 slots × 30k = 300k, winning bid 250k
  it('Test D — 10 slots, bid 250k of 300k', () => {
    const result = calculateProfitShare(300000, 250000, 10);
    expect(result.profitTotal.toNumber()).toBe(50000);
    expect(result.profitPerSlot.toNumber()).toBe(5000);
  });

  it('throws when bid exceeds total', () => {
    expect(() => calculateProfitShare(100000, 150000, 10)).toThrow(
      'Winning bid cannot exceed the total committee amount'
    );
  });

  it('throws when slots is not positive', () => {
    expect(() => calculateProfitShare(100000, 85000, 0)).toThrow('Total slots must be positive');
  });
});

describe('calculateAdjustedPaymentPerSlot', () => {
  it('subtracts profit per slot from monthly contribution', () => {
    const result = calculateAdjustedPaymentPerSlot(30000, 6000);
    expect(result.toNumber()).toBe(24000);
  });

  it('equals full contribution when profit is zero', () => {
    const result = calculateAdjustedPaymentPerSlot(30000, 0);
    expect(result.toNumber()).toBe(30000);
  });
});

describe('calculateMemberProfit', () => {
  it('scales profit by number of slots owned', () => {
    expect(calculateMemberProfit(6000, 1).toNumber()).toBe(6000);
    expect(calculateMemberProfit(6000, 3).toNumber()).toBe(18000);
  });
});

describe('calculateMemberPayment', () => {
  it('scales adjusted payment by slots owned', () => {
    expect(calculateMemberPayment(24000, 2).toNumber()).toBe(48000);
  });
});

describe('calculateRoundSummary', () => {
  it('builds display-ready summary with 2dp rounding at output layer', () => {
    const summary = calculateRoundSummary(1, 150000, 120000, 5, 30000, 'Ali');

    expect(summary.committeeValue).toBe('150000.00');
    expect(summary.winningBid).toBe('120000.00');
    expect(summary.winnerPayout).toBe('120000.00');
    expect(summary.profitTotal).toBe('30000.00');
    expect(summary.profitPerSlot).toBe('6000.00');
    expect(summary.paymentPerSlot).toBe('24000.00');
    expect(summary.winningMember).toBe('Ali');
  });

  it('handles repeating decimals at display layer', () => {
    const summary = calculateRoundSummary(2, 90000, 70000, 3, 30000, 'Bob');
    expect(summary.profitPerSlot).toBe('6666.67');
    expect(summary.paymentPerSlot).toBe('23333.33');
  });
});

describe('committee entry eligibility', () => {
  it('treats an entry as eligible only if it has not already been taken', () => {
    expect(isEntryEligibleForBidding({ isTaken: false })).toBe(true);
    expect(isEntryEligibleForBidding({ isTaken: true })).toBe(false);
  });

  it('reports eligible entries exist if at least one is not taken', () => {
    expect(hasEligibleEntries([{ isTaken: true }, { isTaken: false }])).toBe(true);
    expect(hasEligibleEntries([{ isTaken: true }, { isTaken: true }])).toBe(false);
    expect(hasEligibleEntries([])).toBe(false);
  });
});

describe('calculateRemainingDues', () => {
  it('calculates expected minus paid across rounds and slots', () => {
    const dues = calculateRemainingDues(12, 10000, 1, 45000);
    expect(dues.toString()).toBe('75000');
  });

  it('scales expected dues by number of slots held', () => {
    const dues = calculateRemainingDues(12, 10000, 2, 0);
    expect(dues.toString()).toBe('240000');
  });
});
