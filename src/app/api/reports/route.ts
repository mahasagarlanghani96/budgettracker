import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import Decimal from 'decimal.js';

// GET /api/reports?from=&to=&type=
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const userId = (session.user as { id: string }).id;

    const from = searchParams.get('from')
      ? new Date(searchParams.get('from')!)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = searchParams.get('to')
      ? new Date(searchParams.get('to')!)
      : new Date();
    const reportType = searchParams.get('type') || 'summary';

    const dateFilter = { gte: from, lte: to };

    if (reportType === 'income-expense') {
      // Group income and expenses by category
      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          isDeleted: false,
          transactionDate: dateFilter,
          type: { in: ['INCOME', 'EXPENSE'] },
        },
        include: { category: true },
      });

      const incomeByCategory: Record<string, { name: string; total: string }> = {};
      const expenseByCategory: Record<string, { name: string; total: string }> = {};

      for (const tx of transactions) {
        const catName = tx.category?.name || 'Uncategorized';
        const catId = tx.categoryId || 'uncategorized';
        const target = tx.type === 'INCOME' ? incomeByCategory : expenseByCategory;

        if (!target[catId]) {
          target[catId] = { name: catName, total: '0' };
        }
        target[catId].total = new Decimal(target[catId].total).plus(tx.amount.toString()).toString();
      }

      return NextResponse.json({
        data: {
          type: 'income-expense',
          period: { from: from.toISOString(), to: to.toISOString() },
          incomeByCategory: Object.values(incomeByCategory),
          expenseByCategory: Object.values(expenseByCategory),
        },
      });
    }

    if (reportType === 'daily') {
      // Daily totals
      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          isDeleted: false,
          transactionDate: dateFilter,
          type: { in: ['INCOME', 'EXPENSE'] },
        },
        orderBy: { transactionDate: 'asc' },
      });

      const dailyMap: Record<string, { income: Decimal; expense: Decimal }> = {};

      for (const tx of transactions) {
        const dateKey = tx.transactionDate.toISOString().split('T')[0];
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { income: new Decimal(0), expense: new Decimal(0) };
        }
        if (tx.type === 'INCOME') {
          dailyMap[dateKey].income = dailyMap[dateKey].income.plus(tx.amount.toString());
        } else {
          dailyMap[dateKey].expense = dailyMap[dateKey].expense.plus(tx.amount.toString());
        }
      }

      const dailyData = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          income: data.income.toString(),
          expense: data.expense.toString(),
          net: data.income.minus(data.expense).toString(),
        }));

      return NextResponse.json({
        data: { type: 'daily', period: { from: from.toISOString(), to: to.toISOString() }, dailyData },
      });
    }

    // Default: summary report
    const [income, expense, transfers] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, isDeleted: false, transactionDate: dateFilter, type: 'INCOME' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { userId, isDeleted: false, transactionDate: dateFilter, type: 'EXPENSE' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { userId, isDeleted: false, transactionDate: dateFilter, type: 'TRANSFER' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const totalIncome = new Decimal((income._sum.amount || 0).toString());
    const totalExpense = new Decimal((expense._sum.amount || 0).toString());

    return NextResponse.json({
      data: {
        type: 'summary',
        period: { from: from.toISOString(), to: to.toISOString() },
        totalIncome: totalIncome.toString(),
        totalExpense: totalExpense.toString(),
        netSavings: totalIncome.minus(totalExpense).toString(),
        totalTransfers: (transfers._sum.amount || 0).toString(),
        transactionCounts: {
          income: income._count,
          expense: expense._count,
          transfers: transfers._count,
        },
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /api/reports error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
