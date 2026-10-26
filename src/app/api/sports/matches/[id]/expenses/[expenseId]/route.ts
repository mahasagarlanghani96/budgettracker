import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sportsExpenseSchema } from '@/lib/validations/schemas';
import { softDeleteLedgerEntry } from '@/lib/ledger';

type Params = { params: Promise<{ id: string; expenseId: string }> };

// PUT /api/sports/matches/:id/expenses/:expenseId
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: matchId, expenseId } = await params;
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const validated = sportsExpenseSchema.parse(body);
    const isHistorical = body.isHistorical === true;

    const match = await prisma.sportsMatch.findFirst({
      where: { id: matchId, userId },
      include: { team: { select: { name: true } } },
    });
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    const expense = await prisma.sportsExpense.findFirst({ where: { id: expenseId, matchId } });
    if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

    if (validated.accountId) {
      const account = await prisma.account.findFirst({ where: { id: validated.accountId, userId } });
      if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.sportsExpense.update({
        where: { id: expenseId },
        data: {
          description: validated.description.trim(),
          amount: validated.amount,
          accountId: validated.accountId || null,
          notes: validated.notes,
        },
      });

      // Update or create/delete ledger entry
      const existing = await tx.transaction.findFirst({
        where: { sportsExpenseId: expenseId, isDeleted: false },
      });

      if (validated.accountId) {
        if (existing) {
          await tx.transaction.update({
            where: { id: existing.id },
            data: {
              sourceAccountId: validated.accountId,
              amount: validated.amount,
              description: `Sports expense: ${validated.description} — ${match.team.name}${match.opponent ? ` vs ${match.opponent}` : ''}`,
              isHistorical,
            },
          });
        } else {
          await tx.transaction.create({
            data: {
              userId,
              sourceAccountId: validated.accountId,
              type: 'SPORTS_EXPENSE',
              amount: validated.amount,
              description: `Sports expense: ${validated.description} — ${match.team.name}${match.opponent ? ` vs ${match.opponent}` : ''}`,
              transactionDate: match.matchDate,
              sportsExpenseId: expenseId,
              isHistorical,
            },
          });
        }
      } else if (existing) {
        await tx.transaction.update({
          where: { id: existing.id },
          data: { isDeleted: true, deletedAt: new Date() },
        });
      }

      return updated;
    });

    return NextResponse.json({ data: result });
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

    await prisma.$transaction(async (tx: any) => {
      if (expense.accountId) {
        await softDeleteLedgerEntry(tx, {
          link: { sportsExpenseId: expenseId },
          userId,
          type: 'SPORTS_EXPENSE',
          amount: expense.amount,
          sourceAccountId: expense.accountId,
          transactionDate: match.matchDate,
        });
      }
      await tx.sportsExpense.delete({ where: { id: expenseId } });
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/sports/matches/[id]/expenses/[expenseId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
