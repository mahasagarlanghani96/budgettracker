import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import Decimal from 'decimal.js';
import {
  calculateProfitShare,
  calculateAdjustedPaymentPerSlot,
  calculateMemberProfit,
  calculateMemberPayment,
  calculateRemainingDues,
} from '@/lib/calculations/waiyk';
import {
  independentBalanceCalc,
  independentRemainingLoan,
  independentWaiykProfit,
} from '../helpers/financial-assertions';

Decimal.set({ precision: 20 });

// --- FIN-QA-0001 through FIN-QA-0030: Property-based financial invariants ---

describe('FIN-QA-0001: Balance calculation invariants (property-based)', () => {
  it('balance = opening + inflows - outflows for any valid amounts', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1e9, noNaN: true }),
        fc.array(fc.double({ min: 0.01, max: 1e7, noNaN: true }), { minLength: 0, maxLength: 20 }),
        fc.array(fc.double({ min: 0.01, max: 1e7, noNaN: true }), { minLength: 0, maxLength: 20 }),
        (opening, inflows, outflows) => {
          const result = independentBalanceCalc(
            opening.toFixed(2),
            inflows.map(v => v.toFixed(2)),
            outflows.map(v => v.toFixed(2))
          );
          const expected = new Decimal(opening.toFixed(2))
            .plus(inflows.reduce((s, v) => s.plus(v.toFixed(2)), new Decimal(0)))
            .minus(outflows.reduce((s, v) => s.plus(v.toFixed(2)), new Decimal(0)));
          expect(result).toBe(expected.toString());
        }
      ),
      { numRuns: 200, seed: 42 }
    );
  });

  it('adding then removing the same inflow returns to original balance', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1e9, noNaN: true }),
        fc.double({ min: 0.01, max: 1e7, noNaN: true }),
        (opening, amount) => {
          const withInflow = independentBalanceCalc(opening.toFixed(2), [amount.toFixed(2)], []);
          const reverted = independentBalanceCalc(withInflow, [], [amount.toFixed(2)]);
          const diff = new Decimal(reverted).minus(opening.toFixed(2)).abs();
          expect(diff.lessThanOrEqualTo('0.01')).toBe(true);
        }
      ),
      { numRuns: 200, seed: 42 }
    );
  });
});

describe('FIN-QA-0002: Waiyk committee profit invariants (property-based)', () => {
  it('profit + winning bid = total amount (conservation)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1000, max: 1e7, noNaN: true }),
        fc.nat({ max: 99 }),
        fc.integer({ min: 1, max: 50 }),
        (totalAmount, bidPercent, totalSlots) => {
          const total = new Decimal(totalAmount.toFixed(2));
          const bid = total.times(bidPercent).dividedBy(100).toDecimalPlaces(2);
          if (bid.greaterThan(total)) return;

          const result = calculateProfitShare(total.toString(), bid.toString(), totalSlots);
          const sum = result.profitTotal.plus(bid);
          expect(sum.toFixed(2)).toBe(total.toFixed(2));
        }
      ),
      { numRuns: 300, seed: 42 }
    );
  });

  it('profitPerSlot * totalSlots = profitTotal', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1000, max: 1e7, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.integer({ min: 1, max: 50 }),
        (totalAmount, bidRatio, totalSlots) => {
          const total = new Decimal(totalAmount.toFixed(2));
          const bid = total.times(bidRatio).toDecimalPlaces(2);
          if (bid.greaterThan(total)) return;

          const result = calculateProfitShare(total.toString(), bid.toString(), totalSlots);
          const reconstructed = result.profitPerSlot.times(totalSlots);
          expect(reconstructed.toFixed(2)).toBe(result.profitTotal.toFixed(2));
        }
      ),
      { numRuns: 300, seed: 42 }
    );
  });

  it('adjusted payment + profit per slot = monthly contribution', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1000, max: 100000, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (contribution, profitRatio) => {
          const c = new Decimal(contribution.toFixed(2));
          const profit = c.times(profitRatio).toDecimalPlaces(2);

          const adjusted = calculateAdjustedPaymentPerSlot(c.toString(), profit.toString());
          const sum = adjusted.plus(profit);
          expect(sum.toFixed(2)).toBe(c.toFixed(2));
        }
      ),
      { numRuns: 200, seed: 42 }
    );
  });

  it('member profit scales linearly with slots owned', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100000, noNaN: true }),
        fc.integer({ min: 1, max: 10 }),
        (profitPerSlot, slots) => {
          const p = new Decimal(profitPerSlot.toFixed(2));
          const result = calculateMemberProfit(p.toString(), slots);
          expect(result.toFixed(2)).toBe(p.times(slots).toFixed(2));
        }
      ),
      { numRuns: 100, seed: 42 }
    );
  });

  it('member payment scales linearly with slots owned', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100000, noNaN: true }),
        fc.integer({ min: 1, max: 10 }),
        (adjustedPayment, slots) => {
          const a = new Decimal(adjustedPayment.toFixed(2));
          const result = calculateMemberPayment(a.toString(), slots);
          expect(result.toFixed(2)).toBe(a.times(slots).toFixed(2));
        }
      ),
      { numRuns: 100, seed: 42 }
    );
  });
});

