import Decimal from 'decimal.js';

Decimal.set({ precision: 20 });

export interface WaiykProfitResult {
  profitTotal: Decimal;
  profitPerSlot: Decimal;
}

/**
 * Calculate profit distribution for a Waiyk round.
 * Profit is distributed per SLOT, not per unique member.
 *
 * @param totalAmount  The committee's total value for the round
 * @param winningBid   The winning bid (must be <= totalAmount)
 * @param totalSlots   Total number of slots in the committee
 */
export function calculateProfitShare(
  totalAmount: number | string,
  winningBid: number | string,
  totalSlots: number
): WaiykProfitResult {
  const total = new Decimal(totalAmount.toString());
  const bid = new Decimal(winningBid.toString());

  if (bid.greaterThan(total)) {
    throw new Error('Winning bid cannot exceed the total committee amount');
  }
  if (totalSlots <= 0) {
    throw new Error('Total slots must be positive');
  }

  const profitTotal = total.minus(bid);
  const profitPerSlot = profitTotal.dividedBy(totalSlots);

  return { profitTotal, profitPerSlot };
}

/**
 * Calculate the adjusted payment per slot after profit deduction.
 */
export function calculateAdjustedPaymentPerSlot(
  monthlyContributionPerSlot: number | string,
  profitPerSlot: number | string
): Decimal {
  const contribution = new Decimal(monthlyContributionPerSlot.toString());
  const profit = new Decimal(profitPerSlot.toString());
  return contribution.minus(profit);
}

/**
 * Calculate a member's total profit share based on their slot count.
 */
export function calculateMemberProfit(
  profitPerSlot: number | string,
  slotsOwned: number
): Decimal {
  return new Decimal(profitPerSlot.toString()).times(slotsOwned);
}

/**
 * Calculate a member's adjusted total payment based on their slot count.
 */
export function calculateMemberPayment(
  adjustedPaymentPerSlot: number | string,
  slotsOwned: number
): Decimal {
  return new Decimal(adjustedPaymentPerSlot.toString()).times(slotsOwned);
}

export function isEntryEligibleForBidding(entry: { isTaken: boolean }): boolean {
  return !entry.isTaken;
}

export function hasEligibleEntries(entries: { isTaken: boolean }[]): boolean {
  return entries.some((e) => !e.isTaken);
}

/**
 * Calculate remaining dues for a user across all their slots.
 */
export function calculateRemainingDues(
  totalRounds: number,
  monthlyContribution: number | string,
  userSlots: number,
  totalPaid: number | string
): Decimal {
  const totalExpected = new Decimal(monthlyContribution.toString())
    .times(totalRounds)
    .times(userSlots);
  const paid = new Decimal(totalPaid.toString());
  return totalExpected.minus(paid);
}

export interface WaiykRoundSummary {
  roundNumber: number;
  committeeValue: string;
  winningBid: string;
  winnerPayout: string;
  profitTotal: string;
  profitPerSlot: string;
  paymentPerSlot: string;
  winningMember: string;
}

/**
 * Build a display-ready summary for a Waiyk round.
 * Only rounds to 2 decimal places at this final display layer.
 */
export function calculateRoundSummary(
  roundNumber: number,
  totalAmount: number | string,
  winningBid: number | string,
  totalSlots: number,
  monthlyContribution: number | string,
  winningMember: string
): WaiykRoundSummary {
  const { profitTotal, profitPerSlot } = calculateProfitShare(totalAmount, winningBid, totalSlots);
  const paymentPerSlot = calculateAdjustedPaymentPerSlot(monthlyContribution, profitPerSlot.toString());

  return {
    roundNumber,
    committeeValue: new Decimal(totalAmount.toString()).toFixed(2),
    winningBid: new Decimal(winningBid.toString()).toFixed(2),
    winnerPayout: new Decimal(winningBid.toString()).toFixed(2),
    profitTotal: profitTotal.toFixed(2),
    profitPerSlot: profitPerSlot.toFixed(2),
    paymentPerSlot: paymentPerSlot.toFixed(2),
    winningMember,
  };
}

// Backwards-compatible aliases for existing API route code
/** @deprecated Use profitPerSlot */
export type { WaiykProfitResult as WaiykProfitResultCompat };
