import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sportsExpenseSchema } from '@/lib/validations/schemas';

type Params = { params: Promise<{ id: string; expenseId: string }> };

// PUT /api/sports/matches/:id/expenses/:expenseId
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: matchId, expenseId } = await params;
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const validated = sportsExpenseSchema.parse(body);

    const match = await prisma.sportsMatch.findFirst({ where: { id: matchId, userId } });
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    const expense = await prisma.sportsExpense.findFirst({ where: { id: expenseId, matchId } });
    if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

    if (validated.accountId) {
      const account = await prisma.account.findFirst({ where: { id: validated.accountId, userId } });
      if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const updated = await prisma.sportsExpense.update({
      where: { id: expenseId },
      data: {
        description: validated.description.trim(),
        amount: validated.amount,
        accountId: validated.accountId || null,
        notes: validated.notes,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('PUT /api/sports/matches/[id]/expenses/[expenseId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/sports/matches/:id/expenses/:expenseId
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: matchId, expenseId } = await params;
    const userId = (session.user as { id: string }).id;

    const match = await prisma.sportsMatch.findFirst({ where: { id: matchId, userId } });
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    const expense = await prisma.sportsExpense.findFirst({ where: { id: expenseId, matchId } });
    if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

    await prisma.sportsExpense.delete({ where: { id: expenseId } });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/sports/matches/[id]/expenses/[expenseId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
