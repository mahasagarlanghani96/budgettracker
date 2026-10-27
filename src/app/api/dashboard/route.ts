import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getTotalBalance, getOutstandingReceivables, getOutstandingPayables } from '@/lib/calculations/balance';
import Decimal from 'decimal.js';

const INFLOW_TYPES: any[] = [
  'INCOME', 'LOAN_REPAYMENT_RECEIVED', 'COMMITTEE_RECEIVING',
  'SAVINGS_WITHDRAWAL', 'INVESTMENT_RETURN', 'LOAN_TAKEN', 'SPORTS_FEE_RECEIVED',
];
const OUTFLOW_TYPES: any[] = [
  'EXPENSE', 'LOAN_GIVEN', 'LOAN_REPAYMENT_MADE', 'COMMITTEE_CONTRIBUTION',
  'SAVINGS_DEPOSIT', 'INVESTMENT', 'SPORTS_EXPENSE', 'PLOT_PAYMENT',
];

const SPENDING_TYPES: any[] = ['EXPENSE', 'COMMITTEE_CONTRIBUTION', 'SPORTS_EXPENSE', 'PLOT_PAYMENT'];
const EARNING_TYPES: any[] = ['INCOME', 'SPORTS_FEE_RECEIVED', 'COMMITTEE_RECEIVING'];

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = (session.user as { id: string }).id;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

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
      incomeByType,
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
          type: { in: INFLOW_TYPES },
        },
        _sum: { amount: true },
      }),
      // Monthly expense (all outflow types)
      prisma.transaction.aggregate({
        where: {
          userId,
          isDeleted: false,
          transactionDate: { gte: startOfMonth, lte: endOfMonth },
          type: { in: OUTFLOW_TYPES },
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
      // Spending breakdown by category (current month)
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          isDeleted: false,
          transactionDate: { gte: startOfMonth, lte: endOfMonth },
          type: { in: SPENDING_TYPES },
          categoryId: { not: null },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 6,
      }),
      // Income breakdown by type (current month)
      prisma.transaction.groupBy({
        by: ['type', 'categoryId'],
        where: {
          userId,
          isDeleted: false,
          transactionDate: { gte: startOfMonth, lte: endOfMonth },
          type: { in: EARNING_TYPES },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      // Category names lookup (include system defaults where userId is null)
      prisma.category.findMany({ where: { OR: [{ userId }, { userId: null }] }, select: { id: true, name: true } }),
      // Last 7 days all inflow + outflow for trend chart
      prisma.transaction.findMany({
        where: {
          userId,
          isDeleted: false,
          transactionDate: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6) },
          type: { in: [...INFLOW_TYPES, ...OUTFLOW_TYPES] },
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

    // Build income breakdown — group by category name or type label
    const TYPE_LABELS: Record<string, string> = {
      INCOME: 'Income',
      SPORTS_FEE_RECEIVED: 'Sports Fees',
      COMMITTEE_RECEIVING: 'Committee',
    };
    const incomeMap = new Map<string, number>();
    for (const g of incomeByType as Array<{ type: string; categoryId: string | null; _sum: { amount: { toString(): string } | null } }>) {
      const label = (g.categoryId && catMap.get(g.categoryId)) || TYPE_LABELS[g.type] || g.type.replace(/_/g, ' ');
      const amt = parseFloat((g._sum.amount || 0).toString());
      incomeMap.set(label, (incomeMap.get(label) || 0) + amt);
    }
    const incomeByCat = Array.from(incomeMap.entries())
      .map(([name, amount]) => ({ name, amount: amount.toString() }))
      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
      .slice(0, 6);

    // Build 7-day trend with all inflow/outflow types
    const inflowSet = new Set(INFLOW_TYPES);
    const dayMap = new Map<string, { income: number; expense: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      dayMap.set(d.toISOString().split('T')[0], { income: 0, expense: 0 });
    }
    for (const tx of last7DaysTxns) {
      const day = new Date(tx.transactionDate).toISOString().split('T')[0];
      const entry = dayMap.get(day);
      if (entry) {
        const amt = parseFloat(tx.amount.toString());
        if (inflowSet.has(tx.type)) {
          entry.income += amt;
        } else {
          entry.expense += amt;
        }
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
        incomeByCategory: incomeByCat,
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
