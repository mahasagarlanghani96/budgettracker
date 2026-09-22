import Decimal from 'decimal.js';

/**
 * Waiyk Committee Calculation Functions
 *
 * In a Waiyk committee:
 * - Members contribute a fixed amount monthly
 * - Each month, the total pool is available for bidding
 * - A member bids a lower amount (e.g., Rs. 1,400,000 out of Rs. 1,600,000)
 * - The difference (Rs. 200,000) is profit, distributed among ALL members
 * - Each member's effective contribution = base contribution - their share of profit
 */

export interface WaiykProfitResult {
  /** Total profit = totalAmount - winningBid */
  profitTotal: Decimal;
  /** Profit per member = profitTotal / memberCount */
  profitPerMember: Decimal;
}

/**
 * Calculate profit distribution for a Waiyk round.
 *
 * @param totalAmount   The committee's total pot for the round
 * @param winningBid    The winning bid (lower than totalAmount)
 * @param memberCount   Number of active members sharing the profit
 */
export function calculateProfitShare(
  totalAmount: number | string,
  winningBid: number | string,
  memberCount: number
): WaiykProfitResult {
  const total = new Decimal(totalAmount.toString());
  const bid = new Decimal(winningBid.toString());

  if (bid.greaterThan(total)) {
    throw new Error('Winning bid cannot exceed the total committee amount');
  }
  if (memberCount <= 0) {
    throw new Error('Member count must be positive');
  }

  const profitTotal = total.minus(bid);
  // Use floor to avoid distributing more than available
  const profitPerMember = profitTotal.dividedBy(memberCount).toDecimalPlaces(2, Decimal.ROUND_FLOOR);

  return { profitTotal, profitPerMember };
}

/**
 * Calculate the effective monthly contribution after profit deduction.
 *
 * @param monthlyContribution  The base monthly contribution
 * @param profitPerMember      The profit share to deduct
 */
export function calculateEffectiveContribution(
  monthlyContribution: number | string,
  profitPerMember: number | string
): Decimal {
  const contribution = new Decimal(monthlyContribution.toString());
  const profit = new Decimal(profitPerMember.toString());
  return contribution.minus(profit);
}

/**
 * Check if a committee entry is eligible for bidding.
 * An entry that has already been taken (received its payout) is not eligible.
 */
export function isEntryEligibleForBidding(entry: { isTaken: boolean }): boolean {
  return !entry.isTaken;
}

/**
 * Check if a user has any remaining eligible entries in a committee.
 */
export function hasEligibleEntries(entries: { isTaken: boolean }[]): boolean {
  return entries.some((e) => !e.isTaken);
}

/**
 * Calculate the user's remaining dues for a committee.
 * Total expected contributions - total actual contributions paid.
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

/**
 * Summary of a Waiyk round for display purposes.
 */
export interface WaiykRoundSummary {
  roundNumber: number;
  totalAmount: string;
  winningBid: string;
  payoutAmount: string;
  profitTotal: string;
  profitPerMember: string;
  effectiveContribution: string;
  winningMember: string;
}

export function calculateRoundSummary(
  roundNumber: number,
  totalAmount: number | string,
  winningBid: number | string,
  memberCount: number,
  monthlyContribution: number | string,
  winningMember: string
): WaiykRoundSummary {
  const { profitTotal, profitPerMember } = calculateProfitShare(totalAmount, winningBid, memberCount);
  const effective = calculateEffectiveContribution(monthlyContribution, profitPerMember.toString());

  return {
    roundNumber,
    totalAmount: new Decimal(totalAmount.toString()).toFixed(2),
    winningBid: new Decimal(winningBid.toString()).toFixed(2),
    payoutAmount: new Decimal(winningBid.toString()).toFixed(2),
    profitTotal: profitTotal.toFixed(2),
    profitPerMember: profitPerMember.toFixed(2),
    effectiveContribution: effective.toFixed(2),
    winningMember,
  };
}