describe('FIN-QA-0003: Loan remaining amount invariants (property-based)', () => {
  it('remaining = max(0, principal - sum(repayments))', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 100, max: 1e7, noNaN: true }),
        fc.array(fc.double({ min: 0.01, max: 1e6, noNaN: true }), { minLength: 0, maxLength: 10 }),
        (principal, repayments) => {
          const result = independentRemainingLoan(
            principal.toFixed(2),
            repayments.map(v => v.toFixed(2))
          );
          const expected = Decimal.max(
            new Decimal(principal.toFixed(2)).minus(
              repayments.reduce((s, v) => s.plus(v.toFixed(2)), new Decimal(0))
            ),
            0
          );
          expect(result).toBe(expected.toString());
        }
      ),
      { numRuns: 200, seed: 42 }
    );
  });

  it('remaining amount never goes below zero', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 100, max: 1e6, noNaN: true }),
        fc.array(fc.double({ min: 100, max: 1e7, noNaN: true }), { minLength: 1, maxLength: 10 }),
        (principal, repayments) => {
          const result = independentRemainingLoan(
            principal.toFixed(2),
            repayments.map(v => v.toFixed(2))
          );
          expect(new Decimal(result).gte(0)).toBe(true);
        }
      ),
      { numRuns: 200, seed: 42 }
    );
  });
});

describe('FIN-QA-0004: Waiyk remaining dues invariants', () => {
  it('remaining dues = (contribution * rounds * slots) - totalPaid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 24 }),
        fc.double({ min: 1000, max: 100000, noNaN: true }),
        fc.integer({ min: 1, max: 5 }),
        fc.double({ min: 0, max: 1e7, noNaN: true }),
        (rounds, contribution, slots, paid) => {
          const c = new Decimal(contribution.toFixed(2));
          const p = new Decimal(paid.toFixed(2));
          const result = calculateRemainingDues(rounds, c.toString(), slots, p.toString());
          const expected = c.times(rounds).times(slots).minus(p);
          expect(result.toFixed(2)).toBe(expected.toFixed(2));
        }
      ),
      { numRuns: 200, seed: 42 }
    );
  });
});

describe('FIN-QA-0005: Decimal precision edge cases', () => {
  it('handles repeating decimals without floating-point corruption', () => {
    const result = calculateProfitShare('100000', '66666.67', 3);
    const expected = new Decimal('100000').minus('66666.67');
    expect(result.profitTotal.toString()).toBe(expected.toString());
  });

  it('handles very small amounts correctly', () => {
    const result = calculateProfitShare('1.00', '0.01', 10);
    expect(result.profitTotal.toString()).toBe('0.99');
    expect(result.profitPerSlot.toString()).toBe('0.099');
  });

  it('handles very large amounts without overflow', () => {
    const result = calculateProfitShare('999999999999.99', '500000000000.00', 100);
    expect(result.profitTotal.toString()).toBe('499999999999.99');
  });

  it('zero total amount with zero bid produces zero profit', () => {
    const result = calculateProfitShare('0', '0', 5);
    expect(result.profitTotal.toNumber()).toBe(0);
    expect(result.profitPerSlot.toNumber()).toBe(0);
  });
});

describe('FIN-QA-0006: Independent Waiyk verification', () => {
  it('cross-checks app calculation against independent implementation', () => {
    const totalAmount = '150000';
    const winningBid = '120000';
    const totalSlots = 5;

    const appResult = calculateProfitShare(totalAmount, winningBid, totalSlots);
    const indResult = independentWaiykProfit(totalAmount, winningBid, totalSlots);

    expect(appResult.profitTotal.toString()).toBe(indResult.profitTotal);
    expect(appResult.profitPerSlot.toString()).toBe(indResult.profitPerSlot);
  });

  it('cross-checks with fractional results', () => {
    const totalAmount = '90000';
    const winningBid = '70000';
    const totalSlots = 3;

    const appResult = calculateProfitShare(totalAmount, winningBid, totalSlots);
    const indResult = independentWaiykProfit(totalAmount, winningBid, totalSlots);

    expect(appResult.profitTotal.toString()).toBe(indResult.profitTotal);
    expect(appResult.profitPerSlot.toFixed(10)).toBe(
      new Decimal(indResult.profitPerSlot).toFixed(10)
    );
  });
});
