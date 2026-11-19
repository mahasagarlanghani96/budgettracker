import Decimal from 'decimal.js';

Decimal.set({ precision: 20 });

/**
 * Independently calculate expected balance for verification.
 * Never copies app-calculated values — derives from first principles.
 */
export function independentBalanceCalc(
  openingBalance: string | number,
  inflows: (string | number)[],
  outflows: (string | number)[]
): string {
  const opening = new Decimal(openingBalance.toString());
  const totalInflow = inflows.reduce(
    (sum, v) => sum.plus(new Decimal(v.toString())),
    new Decimal(0)
  );
  const totalOutflow = outflows.reduce(
    (sum, v) => sum.plus(new Decimal(v.toString())),
    new Decimal(0)
  );
  return opening.plus(totalInflow).minus(totalOutflow).toString();
}

/**
 * Independently calculate remaining loan amount.
 */
export function independentRemainingLoan(
  principal: string | number,
  repayments: (string | number)[]
): string {
  const amount = new Decimal(principal.toString());
  const totalRepaid = repayments.reduce(
    (sum, v) => sum.plus(new Decimal(v.toString())),
    new Decimal(0)
  );
  return Decimal.max(amount.minus(totalRepaid), 0).toString();
}

/**
 * Independently calculate Waiyk committee profit share.
 */
export function independentWaiykProfit(
  totalAmount: string | number,
  winningBid: string | number,
  totalSlots: number
): { profitTotal: string; profitPerSlot: string } {
  const total = new Decimal(totalAmount.toString());
  const bid = new Decimal(winningBid.toString());
  const profitTotal = total.minus(bid);
  const profitPerSlot = profitTotal.dividedBy(totalSlots);
  return {
    profitTotal: profitTotal.toString(),
    profitPerSlot: profitPerSlot.toString(),
  };
}

/**
 * Independently calculate savings goal progress.
 */
export function independentSavingsProgress(
  deposits: (string | number)[],
  withdrawals: (string | number)[],
  targetAmount: string | number
): { saved: string; remaining: string; percentComplete: string } {
  const totalDeposits = deposits.reduce(
    (sum, v) => sum.plus(new Decimal(v.toString())),
    new Decimal(0)
  );
  const totalWithdrawals = withdrawals.reduce(
    (sum, v) => sum.plus(new Decimal(v.toString())),
    new Decimal(0)
  );
  const saved = totalDeposits.minus(totalWithdrawals);
  const target = new Decimal(targetAmount.toString());
  const remaining = Decimal.max(target.minus(saved), 0);
  const percentComplete = target.isZero()
    ? '0'
    : saved.dividedBy(target).times(100).toFixed(2);
  return {
    saved: saved.toString(),
    remaining: remaining.toString(),
    percentComplete,
  };
}

/**
 * Assert two decimal values are equal with meaningful message.
 */
export function assertDecimalEqual(
  actual: string | number | Decimal,
  expected: string | number,
  context: string
): void {
  const a = new Decimal(actual.toString());
  const e = new Decimal(expected.toString());
  if (!a.equals(e)) {
    throw new Error(
      `${context}: expected ${e.toString()} but got ${a.toString()} (diff: ${a.minus(e).toString()})`
    );
  }
}
