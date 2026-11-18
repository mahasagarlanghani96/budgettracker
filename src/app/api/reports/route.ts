import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import Decimal from 'decimal.js';

const ALL_INFLOW_TYPES = ['INCOME', 'LOAN_REPAYMENT_RECEIVED', 'COMMITTEE_RECEIVING', 'SAVINGS_WITHDRAWAL', 'INVESTMENT_RETURN', 'LOAN_TAKEN'] as const;
const ALL_OUTFLOW_TYPES = ['EXPENSE', 'LOAN_GIVEN', 'LOAN_REPAYMENT_MADE', 'COMMITTEE_CONTRIBUTION', 'SAVINGS_DEPOSIT', 'INVESTMENT'] as const;

function buildBaseWhere(userId: string, from: Date, to: Date, params: URLSearchParams) {
  const where: Record<string, unknown> = {
    userId,
    isDeleted: false,
    transactionDate: { gte: from, lte: to },
  };

  const accountId = params.get('accountId');
  if (accountId) {
    where.OR = [{ sourceAccountId: accountId }, { destAccountId: accountId }];
  }

  const categoryId = params.get('categoryId');
  if (categoryId) {
    where.categoryId = categoryId;
  }

  const personId = params.get('personId');
  if (personId) {
    where.personId = personId;
  }

  const transactionType = params.get('transactionType');
  if (transactionType) {
    const types = transactionType.split(',').filter(Boolean);
    if (types.length === 1) {
      where.type = types[0];
    } else if (types.length > 1) {
      where.type = { in: types };
    }
  }

  return where;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const userId = (session.user as { id: string }).id;

    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    const from = fromStr
      ? new Date(fromStr + 'T00:00:00.000Z')
      : new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1));
    const to = toStr
      ? new Date(toStr + 'T23:59:59.999Z')
      : new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 23, 59, 59, 999));
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    const reportType = searchParams.get('type') || 'summary';

    if (reportType === 'income-expense') {
      const baseWhere = buildBaseWhere(userId, from, to, searchParams);
      if (!baseWhere.type) {
        baseWhere.type = { in: [...ALL_INFLOW_TYPES, ...ALL_OUTFLOW_TYPES] as any };
      }
      const transactions = await prisma.transaction.findMany({
        where: baseWhere as any,
        include: { category: true },
      });

      const incomeByCategory: Record<string, { name: string; total: string; count: number }> = {};
      const expenseByCategory: Record<string, { name: string; total: string; count: number }> = {};

      for (const tx of transactions) {
        const catName = tx.category?.name || 'Uncategorized';
        const catId = tx.categoryId || 'uncategorized';
        const isInflow = (ALL_INFLOW_TYPES as readonly string[]).includes(tx.type);
        const target = isInflow ? incomeByCategory : expenseByCategory;

        if (!target[catId]) {
          target[catId] = { name: catName, total: '0', count: 0 };
        }
        target[catId].total = new Decimal(target[catId].total).plus(tx.amount.toString()).toString();
        target[catId].count++;
      }

      const sortByTotal = (a: { total: string }, b: { total: string }) =>
        new Decimal(b.total).minus(a.total).toNumber();

      return NextResponse.json({
        data: {
          type: 'income-expense',
          period: { from: from.toISOString(), to: to.toISOString() },
          incomeByCategory: Object.values(incomeByCategory).sort(sortByTotal),
          expenseByCategory: Object.values(expenseByCategory).sort(sortByTotal),
        },
      });
    }

    if (reportType === 'daily') {
      const baseWhere = buildBaseWhere(userId, from, to, searchParams);
      if (!baseWhere.type) {
        baseWhere.type = { in: [...ALL_INFLOW_TYPES, ...ALL_OUTFLOW_TYPES] as any };
      }
      const transactions = await prisma.transaction.findMany({
        where: baseWhere as any,
        orderBy: { transactionDate: 'asc' },
      });

      const dailyMap: Record<string, { income: Decimal; expense: Decimal; count: number }> = {};

      for (const tx of transactions) {
        const dateKey = tx.transactionDate.toISOString().split('T')[0];
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { income: new Decimal(0), expense: new Decimal(0), count: 0 };
        }
        dailyMap[dateKey].count++;
        if ((ALL_INFLOW_TYPES as readonly string[]).includes(tx.type)) {
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
          count: data.count,
        }));

      return NextResponse.json({
        data: { type: 'daily', period: { from: from.toISOString(), to: to.toISOString() }, dailyData },
      });
    }

    if (reportType === 'by-account') {
      const baseWhere = buildBaseWhere(userId, from, to, searchParams);
      if (!baseWhere.type) {
        baseWhere.type = { in: [...ALL_INFLOW_TYPES, ...ALL_OUTFLOW_TYPES, 'TRANSFER'] as any };
      }
      const transactions = await prisma.transaction.findMany({
        where: baseWhere as any,
        include: { sourceAccount: true, destAccount: true },
      });

      const accountMap: Record<string, { name: string; inflow: Decimal; outflow: Decimal; count: number }> = {};

      for (const tx of transactions) {
        const isInflow = (ALL_INFLOW_TYPES as readonly string[]).includes(tx.type);
        const isOutflow = (ALL_OUTFLOW_TYPES as readonly string[]).includes(tx.type);

        if (tx.sourceAccountId && tx.sourceAccount) {
          const id = tx.sourceAccountId;
          if (!accountMap[id]) {
            accountMap[id] = { name: tx.sourceAccount.name, inflow: new Decimal(0), outflow: new Decimal(0), count: 0 };
          }
          accountMap[id].count++;
          if (isInflow) {
            accountMap[id].inflow = accountMap[id].inflow.plus(tx.amount.toString());
          } else if (isOutflow || tx.type === 'TRANSFER') {
            accountMap[id].outflow = accountMap[id].outflow.plus(tx.amount.toString());
          }
        }

        if (tx.type === 'TRANSFER' && tx.destAccountId && tx.destAccount) {
          const id = tx.destAccountId;
          if (!accountMap[id]) {
            accountMap[id] = { name: tx.destAccount.name, inflow: new Decimal(0), outflow: new Decimal(0), count: 0 };
          }
          accountMap[id].inflow = accountMap[id].inflow.plus(tx.amount.toString());
        }
      }

      const accountData = Object.entries(accountMap)
        .map(([id, data]) => ({
          id,
          name: data.name,
          inflow: data.inflow.toString(),
          outflow: data.outflow.toString(),
          net: data.inflow.minus(data.outflow).toString(),
          count: data.count,
        }))
        .sort((a, b) => new Decimal(b.net).minus(a.net).toNumber());

      return NextResponse.json({
        data: { type: 'by-account', period: { from: from.toISOString(), to: to.toISOString() }, accountData },
      });
    }

    if (reportType === 'by-person') {
      const baseWhere = buildBaseWhere(userId, from, to, searchParams);
      baseWhere.personId = baseWhere.personId || { not: null };
      if (!baseWhere.type) {
        baseWhere.type = { in: [...ALL_INFLOW_TYPES, ...ALL_OUTFLOW_TYPES] as any };
      }

      const transactions = await prisma.transaction.findMany({
        where: baseWhere as any,
        include: { person: true },
      });

      const personMap: Record<string, { name: string; inflow: Decimal; outflow: Decimal; count: number }> = {};

      for (const tx of transactions) {
        if (!tx.personId || !tx.person) continue;
        const id = tx.personId;
        if (!personMap[id]) {
          personMap[id] = { name: tx.person.name, inflow: new Decimal(0), outflow: new Decimal(0), count: 0 };
        }
        personMap[id].count++;
        if ((ALL_INFLOW_TYPES as readonly string[]).includes(tx.type)) {
          personMap[id].inflow = personMap[id].inflow.plus(tx.amount.toString());
        } else {
          personMap[id].outflow = personMap[id].outflow.plus(tx.amount.toString());
        }
      }

      const personData = Object.entries(personMap)
        .map(([id, data]) => ({
          id,
          name: data.name,
          inflow: data.inflow.toString(),
          outflow: data.outflow.toString(),
          net: data.inflow.minus(data.outflow).toString(),
          count: data.count,
        }))
        .sort((a, b) => new Decimal(b.net).minus(a.net).toNumber());

      return NextResponse.json({
        data: { type: 'by-person', period: { from: from.toISOString(), to: to.toISOString() }, personData },
      });
    }

    if (reportType === 'by-type') {
      const baseWhere = buildBaseWhere(userId, from, to, searchParams);
      if (!baseWhere.type) {
        baseWhere.type = { in: [...ALL_INFLOW_TYPES, ...ALL_OUTFLOW_TYPES, 'TRANSFER', 'OTHER', 'PLOT_PAYMENT', 'SPORTS_FEE_RECEIVED', 'SPORTS_EXPENSE'] as any };
      }

      const transactions = await prisma.transaction.findMany({
        where: baseWhere as any,
      });

      const typeMap: Record<string, { total: Decimal; count: number }> = {};

      for (const tx of transactions) {
        if (!typeMap[tx.type]) {
          typeMap[tx.type] = { total: new Decimal(0), count: 0 };
        }
        typeMap[tx.type].total = typeMap[tx.type].total.plus(tx.amount.toString());
        typeMap[tx.type].count++;
      }

      const typeData = Object.entries(typeMap)
        .map(([type, data]) => ({
          type,
          label: type.replace(/_/g, ' '),
          total: data.total.toString(),
          count: data.count,
          flow: (ALL_INFLOW_TYPES as readonly string[]).includes(type) ? 'inflow' : 'outflow',
        }))
        .sort((a, b) => new Decimal(b.total).minus(a.total).toNumber());

      return NextResponse.json({
        data: { type: 'by-type', period: { from: from.toISOString(), to: to.toISOString() }, typeData },
      });
    }

    // Default: summary report
    const baseWhere = buildBaseWhere(userId, from, to, searchParams);
    const incomeWhere = { ...baseWhere, type: baseWhere.type || { in: ALL_INFLOW_TYPES as any } };
    const expenseWhere = { ...baseWhere, type: baseWhere.type || { in: ALL_OUTFLOW_TYPES as any } };
    const transferWhere = { ...baseWhere, type: baseWhere.type || ('TRANSFER' as any) };

    if (baseWhere.type) {
      const typeArr = Array.isArray((baseWhere.type as any)?.in) ? (baseWhere.type as any).in : [baseWhere.type];
      const inflowFiltered = typeArr.filter((t: string) => (ALL_INFLOW_TYPES as readonly string[]).includes(t));
      const outflowFiltered = typeArr.filter((t: string) => (ALL_OUTFLOW_TYPES as readonly string[]).includes(t));
      const hasTransfer = typeArr.includes('TRANSFER');
      incomeWhere.type = inflowFiltered.length ? { in: inflowFiltered } : { in: [] };
      expenseWhere.type = outflowFiltered.length ? { in: outflowFiltered } : { in: [] };
      transferWhere.type = hasTransfer ? 'TRANSFER' : { in: [] };
    }

    // Remove OR from aggregate queries since they don't support it well with other filters
    const cleanWhere = (w: Record<string, unknown>) => {
      const copy = { ...w };
      if (copy.OR) {
        delete copy.OR;
        const accountId = searchParams.get('accountId');
        if (accountId) {
          copy.OR = [{ sourceAccountId: accountId }, { destAccountId: accountId }];
        }
      }
      return copy;
    };

    const [income, expense, transfers] = await Promise.all([
      prisma.transaction.aggregate({
        where: cleanWhere(incomeWhere) as any,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: cleanWhere(expenseWhere) as any,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: cleanWhere(transferWhere) as any,
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
