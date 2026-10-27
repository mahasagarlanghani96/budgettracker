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
      expenseByCategory,
      allCategories,
      last7DaysTxns,
    ] = await Promise.all([
      getTotalBalance(userId),
      getOutstandingReceivables(userId),
      getOutstandingPayables(userId),
      // Monthly income (all inflow types)
      prisma.transaction.aggregate({
        where: {
          userId,
          isDeleted: false,
          transactionDate: { gte: startOfMonth, lte: endOfMonth },
          type: { in: ['INCOME', 'LOAN_REPAYMENT_RECEIVED', 'COMMITTEE_RECEIVING', 'SAVINGS_WITHDRAWAL', 'INVESTMENT_RETURN', 'LOAN_TAKEN', 'SPORTS_FEE_RECEIVED'] },
        },
        _sum: { amount: true },
      }),
      // Monthly expense (all outflow types)
      prisma.transaction.aggregate({
        where: {
          userId,
          isDeleted: false,
          transactionDate: { gte: startOfMonth, lte: endOfMonth },
          type: { in: ['EXPENSE', 'LOAN_GIVEN', 'LOAN_REPAYMENT_MADE', 'COMMITTEE_CONTRIBUTION', 'SAVINGS_DEPOSIT', 'INVESTMENT', 'SPORTS_EXPENSE'] },
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
      // Expense by category (current month) for donut chart
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          isDeleted: false,
          transactionDate: { gte: startOfMonth, lte: endOfMonth },
          type: 'EXPENSE',
          categoryId: { not: null },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 6,
      }),
      // Category names lookup (include system defaults where userId is null)
      prisma.category.findMany({ where: { OR: [{ userId }, { userId: null }] }, select: { id: true, name: true } }),
      // Last 7 days income vs expense for trend mini-chart
      prisma.transaction.findMany({
        where: {
          userId,
          isDeleted: false,
          transactionDate: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6) },
          type: { in: ['INCOME', 'EXPENSE'] },
        },
        select: { type: true, amount: true, transactionDate: true },
        orderBy: { transactionDate: 'asc' },
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

    // Build category map
    const catMap = new Map(allCategories.map((c: { id: string; name: string }) => [c.id, c.name]));
    const expenseByCat = expenseByCategory.map((g: { categoryId: string | null; _sum: { amount: { toString(): string } | null } }) => ({
      name: catMap.get(g.categoryId || '') || 'Other',
      amount: (g._sum.amount || 0).toString(),
    }));

    // Build 7-day trend
    const dayMap = new Map<string, { income: number; expense: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      dayMap.set(d.toISOString().split('T')[0], { income: 0, expense: 0 });
    }
    for (const tx of last7DaysTxns) {
      const day = new Date(tx.transactionDate).toISOString().split('T')[0];
      const entry = dayMap.get(day);
      if (entry) {
        if (tx.type === 'INCOME') entry.income += parseFloat(tx.amount.toString());
        else entry.expense += parseFloat(tx.amount.toString());
      }
    }
    const weeklyTrend = Array.from(dayMap.entries()).map(([date, vals]) => ({
      date,
      income: vals.income,
      expense: vals.expense,
    }));

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
        expenseByCategory: expenseByCat,
        weeklyTrend,
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
