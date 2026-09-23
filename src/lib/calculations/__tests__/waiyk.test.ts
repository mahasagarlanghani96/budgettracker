import { describe, it, expect } from 'vitest';
import {
  calculateProfitShare,
  calculateEffectiveContribution,
  calculateRoundSummary,
  isEntryEligibleForBidding,
  hasEligibleEntries,
  calculateRemainingDues,
} from '../waiyk';

describe('calculateProfitShare', () => {
  it('calculates profit as total minus winning bid', () => {
    const result = calculateProfitShare(100000, 85000, 10);
    expect(result.profitTotal.toString()).toBe('15000');
  });

  it('distributes profit equally among all members', () => {
    const result = calculateProfitShare(100000, 85000, 10);
    expect(result.profitPerMember.toString()).toBe('1500');
  });

  it('handles zero profit when bid equals total', () => {
    const result = calculateProfitShare(100000, 100000, 10);
    expect(result.profitTotal.toString()).toBe('0');
    expect(result.profitPerMember.toString()).toBe('0');
  });

  it('handles large committees', () => {
    const result = calculateProfitShare(500000, 420000, 25);
    expect(result.profitTotal.toString()).toBe('80000');
    expect(result.profitPerMember.toString()).toBe('3200');
  });

  it('rounds down (floor) so distributed profit never exceeds the pool', () => {
    // profit = 100, split 3 ways = 33.33... -> floors to 33.33
    const result = calculateProfitShare(1000, 900, 3);
    expect(result.profitPerMember.toString()).toBe('33.33');
  });

  it('throws when the winning bid exceeds the total amount', () => {
    expect(() => calculateProfitShare(100000, 150000, 10)).toThrow(
      'Winning bid cannot exceed the total committee amount'
    );
  });

  it('throws when member count is not positive', () => {
    expect(() => calculateProfitShare(100000, 85000, 0)).toThrow('Member count must be positive');
  });
});

describe('calculateEffectiveContribution', () => {
  it('subtracts the profit share from the monthly contribution', () => {
    const result = calculateEffectiveContribution(10000, 1500);
    expect(result.toString()).toBe('8500');
  });
});

describe('calculateRoundSummary', () => {
  it('combines profit share and effective contribution for a round', () => {
    const summary = calculateRoundSummary(1, 100000, 85000, 10, 10000, 'Ali');

    expect(summary.profitTotal).toBe('15000.00');
    expect(summary.profitPerMember).toBe('1500.00');
    expect(summary.payoutAmount).toBe('85000.00');
    // Monthly 10000 - profit share 1500 = 8500
    expect(summary.effectiveContribution).toBe('8500.00');
    expect(summary.winningMember).toBe('Ali');
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
    // 12 rounds * 10000/round * 1 slot = 120000 expected, minus 45000 paid
    const dues = calculateRemainingDues(12, 10000, 1, 45000);
    expect(dues.toString()).toBe('75000');
  });

  it('scales expected dues by number of slots held', () => {
    const dues = calculateRemainingDues(12, 10000, 2, 0);
    expect(dues.toString()).toBe('240000');
  });
});
