import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  registerSchema,
  accountSchema,
  transactionSchema,
  loanSchema,
  committeeSchema,
  savingsGoalSchema,
  investmentSchema,
  plotSchema,
  targetSchema,
  personSchema,
  categorySchema,
  savingsTransactionSchema,
  plotPaymentSchema,
  investmentProfitSchema,
  investmentCloseSchema,
  sportsTeamSchema,
  sportsMatchSchema,
  sportsExpenseSchema,
  sportsMatchFeeSchema,
  sportsPlayerSchema,
  committeeRoundSchema,
  committeeContributionSchema,
  committeeReceivingSchema,
} from '@/lib/validations/schemas';
import {
  makeValidRegistration,
  makeValidAccount,
  makeValidTransaction,
  makeValidLoan,
  makeValidCommittee,
  makeValidSavingsGoal,
  makeValidInvestment,
  makeValidPlot,
  makeValidTarget,
  makeValidPerson,
  makeValidCategory,
} from '../helpers/schema-factories';

// --- FIN-QA-0010 through FIN-QA-0029: Extended schema validation ---

describe('FIN-QA-0010: Registration schema boundary tests', () => {
  it('rejects empty name', () => {
    expect(registerSchema.safeParse(makeValidRegistration({ name: '' })).success).toBe(false);
  });

  it('rejects single-character name', () => {
    expect(registerSchema.safeParse(makeValidRegistration({ name: 'A' })).success).toBe(false);
  });

  it('accepts exactly 2-char name', () => {
    expect(registerSchema.safeParse(makeValidRegistration({ name: 'AB' })).success).toBe(true);
  });

  it('accepts exactly 100-char name', () => {
    expect(registerSchema.safeParse(makeValidRegistration({ name: 'A'.repeat(100) })).success).toBe(true);
  });

  it('rejects 101-char name', () => {
    expect(registerSchema.safeParse(makeValidRegistration({ name: 'A'.repeat(101) })).success).toBe(false);
  });

  it('rejects exactly 7-char password', () => {
    expect(registerSchema.safeParse(makeValidRegistration({ password: 'Passwo1' })).success).toBe(false);
  });

  it('accepts exactly 8-char password', () => {
    expect(registerSchema.safeParse(makeValidRegistration({ password: 'Passwo1d' })).success).toBe(true);
  });

  it('accepts exactly 72-char password', () => {
    const pwd = 'A'.repeat(69) + 'a1x';
    expect(registerSchema.safeParse(makeValidRegistration({ password: pwd })).success).toBe(true);
  });

  it('rejects password with only whitespace', () => {
    expect(registerSchema.safeParse(makeValidRegistration({ password: '        ' })).success).toBe(false);
  });

  it('rejects email without domain', () => {
    expect(registerSchema.safeParse(makeValidRegistration({ email: 'user@' })).success).toBe(false);
  });

  it('rejects email without @', () => {
    expect(registerSchema.safeParse(makeValidRegistration({ email: 'user.example.com' })).success).toBe(false);
  });

  it('property: any string with uppercase+lowercase+digit and length 8-72 is accepted', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 69 }).map(s => 'Aa1' + s),
        (password) => {
          const result = registerSchema.safeParse(makeValidRegistration({ password }));
          if (password.length >= 8 && password.length <= 72 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)) {
            expect(result.success).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('FIN-QA-0011: Transaction schema edge cases', () => {
  const allTypes = [
    'INCOME', 'EXPENSE', 'TRANSFER', 'LOAN_GIVEN', 'LOAN_REPAYMENT_RECEIVED',
    'LOAN_TAKEN', 'LOAN_REPAYMENT_MADE', 'COMMITTEE_CONTRIBUTION',
    'COMMITTEE_RECEIVING', 'SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL',
    'INVESTMENT', 'INVESTMENT_RETURN', 'PLOT_PAYMENT', 'OTHER',
  ];

  it('rejects amount of exactly 0', () => {
    expect(transactionSchema.safeParse(makeValidTransaction({ amount: 0 })).success).toBe(false);
  });

  it('rejects negative amount', () => {
    expect(transactionSchema.safeParse(makeValidTransaction({ amount: -1 })).success).toBe(false);
  });

  it('accepts very small positive amount (0.01)', () => {
    expect(transactionSchema.safeParse(makeValidTransaction({ amount: 0.01 })).success).toBe(true);
  });

  it('accepts very large amount', () => {
    expect(transactionSchema.safeParse(makeValidTransaction({ amount: 999999999 })).success).toBe(true);
  });

  it('accepts description at max length (500 chars)', () => {
    expect(transactionSchema.safeParse(makeValidTransaction({ description: 'A'.repeat(500) })).success).toBe(true);
  });

  it('rejects description over 500 chars', () => {
    expect(transactionSchema.safeParse(makeValidTransaction({ description: 'A'.repeat(501) })).success).toBe(false);
  });

  it('rejects empty transactionDate string', () => {
    expect(transactionSchema.safeParse(makeValidTransaction({ transactionDate: '' })).success).toBe(false);
  });

  it.each(allTypes)('accepts transaction type: %s', (type) => {
    expect(transactionSchema.safeParse(makeValidTransaction({ type })).success).toBe(true);
  });
});

describe('FIN-QA-0012: Account schema boundaries', () => {
  const allAccountTypes = ['CASH', 'BANK', 'WALLET', 'CREDIT_CARD', 'SAVINGS_ACCOUNT', 'OTHER'];

  it.each(allAccountTypes)('accepts account type: %s', (accountType) => {
    expect(accountSchema.safeParse(makeValidAccount({ accountType })).success).toBe(true);
  });

  it('rejects opening balance of -0.01', () => {
    expect(accountSchema.safeParse(makeValidAccount({ openingBalance: -0.01 })).success).toBe(false);
  });

  it('accepts opening balance of 0', () => {
    expect(accountSchema.safeParse(makeValidAccount({ openingBalance: 0 })).success).toBe(true);
  });

  it('notes max 500 chars', () => {
    expect(accountSchema.safeParse(makeValidAccount({ notes: 'X'.repeat(501) })).success).toBe(false);
    expect(accountSchema.safeParse(makeValidAccount({ notes: 'X'.repeat(500) })).success).toBe(true);
  });
});

describe('FIN-QA-0013: Loan schema edge cases', () => {
  it('rejects interest rate over 100%', () => {
    expect(loanSchema.safeParse(makeValidLoan({ interestRate: 100.01 })).success).toBe(false);
  });

  it('accepts interest rate of exactly 100%', () => {
    expect(loanSchema.safeParse(makeValidLoan({ interestRate: 100 })).success).toBe(true);
  });

  it('accepts interest rate of 0%', () => {
    expect(loanSchema.safeParse(makeValidLoan({ interestRate: 0 })).success).toBe(true);
  });

  it('rejects negative interest rate', () => {
    expect(loanSchema.safeParse(makeValidLoan({ interestRate: -1 })).success).toBe(false);
  });

  it('rejects zero amount', () => {
    expect(loanSchema.safeParse(makeValidLoan({ amount: 0 })).success).toBe(false);
  });

  it('rejects empty personId', () => {
    expect(loanSchema.safeParse(makeValidLoan({ personId: '' })).success).toBe(false);
  });
});

describe('FIN-QA-0014: Committee schema validation', () => {
  it('accepts both NORMAL and WAIYK types', () => {
    expect(committeeSchema.safeParse(makeValidCommittee({ type: 'NORMAL' })).success).toBe(true);
    expect(committeeSchema.safeParse(makeValidCommittee({ type: 'WAIYK' })).success).toBe(true);
  });

  it('rejects zero member count', () => {
    expect(committeeSchema.safeParse(makeValidCommittee({ memberCount: 0 })).success).toBe(false);
  });

  it('rejects negative member count', () => {
    expect(committeeSchema.safeParse(makeValidCommittee({ memberCount: -1 })).success).toBe(false);
  });

  it('rejects non-integer member count', () => {
    expect(committeeSchema.safeParse(makeValidCommittee({ memberCount: 10.5 })).success).toBe(false);
  });

  it('rejects zero monthly contribution', () => {
    expect(committeeSchema.safeParse(makeValidCommittee({ monthlyContribution: 0 })).success).toBe(false);
  });
});

describe('FIN-QA-0015: Savings goal schema', () => {
  it('rejects zero target amount', () => {
    expect(savingsGoalSchema.safeParse(makeValidSavingsGoal({ targetAmount: 0 })).success).toBe(false);
  });

  it('rejects negative target amount', () => {
    expect(savingsGoalSchema.safeParse(makeValidSavingsGoal({ targetAmount: -1000 })).success).toBe(false);
  });

  it('accepts goal without target date', () => {
    expect(savingsGoalSchema.safeParse(makeValidSavingsGoal()).success).toBe(true);
  });
});

describe('FIN-QA-0016: Investment schema edge cases', () => {
  it('rejects zero invested amount', () => {
    expect(investmentSchema.safeParse(makeValidInvestment({ amountInvested: 0 })).success).toBe(false);
  });

  it('accepts null current value', () => {
    expect(investmentSchema.safeParse(makeValidInvestment({ currentValue: null })).success).toBe(true);
  });

  it('rejects empty investment type', () => {
    expect(investmentSchema.safeParse(makeValidInvestment({ investmentType: '' })).success).toBe(false);
  });
});

describe('FIN-QA-0017: Plot schema', () => {
  it('rejects zero total price', () => {
    expect(plotSchema.safeParse(makeValidPlot({ totalPrice: 0 })).success).toBe(false);
  });

  it('accepts optional location', () => {
    expect(plotSchema.safeParse(makeValidPlot()).success).toBe(true);
    expect(plotSchema.safeParse(makeValidPlot({ location: 'DHA Phase 5' })).success).toBe(true);
  });
});

describe('FIN-QA-0018: Target schema', () => {
  const allTargetTypes = ['MAX_EXPENSE', 'MAX_TOTAL_EXPENSE', 'MIN_SAVINGS', 'MIN_INCOME', 'CUSTOM'];

  it.each(allTargetTypes)('accepts target type: %s', (type) => {
    expect(targetSchema.safeParse(makeValidTarget({ type })).success).toBe(true);
  });

  it('rejects month 0', () => {
    expect(targetSchema.safeParse(makeValidTarget({ month: 0 })).success).toBe(false);
  });

  it('rejects month 13', () => {
    expect(targetSchema.safeParse(makeValidTarget({ month: 13 })).success).toBe(false);
  });

  it('accepts month boundaries (1 and 12)', () => {
    expect(targetSchema.safeParse(makeValidTarget({ month: 1 })).success).toBe(true);
    expect(targetSchema.safeParse(makeValidTarget({ month: 12 })).success).toBe(true);
  });

  it('rejects year before 2020', () => {
    expect(targetSchema.safeParse(makeValidTarget({ year: 2019 })).success).toBe(false);
  });

  it('rejects year after 2100', () => {
    expect(targetSchema.safeParse(makeValidTarget({ year: 2101 })).success).toBe(false);
  });
});

describe('FIN-QA-0019: Person schema', () => {
  it('rejects empty name', () => {
    expect(personSchema.safeParse(makeValidPerson({ name: '' })).success).toBe(false);
  });

  it('accepts valid phone format', () => {
    expect(personSchema.safeParse(makeValidPerson({ phone: '+92 300 1234567' })).success).toBe(true);
  });

  it('rejects invalid phone format', () => {
    expect(personSchema.safeParse(makeValidPerson({ phone: 'abc' })).success).toBe(false);
  });

  it('accepts empty email', () => {
    expect(personSchema.safeParse(makeValidPerson({ email: '' })).success).toBe(true);
  });

  it('rejects malformed email', () => {
    expect(personSchema.safeParse(makeValidPerson({ email: 'not-email' })).success).toBe(false);
  });
});

describe('FIN-QA-0020: Category schema', () => {
  it('accepts both groups', () => {
    expect(categorySchema.safeParse(makeValidCategory({ group: 'INCOME' })).success).toBe(true);
    expect(categorySchema.safeParse(makeValidCategory({ group: 'EXPENSE' })).success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(categorySchema.safeParse(makeValidCategory({ name: '' })).success).toBe(false);
  });

  it('rejects invalid group', () => {
    expect(categorySchema.safeParse(makeValidCategory({ group: 'OTHER' })).success).toBe(false);
  });
});

describe('FIN-QA-0021: Sports schemas', () => {
  it('team requires name', () => {
    expect(sportsTeamSchema.safeParse({ name: '', sport: 'Cricket' }).success).toBe(false);
    expect(sportsTeamSchema.safeParse({ name: 'Team A', sport: 'Cricket' }).success).toBe(true);
  });

  it('match requires teamId and date', () => {
    expect(sportsMatchSchema.safeParse({ teamId: '', matchDate: '2024-01-01' }).success).toBe(false);
    expect(sportsMatchSchema.safeParse({ teamId: 'team-1', matchDate: '' }).success).toBe(false);
    expect(sportsMatchSchema.safeParse({ teamId: 'team-1', matchDate: '2024-01-01' }).success).toBe(true);
  });

  it('expense rejects zero amount', () => {
    expect(sportsExpenseSchema.safeParse({ description: 'Ground', amount: 0 }).success).toBe(false);
  });

  it('fee rejects negative amount', () => {
    expect(sportsMatchFeeSchema.safeParse({ playerId: 'p1', amount: -100 }).success).toBe(false);
  });

  it('player requires name', () => {
    expect(sportsPlayerSchema.safeParse({ name: '' }).success).toBe(false);
    expect(sportsPlayerSchema.safeParse({ name: 'Player A' }).success).toBe(true);
  });
});

describe('FIN-QA-0022: Investment profit schema', () => {
  it('rejects zero gross amount', () => {
    expect(investmentProfitSchema.safeParse({
      type: 'PROFIT', grossAmount: 0, taxAmount: 0, netAmount: 1000, transactionDate: '2024-01-01',
    }).success).toBe(false);
  });

  it('rejects zero net amount', () => {
    expect(investmentProfitSchema.safeParse({
      type: 'PROFIT', grossAmount: 1000, taxAmount: 0, netAmount: 0, transactionDate: '2024-01-01',
    }).success).toBe(false);
  });

  it('accepts both PROFIT and LOSS types', () => {
    const base = { grossAmount: 1000, taxAmount: 0, netAmount: 1000, transactionDate: '2024-01-01' };
    expect(investmentProfitSchema.safeParse({ ...base, type: 'PROFIT' }).success).toBe(true);
    expect(investmentProfitSchema.safeParse({ ...base, type: 'LOSS' }).success).toBe(true);
  });
});

describe('FIN-QA-0023: Investment close schema', () => {
  it('rejects negative return amount', () => {
    expect(investmentCloseSchema.safeParse({
      returnAmount: -1, taxAmount: 0, netAmount: 0, transactionDate: '2024-01-01',
    }).success).toBe(false);
  });

  it('accepts zero return amount (total loss)', () => {
    expect(investmentCloseSchema.safeParse({
      returnAmount: 0, taxAmount: 0, netAmount: 0, transactionDate: '2024-01-01',
    }).success).toBe(true);
  });
});
