import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getTotalBalance, getOutstandingReceivables, getOutstandingPayables } from '@/lib/calculations/balance';
import Decimal from 'decimal.js';

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = (session.user as { id: string }).id;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Run all queries in parallel
    const [
      totalBalance,
      receivables,
      payables,
      monthlyIncome,
      monthlyExpense,
      recentTransactions,
      accountCount,
      activeLoans,
      activeCommittees,
      savingsGoals,
    ] = await Promise.all([
      getTotalBalance(userId),
      getOutstandingReceivables(userId),
      getOutstandingPayables(userId),
      // Monthly income (exclude transfers, loan principal)
      prisma.transaction.aggregate({
        where: {
          userId,
          isDeleted: false,
          transactionDate: { gte: startOfMonth, lte: endOfMonth },
          type: { in: ['INCOME', 'LOAN_REPAYMENT_RECEIVED'] },
        },
        _sum: { amount: true },
      }),
      // Monthly expense (exclude transfers, loan given)
      prisma.transaction.aggregate({
        where: {
          userId,
          isDeleted: false,
          transactionDate: { gte: startOfMonth, lte: endOfMonth },
          type: { in: ['EXPENSE'] },
        },
        _sum: { amount: true },
      }),
      // Recent transactions
      prisma.transaction.findMany({
        where: { userId, isDeleted: false },
        include: { category: true, sourceAccount: true, destAccount: true },
        orderBy: { transactionDate: 'desc' },
        take: 10,
      }),
      prisma.account.count({ where: { userId, isActive: true } }),
      prisma.loan.count({ where: { userId, status: 'ACTIVE' } }),
      prisma.committee.count({ where: { userId, status: 'ACTIVE' } }),
      prisma.savingsGoal.findMany({
        where: { userId, isActive: true },
        include: {
          transactions: {
            select: { amount: true, type: true },
          },
        },
        take: 5,
      }),
    ]);

    // Calculate savings progress
    const savingsWithProgress = savingsGoals.map((goal: {
      id: string;
      name: string;
      targetAmount: { toString(): string };
      transactions: { type: string; amount: { toString(): string } }[];
    }) => {
      const deposited = goal.transactions
        .filter((t) => t.type === 'DEPOSIT')
        .reduce((sum: Decimal, t: { amount: { toString(): string } }) => sum.plus(t.amount.toString()), new Decimal(0));
      const withdrawn = goal.transactions
        .filter((t) => t.type === 'WITHDRAWAL')
        .reduce((sum: Decimal, t: { amount: { toString(): string } }) => sum.plus(t.amount.toString()), new Decimal(0));
      const current = deposited.minus(withdrawn);
      const progress = new Decimal(goal.targetAmount.toString()).gt(0)
        ? current.div(goal.targetAmount.toString()).times(100).toNumber()
        : 0;
      return {
        id: goal.id,
        name: goal.name,
        targetAmount: goal.targetAmount.toString(),
        currentAmount: current.toString(),
        progress: Math.min(progress, 100),
      };
    });

    return NextResponse.json({
      data: {
        totalBalance: totalBalance.toString(),
        monthlyIncome: (monthlyIncome._sum.amount || 0).toString(),
        monthlyExpense: (monthlyExpense._sum.amount || 0).toString(),
        receivables: receivables.toString(),
        payables: payables.toString(),
        accountCount,
        activeLoans,
        activeCommittees,
        recentTransactions,
        savingsGoals: savingsWithProgress,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
