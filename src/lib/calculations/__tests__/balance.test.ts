import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock must be defined via vi.hoisted so the factory below (hoisted to the
// top of the file by Vitest) and the tests can share the same mock object.
const mockPrisma = vi.hoisted(() => ({
  account: { findUnique: vi.fn() },
  transaction: { aggregate: vi.fn() },
  loan: { findMany: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

// Import the real module under test — no duplicated logic. If someone edits
// the classification rules or the TransactionType enum without keeping both
// in sync, these tests exercise the actual code and will catch it.
import {
  INFLOW_TYPES,
  OUTFLOW_TYPES,
  calculateAccountBalance,
  getOutstandingReceivables,
  getOutstandingPayables,
} from '../balance';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Transaction type classification', () => {
  it('classifies INCOME as inflow only', () => {
    expect(INFLOW_TYPES).toContain('INCOME');
    expect(OUTFLOW_TYPES).not.toContain('INCOME');
  });

  it('classifies EXPENSE as outflow only', () => {
    expect(OUTFLOW_TYPES).toContain('EXPENSE');
    expect(INFLOW_TYPES).not.toContain('EXPENSE');
  });

  it('classifies TRANSFER as both inflow and outflow (net zero across the two accounts involved)', () => {
    expect(INFLOW_TYPES).toContain('TRANSFER');
    expect(OUTFLOW_TYPES).toContain('TRANSFER');
  });

  it('classifies LOAN_GIVEN as outflow, not an expense', () => {
    expect(OUTFLOW_TYPES).toContain('LOAN_GIVEN');
    expect(INFLOW_TYPES).not.toContain('LOAN_GIVEN');
  });

  it('classifies LOAN_TAKEN as inflow', () => {
    expect(INFLOW_TYPES).toContain('LOAN_TAKEN');
    expect(OUTFLOW_TYPES).not.toContain('LOAN_TAKEN');
  });

  it('classifies LOAN_REPAYMENT_RECEIVED as inflow, not income', () => {
    expect(INFLOW_TYPES).toContain('LOAN_REPAYMENT_RECEIVED');
  });

  it('classifies LOAN_REPAYMENT_MADE as outflow', () => {
    expect(OUTFLOW_TYPES).toContain('LOAN_REPAYMENT_MADE');
  });

  it('classifies COMMITTEE_CONTRIBUTION as outflow and COMMITTEE_RECEIVING as inflow', () => {
    expect(OUTFLOW_TYPES).toContain('COMMITTEE_CONTRIBUTION');
    expect(INFLOW_TYPES).toContain('COMMITTEE_RECEIVING');
  });

  it('classifies SAVINGS_DEPOSIT as outflow and SAVINGS_WITHDRAWAL as inflow', () => {
    expect(OUTFLOW_TYPES).toContain('SAVINGS_DEPOSIT');
    expect(INFLOW_TYPES).toContain('SAVINGS_WITHDRAWAL');
  });

  it('classifies INVESTMENT as outflow and INVESTMENT_RETURN as inflow', () => {
    expect(OUTFLOW_TYPES).toContain('INVESTMENT');
    expect(INFLOW_TYPES).toContain('INVESTMENT_RETURN');
  });

  it('classifies PLOT_PAYMENT as outflow', () => {
    expect(OUTFLOW_TYPES).toContain('PLOT_PAYMENT');
  });

  it('does not classify OTHER as inflow or outflow', () => {
    expect(INFLOW_TYPES).not.toContain('OTHER');
    expect(OUTFLOW_TYPES).not.toContain('OTHER');
  });
});

describe('calculateAccountBalance', () => {
  it('returns the opening balance when there are no transactions', async () => {
    mockPrisma.account.findUnique.mockResolvedValue({ openingBalance: '10000' });
    mockPrisma.transaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: null } }) // inflows
      .mockResolvedValueOnce({ _sum: { amount: null } }); // outflows

    const balance = await calculateAccountBalance('acc-1');

    expect(balance.toString()).toBe('10000');
  });

  it('adds inflows and subtracts outflows from the opening balance', async () => {
    mockPrisma.account.findUnique.mockResolvedValue({ openingBalance: '10000' });
    mockPrisma.transaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: '155000' } }) // inflows
      .mockResolvedValueOnce({ _sum: { amount: '31000' } }); // outflows

    const balance = await calculateAccountBalance('acc-1');

    // 10000 + 155000 - 31000 = 134000
    expect(balance.toString()).toBe('134000');
  });

  it('allows the resulting balance to go negative', async () => {
    mockPrisma.account.findUnique.mockResolvedValue({ openingBalance: '1000' });
    mockPrisma.transaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: '5000' } });

    const balance = await calculateAccountBalance('acc-1');

    expect(balance.toString()).toBe('-4000');
  });

  it('only sums transactions that are not soft-deleted, scoped to this account', async () => {
    mockPrisma.account.findUnique.mockResolvedValue({ openingBalance: '0' });
    mockPrisma.transaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: '0' } })
      .mockResolvedValueOnce({ _sum: { amount: '0' } });

    await calculateAccountBalance('acc-1');

    expect(mockPrisma.transaction.aggregate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({ destAccountId: 'acc-1', isDeleted: false }),
    }));
    expect(mockPrisma.transaction.aggregate).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ sourceAccountId: 'acc-1', isDeleted: false }),
    }));
  });

  it('throws when the account does not exist', async () => {
    mockPrisma.account.findUnique.mockResolvedValue(null);

    await expect(calculateAccountBalance('missing')).rejects.toThrow('Account missing not found');
  });
});

describe('getOutstandingReceivables / getOutstandingPayables', () => {
  it('sums unpaid amounts (loan amount minus repayments) for GIVEN loans', async () => {
    mockPrisma.loan.findMany.mockResolvedValue([
      { amount: '50000', repayments: [{ amount: '20000' }] },
      { amount: '10000', repayments: [] },
    ]);

    const total = await getOutstandingReceivables('user-1');

    // (50000 - 20000) + (10000 - 0) = 40000
    expect(total.toString()).toBe('40000');
    expect(mockPrisma.loan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', direction: 'GIVEN', status: 'ACTIVE' } })
    );
  });

  it('sums unpaid amounts for TAKEN loans', async () => {
    mockPrisma.loan.findMany.mockResolvedValue([
      { amount: '30000', repayments: [{ amount: '5000' }, { amount: '5000' }] },
    ]);

    const total = await getOutstandingPayables('user-1');

    // 30000 - (5000 + 5000) = 20000
    expect(total.toString()).toBe('20000');
    expect(mockPrisma.loan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', direction: 'TAKEN', status: 'ACTIVE' } })
    );
  });
});
