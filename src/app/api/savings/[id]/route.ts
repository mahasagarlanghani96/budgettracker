import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { savingsGoalSchema } from '@/lib/validations/schemas';
import Decimal from 'decimal.js';

// GET /api/savings/:id
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const goal = await prisma.savingsGoal.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
      include: { transactions: { orderBy: { transactionDate: 'desc' } } },
    });

    if (!goal) {
      return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 });
    }

    const deposited = goal.transactions
      .filter((t: { type: string }) => t.type === 'DEPOSIT')
      .reduce((sum: Decimal, t: { amount: { toString(): string } }) => sum.plus(t.amount.toString()), new Decimal(0));
    const withdrawn = goal.transactions
      .filter((t: { type: string }) => t.type === 'WITHDRAWAL')
      .reduce((sum: Decimal, t: { amount: { toString(): string } }) => sum.plus(t.amount.toString()), new Decimal(0));
    const current = deposited.minus(withdrawn);
    const target = new Decimal(goal.targetAmount.toString());
    const progress = target.gt(0) ? current.div(target).times(100).toNumber() : 0;

    return NextResponse.json({
      data: { ...goal, currentAmount: current.toString(), progress: Math.min(Math.round(progress * 100) / 100, 100) },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/savings/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = savingsGoalSchema.parse(body);

    const existing = await prisma.savingsGoal.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 });
    }

    const goal = await prisma.savingsGoal.update({
      where: { id },
      data: {
        name: validated.name,
        targetAmount: validated.targetAmount,
        targetDate: validated.targetDate ? new Date(validated.targetDate) : validated.targetDate === null ? null : undefined,
        notes: validated.notes,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
      },
    });

    return NextResponse.json({ data: goal });
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

// DELETE /api/savings/:id (blocked if it has deposit/withdrawal history)
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const existing = await prisma.savingsGoal.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 });
    }

    const txCount = await prisma.savingsTransaction.count({ where: { savingsGoalId: id } });
    if (txCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete a goal with ${txCount} recorded transaction(s). Mark it inactive instead.` },
        { status: 400 }
      );
    }

    await prisma.savingsGoal.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
