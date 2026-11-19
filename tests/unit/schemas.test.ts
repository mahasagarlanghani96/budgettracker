import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, accountSchema, transactionSchema, loanSchema } from '@/lib/validations/schemas';

describe('registerSchema', () => {
  it('accepts valid registration', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short name', () => {
    const result = registerSchema.safeParse({
      name: 'A',
      email: 'test@example.com',
      password: 'Password1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'not-an-email',
      password: 'Password1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without uppercase', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without lowercase', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      password: 'PASSWORD1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without number', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 chars', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Pass1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password longer than 72 chars', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      password: 'A'.repeat(70) + 'a1' + 'x',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid login', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'anything',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('accountSchema', () => {
  it('accepts valid account', () => {
    const result = accountSchema.safeParse({
      name: 'My Cash',
      accountType: 'CASH',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = accountSchema.safeParse({
      name: '',
      accountType: 'BANK',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid account type', () => {
    const result = accountSchema.safeParse({
      name: 'Test',
      accountType: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative opening balance', () => {
    const result = accountSchema.safeParse({
      name: 'Test',
      accountType: 'BANK',
      openingBalance: -100,
    });
    expect(result.success).toBe(false);
  });

  it('defaults openingBalance to 0', () => {
    const result = accountSchema.safeParse({
      name: 'Test',
      accountType: 'CASH',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.openingBalance).toBe(0);
    }
  });
});

describe('transactionSchema', () => {
  it('accepts valid income transaction', () => {
    const result = transactionSchema.safeParse({
      type: 'INCOME',
      amount: 50000,
      transactionDate: '2024-01-15',
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero amount', () => {
    const result = transactionSchema.safeParse({
      type: 'EXPENSE',
      amount: 0,
      transactionDate: '2024-01-15',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = transactionSchema.safeParse({
      type: 'EXPENSE',
      amount: -100,
      transactionDate: '2024-01-15',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing date', () => {
    const result = transactionSchema.safeParse({
      type: 'INCOME',
      amount: 1000,
      transactionDate: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid transaction type', () => {
    const result = transactionSchema.safeParse({
      type: 'INVALID_TYPE',
      amount: 1000,
      transactionDate: '2024-01-15',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid transaction types', () => {
    const types = [
      'INCOME', 'EXPENSE', 'TRANSFER', 'LOAN_GIVEN', 'LOAN_REPAYMENT_RECEIVED',
      'LOAN_TAKEN', 'LOAN_REPAYMENT_MADE', 'COMMITTEE_CONTRIBUTION',
      'COMMITTEE_RECEIVING', 'SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL',
      'INVESTMENT', 'INVESTMENT_RETURN', 'PLOT_PAYMENT', 'OTHER',
    ];
    for (const type of types) {
      const result = transactionSchema.safeParse({
        type,
        amount: 100,
        transactionDate: '2024-01-01',
      });
      expect(result.success, `Expected ${type} to be valid`).toBe(true);
    }
  });
});

describe('loanSchema', () => {
  it('accepts valid loan given', () => {
    const result = loanSchema.safeParse({
      personId: 'person-123',
      direction: 'GIVEN',
      amount: 10000,
      accountId: 'account-123',
      transactionDate: '2024-01-15',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid loan taken', () => {
    const result = loanSchema.safeParse({
      personId: 'person-123',
      direction: 'TAKEN',
      amount: 5000,
      accountId: 'account-123',
      transactionDate: '2024-01-15',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid direction', () => {
    const result = loanSchema.safeParse({
      personId: 'person-123',
      direction: 'BORROWED',
      amount: 5000,
      accountId: 'account-123',
      transactionDate: '2024-01-15',
    });
    expect(result.success).toBe(false);
  });

  it('rejects interest rate over 100%', () => {
    const result = loanSchema.safeParse({
      personId: 'person-123',
      direction: 'GIVEN',
      amount: 5000,
      accountId: 'account-123',
      transactionDate: '2024-01-15',
      interestRate: 150,
    });
    expect(result.success).toBe(false);
  });
});
