import { describe, it, expect, vi, beforeEach } from 'vitest';
import Decimal from 'decimal.js';

const mockTx = vi.hoisted(() => ({
  transaction: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  loan: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: mockTx,
  prisma: mockTx,
}));

import { findLedgerEntry, softDeleteLedgerEntry, recalculateLoan } from '@/lib/ledger';

beforeEach(() => {
  vi.clearAllMocks();
});

// --- FIN-QA-0030 through FIN-QA-0040: Ledger logic ---

describe('FIN-QA-0030: findLedgerEntry', () => {
  it('returns linked entry when link field matches', async () => {
    const entry = { id: 'tx-1', type: 'LOAN_GIVEN', isDeleted: false };
    mockTx.transaction.findFirst.mockResolvedValueOnce(entry);

    const result = await findLedgerEntry(mockTx, {
      link: { loanId: 'loan-1' },
      userId: 'user-1',
      type: 'LOAN_GIVEN',
      amount: { toString: () => '10000' },
      sourceAccountId: 'acc-1',
      transactionDate: new Date('2024-06-01'),
    });

    expect(result).toBe(entry);
    expect(mockTx.transaction.findFirst).toHaveBeenCalledTimes(1);
  });

  it('falls back to unlinked match when no linked entry exists', async () => {
    const unlinkedEntry = { id: 'tx-2', type: 'LOAN_GIVEN', isDeleted: false };
    mockTx.transaction.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(unlinkedEntry);

    const result = await findLedgerEntry(mockTx, {
      link: { loanId: 'loan-1' },
      userId: 'user-1',
      type: 'LOAN_GIVEN',
      amount: { toString: () => '10000' },
      sourceAccountId: 'acc-1',
      transactionDate: new Date('2024-06-01'),
    });

    expect(result).toBe(unlinkedEntry);
    expect(mockTx.transaction.findFirst).toHaveBeenCalledTimes(2);
  });

  it('returns null when no entry matches', async () => {
    mockTx.transaction.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await findLedgerEntry(mockTx, {
      link: { loanId: 'loan-1' },
      userId: 'user-1',
      type: 'LOAN_GIVEN',
      amount: { toString: () => '10000' },
      sourceAccountId: 'acc-1',
      transactionDate: new Date('2024-06-01'),
    });

    expect(result).toBeNull();
  });
});

describe('FIN-QA-0031: softDeleteLedgerEntry', () => {
  it('marks found entry as deleted', async () => {
    const entry = { id: 'tx-1' };
    mockTx.transaction.findFirst.mockResolvedValueOnce(entry);
    mockTx.transaction.update.mockResolvedValueOnce({});

    await softDeleteLedgerEntry(mockTx, {
      link: { loanId: 'loan-1' },
      userId: 'user-1',
      type: 'LOAN_GIVEN',
      amount: { toString: () => '10000' },
      sourceAccountId: 'acc-1',
      transactionDate: new Date('2024-06-01'),
    });

    expect(mockTx.transaction.update).toHaveBeenCalledWith({
      where: { id: 'tx-1' },
      data: { isDeleted: true, deletedAt: expect.any(Date) },
    });
  });

  it('does nothing when no entry exists', async () => {
    mockTx.transaction.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await softDeleteLedgerEntry(mockTx, {
      link: { loanId: 'loan-1' },
      userId: 'user-1',
      type: 'LOAN_GIVEN',
      amount: { toString: () => '10000' },
      sourceAccountId: 'acc-1',
      transactionDate: new Date('2024-06-01'),
    });

    expect(mockTx.transaction.update).not.toHaveBeenCalled();
  });
});

describe('FIN-QA-0032: recalculateLoan', () => {
  it('settles loan when repayments equal principal', async () => {
    mockTx.loan.findUnique.mockResolvedValue({
      id: 'loan-1',
      amount: '10000',
      remainingAmount: '5000',
      status: 'ACTIVE',
      repayments: [{ amount: '5000' }, { amount: '5000' }],
    });
    mockTx.loan.update.mockResolvedValue({});

    await recalculateLoan(mockTx, 'loan-1');

    expect(mockTx.loan.update).toHaveBeenCalledWith({
      where: { id: 'loan-1' },
      data: { remainingAmount: '0', status: 'SETTLED' },
    });
  });

  it('keeps active when partial repayment', async () => {
    mockTx.loan.findUnique.mockResolvedValue({
      id: 'loan-1',
      amount: '10000',
      remainingAmount: '10000',
      status: 'ACTIVE',
      repayments: [{ amount: '3000' }],
    });
    mockTx.loan.update.mockResolvedValue({});

    await recalculateLoan(mockTx, 'loan-1');

    expect(mockTx.loan.update).toHaveBeenCalledWith({
      where: { id: 'loan-1' },
      data: { remainingAmount: '7000', status: 'ACTIVE' },
    });
  });

  it('reopens auto-settled loan when repayment is removed', async () => {
    mockTx.loan.findUnique.mockResolvedValue({
      id: 'loan-1',
      amount: '10000',
      remainingAmount: '0',
      status: 'SETTLED',
      repayments: [{ amount: '5000' }],
    });
    mockTx.loan.update.mockResolvedValue({});

    await recalculateLoan(mockTx, 'loan-1');

    expect(mockTx.loan.update).toHaveBeenCalledWith({
      where: { id: 'loan-1' },
      data: { remainingAmount: '5000', status: 'ACTIVE' },
    });
  });

  it('floors remaining at zero when overpaid', async () => {
    mockTx.loan.findUnique.mockResolvedValue({
      id: 'loan-1',
      amount: '10000',
      remainingAmount: '10000',
      status: 'ACTIVE',
      repayments: [{ amount: '15000' }],
    });
    mockTx.loan.update.mockResolvedValue({});

    await recalculateLoan(mockTx, 'loan-1');

    expect(mockTx.loan.update).toHaveBeenCalledWith({
      where: { id: 'loan-1' },
      data: { remainingAmount: '0', status: 'SETTLED' },
    });
  });

  it('does nothing when loan does not exist', async () => {
    mockTx.loan.findUnique.mockResolvedValue(null);

    await recalculateLoan(mockTx, 'missing');

    expect(mockTx.loan.update).not.toHaveBeenCalled();
  });

  it('does not reopen manually settled loan', async () => {
    mockTx.loan.findUnique.mockResolvedValue({
      id: 'loan-1',
      amount: '10000',
      remainingAmount: '5000',
      status: 'SETTLED',
      repayments: [{ amount: '3000' }],
    });
    mockTx.loan.update.mockResolvedValue({});

    await recalculateLoan(mockTx, 'loan-1');

    const updateCall = mockTx.loan.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe('SETTLED');
  });
});
