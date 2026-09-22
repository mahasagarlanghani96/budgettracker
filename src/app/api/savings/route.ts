import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { savingsGoalSchema } from '@/lib/validations/schemas';
import Decimal from 'decimal.js';

// GET /api/savings
export async function GET() {
  try {
    const session = await requireAuth();

    const goals = await prisma.savingsGoal.findMany({
      where: { userId: (session.user as { id: string }).id },
      include: {
        transactions: {
          orderBy: { transactionDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const goalsWithProgress = goals.map((goal: Record<string, unknown> & { transactions: { type: string; amount: { toString(): string } }[]; targetAmount: { toString(): string } }) => {
      const deposited = goal.transactions
        .filter((t: { type: string }) => t.type === 'DEPOSIT')
        .reduce((sum: Decimal, t: { amount: { toString(): string } }) => sum.plus(t.amount.toString()), new Decimal(0));
      const withdrawn = goal.transactions
        .filter((t: { type: string }) => t.type === 'WITHDRAWAL')
        .reduce((sum: Decimal, t: { amount: { toString(): string } }) => sum.plus(t.amount.toString()), new Decimal(0));
      const current = deposited.minus(withdrawn);
      const target = new Decimal(goal.targetAmount.toString());
      const progress = target.gt(0) ? current.div(target).times(100).toNumber() : 0;

      return {
        ...goal,
        currentAmount: current.toString(),
        progress: Math.min(Math.round(progress * 100) / 100, 100),
      };
    });

    return NextResponse.json({ data: goalsWithProgress });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/savings
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validated = savingsGoalSchema.parse(body);

    const goal = await prisma.savingsGoal.create({
      data: {
        userId: (session.user as { id: string }).id,
        name: validated.name,
        targetAmount: validated.targetAmount,
        targetDate: validated.targetDate ? new Date(validated.targetDate) : undefined,
        notes: validated.notes,
      },
    });

    return NextResponse.json({ data: goal }, { status: 201 });
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
