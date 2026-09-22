import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { targetSchema } from '@/lib/validations/schemas';
import Decimal from 'decimal.js';

// GET /api/targets
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = (session.user as { id: string }).id;
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const filterMonth = parseInt(searchParams.get('month') || String(now.getMonth() + 1));
    const filterYear = parseInt(searchParams.get('year') || String(now.getFullYear()));

    const targets = await prisma.financialTarget.findMany({
      where: { userId, month: filterMonth, year: filterYear },
      orderBy: { createdAt: 'desc' },
    });

    // Date range for the target month
    const startOfMonth = new Date(filterYear, filterMonth - 1, 1);
    const endOfMonth = new Date(filterYear, filterMonth, 0, 23, 59, 59);
    const dateFilter = { gte: startOfMonth, lte: endOfMonth };

    // Calculate current vs target for each
    const targetsWithProgress = await Promise.all(
      targets.map(async (target: { type: string; categoryId: string | null; amount: { toString(): string }; id: string; [key: string]: unknown }) => {
        let currentAmount = new Decimal(0);

        switch (target.type) {
          case 'MAX_EXPENSE':
            if (target.categoryId) {
              const result = await prisma.transaction.aggregate({
                where: { userId, isDeleted: false, transactionDate: dateFilter, type: 'EXPENSE', categoryId: target.categoryId },
                _sum: { amount: true },
              });
              currentAmount = new Decimal((result._sum.amount || 0).toString());
            }
            break;
          case 'MAX_TOTAL_EXPENSE': {
            const result = await prisma.transaction.aggregate({
              where: { userId, isDeleted: false, transactionDate: dateFilter, type: 'EXPENSE' },
              _sum: { amount: true },
            });
            currentAmount = new Decimal((result._sum.amount || 0).toString());
            break;
          }
          case 'MIN_INCOME': {
            const result = await prisma.transaction.aggregate({
              where: { userId, isDeleted: false, transactionDate: dateFilter, type: 'INCOME' },
              _sum: { amount: true },
            });
            currentAmount = new Decimal((result._sum.amount || 0).toString());
            break;
          }
          case 'MIN_SAVINGS': {
            const [inc, exp] = await Promise.all([
              prisma.transaction.aggregate({
                where: { userId, isDeleted: false, transactionDate: dateFilter, type: 'INCOME' },
                _sum: { amount: true },
              }),
              prisma.transaction.aggregate({
                where: { userId, isDeleted: false, transactionDate: dateFilter, type: 'EXPENSE' },
                _sum: { amount: true },
              }),
            ]);
            currentAmount = new Decimal((inc._sum.amount || 0).toString()).minus(
              (exp._sum.amount || 0).toString()
            );
            break;
          }
        }

        const targetAmount = new Decimal(target.amount.toString());
        const isMaxType = target.type.startsWith('MAX_');
        const onTrack = isMaxType
          ? currentAmount.lte(targetAmount)
          : currentAmount.gte(targetAmount);

        const progress = targetAmount.gt(0)
          ? currentAmount.div(targetAmount).times(100).toNumber()
          : 0;

        return {
          ...target,
          currentAmount: currentAmount.toString(),
          progress: Math.round(progress * 100) / 100,
          onTrack,
        };
      })
    );

    return NextResponse.json({ data: targetsWithProgress });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/targets
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validated = targetSchema.parse(body);

    const target = await prisma.financialTarget.create({
      data: {
        userId: (session.user as { id: string }).id,
        name: validated.name,
        type: validated.type,
        amount: validated.amount,
        month: validated.month,
        year: validated.year,
        categoryId: validated.categoryId,
        notes: validated.notes,
      },
    });

    return NextResponse.json({ data: target }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
