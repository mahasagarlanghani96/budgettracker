import prisma from '@/lib/prisma';
import Decimal from 'decimal.js';

/**
 * Transaction types that represent inflows to an account (destAccountId)
 */
const INFLOW_TYPES = [
  'INCOME',
  'TRANSFER',
  'LOAN_REPAYMENT_RECEIVED',
  'LOAN_TAKEN',
  'COMMITTEE_RECEIVING',
  'SAVINGS_WITHDRAWAL',
  'INVESTMENT_RETURN',
];

/**
 * Transaction types that represent outflows from an account (sourceAccountId)
 */
const OUTFLOW_TYPES = [
  'EXPENSE',
  'TRANSFER',
  'LOAN_GIVEN',
  'LOAN_REPAYMENT_MADE',
  'COMMITTEE_CONTRIBUTION',
  'SAVINGS_DEPOSIT',
  'INVESTMENT',
  'PLOT_PAYMENT',
];

/**
 * Calculate the current balance of an account from its opening balance + transactions.
 * Balance = Opening Balance + SUM(inflows) - SUM(outflows)
 */
export async function calculateAccountBalance(accountId: string): Promise<Decimal> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { openingBalance: true },
  });

  if (!account) throw new Error(`Account ${accountId} not found`);

  // Sum all inflows (transactions where this account is the destination)
  const inflowResult = await prisma.transaction.aggregate({
    where: {
      destAccountId: accountId,
      isDeleted: false,
      type: { in: INFLOW_TYPES as any },
    },
    _sum: { amount: true },
  });

  // Sum all outflows (transactions where this account is the source)
  const outflowResult = await prisma.transaction.aggregate({
    where: {
      sourceAccountId: accountId,
      isDeleted: false,
      type: { in: OUTFLOW_TYPES as any },
    },
    _sum: { amount: true },
  });

  const opening = new Decimal(account.openingBalance.toString());
  const inflows = new Decimal(inflowResult._sum.amount?.toString() || '0');
  const outflows = new Decimal(outflowResult._sum.amount?.toString() || '0');

  return opening.plus(inflows).minus(outflows);
}

/**
 * Calculate balances for all accounts of a user.
 */
export async function calculateAllAccountBalances(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true },
  });

  const results = await Promise.all(
    accounts.map(async (account: { id: string; [key: string]: unknown }) => {
      const balance = await calculateAccountBalance(account.id);
      return {
        ...account,
        currentBalance: balance,
      };
    })
  );

  return results;
}

/**
 * Get the total balance across all user accounts.
 */
export async function getTotalBalance(userId: string): Promise<Decimal> {
  const balances = await calculateAllAccountBalances(userId);
  return balances.reduce((sum, acc) => sum.plus(acc.currentBalance), new Decimal(0));
}

/**
 * Calculate total outstanding receivables (loans given - repayments received).
 */
export async function getOutstandingReceivables(userId: string): Promise<Decimal> {
  const loans = await prisma.loan.findMany({
    where: { userId, direction: 'GIVEN', status: 'ACTIVE' },
    include: { repayments: true },
  });

  return loans.reduce((total: Decimal, loan: { amount: { toString(): string }; repayments: { amount: { toString(): string } }[] }) => {
    const repaid = loan.repayments.reduce(
      (sum: Decimal, r: { amount: { toString(): string } }) => sum.plus(new Decimal(r.amount.toString())),
      new Decimal(0)
    );
    return total.plus(new Decimal(loan.amount.toString()).minus(repaid));
  }, new Decimal(0));
}

/**
 * Calculate total outstanding payables (loans taken - repayments made).
 */
export async function getOutstandingPayables(userId: string): Promise<Decimal> {
  const loans = await prisma.loan.findMany({
    where: { userId, direction: 'TAKEN', status: 'ACTIVE' },
    include: { repayments: true },
  });

  return loans.reduce((total: Decimal, loan: { amount: { toString(): string }; repayments: { amount: { toString(): string } }[] }) => {
    const repaid = loan.repayments.reduce(
      (sum: Decimal, r: { amount: { toString(): string } }) => sum.plus(new Decimal(r.amount.toString())),
      new Decimal(0)
    );
    return total.plus(new Decimal(loan.amount.toString()).minus(repaid));
  }, new Decimal(0));
}
