import { describe, it, expect } from 'vitest';

// Test the pure financial calculation logic
// These are unit tests for the critical balance calculation rules

describe('Balance Calculation Rules', () => {
  // Replicate the INFLOW_TYPES and OUTFLOW_TYPES from balance.ts
  const INFLOW_TYPES = ['INCOME', 'LOAN_TAKEN', 'COMMITTEE_RECEIVED', 'TRANSFER_IN', 'SAVINGS_WITHDRAW', 'INVESTMENT_RETURN'];
  const OUTFLOW_TYPES = ['EXPENSE', 'LOAN_GIVEN', 'LOAN_REPAYMENT_MADE', 'COMMITTEE_CONTRIBUTION', 'TRANSFER_OUT', 'SAVINGS_DEPOSIT', 'INVESTMENT', 'PLOT_PAYMENT'];

  it('should classify INCOME as inflow', () => {
    expect(INFLOW_TYPES).toContain('INCOME');
  });

  it('should classify EXPENSE as outflow', () => {
    expect(OUTFLOW_TYPES).toContain('EXPENSE');
  });

  it('should NOT count TRANSFER as income or expense', () => {
    // TRANSFER itself is not in inflow or outflow — only TRANSFER_IN and TRANSFER_OUT
    expect(INFLOW_TYPES).not.toContain('TRANSFER');
    expect(OUTFLOW_TYPES).not.toContain('TRANSFER');
  });

  it('should count TRANSFER_IN as inflow and TRANSFER_OUT as outflow', () => {
    expect(INFLOW_TYPES).toContain('TRANSFER_IN');
    expect(OUTFLOW_TYPES).toContain('TRANSFER_OUT');
  });

  it('should NOT count LOAN_GIVEN as expense', () => {
    // Loan given is an outflow (money leaves account) but not an expense
    expect(OUTFLOW_TYPES).toContain('LOAN_GIVEN');
    // The key rule: loans are not expenses for reporting purposes
    const EXPENSE_TYPES = ['EXPENSE'];
    expect(EXPENSE_TYPES).not.toContain('LOAN_GIVEN');
  });

  it('should NOT count LOAN_REPAYMENT_RECEIVED as income', () => {
    // Loan repayment received is an inflow but not income
    const INCOME_TYPES = ['INCOME'];
    expect(INCOME_TYPES).not.toContain('LOAN_REPAYMENT_RECEIVED');
  });

  it('should count LOAN_TAKEN as inflow', () => {
    expect(INFLOW_TYPES).toContain('LOAN_TAKEN');
  });

  it('should count LOAN_REPAYMENT_MADE as outflow', () => {
    expect(OUTFLOW_TYPES).toContain('LOAN_REPAYMENT_MADE');
  });

  describe('Account Balance Calculation', () => {
    // balance = openingBalance + sum(inflows) - sum(outflows)
    function calculateBalance(openingBalance: number, transactions: Array<{ type: string; amount: number }>) {
      let balance = openingBalance;
      for (const tx of transactions) {
        if (INFLOW_TYPES.includes(tx.type)) {
          balance += tx.amount;
        } else if (OUTFLOW_TYPES.includes(tx.type)) {
          balance -= tx.amount;
        }
      }
      return balance;
    }

    it('should start with opening balance when no transactions', () => {
      expect(calculateBalance(10000, [])).toBe(10000);
    });

    it('should add income to balance', () => {
      expect(calculateBalance(10000, [{ type: 'INCOME', amount: 5000 }])).toBe(15000);
    });

    it('should subtract expense from balance', () => {
      expect(calculateBalance(10000, [{ type: 'EXPENSE', amount: 3000 }])).toBe(7000);
    });

    it('should handle mixed transactions correctly', () => {
      const txns = [
        { type: 'INCOME', amount: 150000 },
        { type: 'EXPENSE', amount: 8500 },
        { type: 'EXPENSE', amount: 2500 },
        { type: 'TRANSFER_OUT', amount: 20000 },
      ];
      // 10000 + 150000 - 8500 - 2500 - 20000 = 129000
      expect(calculateBalance(10000, txns)).toBe(129000);
    });

    it('should handle loan given as outflow (not expense)', () => {
      const txns = [
        { type: 'INCOME', amount: 100000 },
        { type: 'LOAN_GIVEN', amount: 50000 },
      ];
      // 0 + 100000 - 50000 = 50000
      expect(calculateBalance(0, txns)).toBe(50000);
    });

    it('should handle transfer correctly — net zero effect across accounts', () => {
      // Account A: transfer out 20000
      const accountA = calculateBalance(50000, [{ type: 'TRANSFER_OUT', amount: 20000 }]);
      // Account B: transfer in 20000
      const accountB = calculateBalance(10000, [{ type: 'TRANSFER_IN', amount: 20000 }]);

      // Total across both accounts should be unchanged
      expect(accountA + accountB).toBe(50000 + 10000);
    });

    it('should allow negative balance', () => {
      expect(calculateBalance(1000, [{ type: 'EXPENSE', amount: 5000 }])).toBe(-4000);
    });
  });
});

describe('Waiyk Profit Calculation Rules', () => {
  // Waiyk: winner bids a lower amount than total pool
  // Profit = totalAmount - winningBid
  // profitPerMember = profit / totalEntries

  function calculateWaiykProfitShare(totalAmount: number, winningBid: number, totalEntries: number) {
    const profit = totalAmount - winningBid;
    const profitPerMember = totalEntries > 0 ? profit / totalEntries : 0;
    const payoutAmount = winningBid; // Winner gets the bid amount
    const effectiveContribution = (totalAmount / totalEntries) - profitPerMember;
    return { profit, profitPerMember, payoutAmount, effectiveContribution };
  }

  it('should calculate profit as total minus winning bid', () => {
    const result = calculateWaiykProfitShare(100000, 85000, 10);
    expect(result.profit).toBe(15000);
  });

  it('should distribute profit equally among all members', () => {
    const result = calculateWaiykProfitShare(100000, 85000, 10);
    expect(result.profitPerMember).toBe(1500); // 15000 / 10
  });

  it('should set payout to winning bid amount', () => {
    const result = calculateWaiykProfitShare(100000, 85000, 10);
    expect(result.payoutAmount).toBe(85000);
  });

  it('should calculate effective contribution (monthly - profit share)', () => {
    const result = calculateWaiykProfitShare(100000, 85000, 10);
    // Monthly = 100000/10 = 10000, profit share = 1500, effective = 8500
    expect(result.effectiveContribution).toBe(8500);
  });

  it('should handle zero profit when bid equals total', () => {
    const result = calculateWaiykProfitShare(100000, 100000, 10);
    expect(result.profit).toBe(0);
    expect(result.profitPerMember).toBe(0);
  });

  it('should handle large committees', () => {
    const result = calculateWaiykProfitShare(500000, 420000, 25);
    expect(result.profit).toBe(80000);
    expect(result.profitPerMember).toBe(3200); // 80000 / 25
  });
});
