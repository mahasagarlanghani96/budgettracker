import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sportsExpenseSchema } from '@/lib/validations/schemas';

// POST /api/sports/matches/:id/expenses
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id: matchId } = await params;
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const validated = sportsExpenseSchema.parse(body);
    const isHistorical = body.isHistorical === true;

    const match = await prisma.sportsMatch.findFirst({
      where: { id: matchId, userId },
      include: { team: { select: { name: true } } },
    });
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (validated.accountId) {
      const account = await prisma.account.findFirst({
        where: { id: validated.accountId, userId },
      });
      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const expense = await tx.sportsExpense.create({
        data: {
          matchId,
          description: validated.description.trim(),
          amount: validated.amount,
          accountId: validated.accountId || null,
          notes: validated.notes,
        },
      });

      if (validated.accountId) {
        await tx.transaction.create({
          data: {
            userId,
            sourceAccountId: validated.accountId,
            type: 'SPORTS_EXPENSE',
            amount: validated.amount,
            description: `Sports expense: ${validated.description} — ${match.team.name}${match.opponent ? ` vs ${match.opponent}` : ''}`,
            transactionDate: match.matchDate,
            sportsExpenseId: expense.id,
            isHistorical,
          },
        });
      }

      return expense;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('POST /api/sports/matches/[id]/expenses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
