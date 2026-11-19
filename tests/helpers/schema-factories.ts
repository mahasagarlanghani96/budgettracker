/**
 * Test data factories for creating valid schema-compliant objects.
 * Each factory returns a minimal valid object that can be overridden.
 */

export function makeValidRegistration(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test User',
    email: 'test@example.com',
    password: 'SecurePass1',
    ...overrides,
  };
}

export function makeValidAccount(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Account',
    accountType: 'CASH' as const,
    openingBalance: 0,
    currency: 'PKR',
    ...overrides,
  };
}

export function makeValidTransaction(overrides: Record<string, unknown> = {}) {
  return {
    type: 'EXPENSE' as const,
    amount: 1000,
    transactionDate: '2024-06-15',
    ...overrides,
  };
}

export function makeValidLoan(overrides: Record<string, unknown> = {}) {
  return {
    personId: 'person-test',
    direction: 'GIVEN' as const,
    amount: 10000,
    accountId: 'account-test',
    transactionDate: '2024-06-15',
    ...overrides,
  };
}

export function makeValidCommittee(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Committee',
    type: 'NORMAL' as const,
    startDate: '2024-01-01',
    memberCount: 10,
    monthlyContribution: 10000,
    ...overrides,
  };
}

export function makeValidSavingsGoal(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Emergency Fund',
    targetAmount: 500000,
    ...overrides,
  };
}

export function makeValidInvestment(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Investment',
    investmentType: 'stocks',
    amountInvested: 50000,
    accountId: 'account-test',
    investmentDate: '2024-06-15',
    ...overrides,
  };
}

export function makeValidPlot(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Plot A',
    totalPrice: 2500000,
    ...overrides,
  };
}

export function makeValidTarget(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Monthly Expense Limit',
    type: 'MAX_EXPENSE' as const,
    amount: 50000,
    month: 6,
    year: 2024,
    ...overrides,
  };
}

export function makeValidPerson(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Person',
    ...overrides,
  };
}

export function makeValidCategory(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Category',
    group: 'EXPENSE' as const,
    ...overrides,
  };
}
