import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { savingsTransactionInputSchema } from '@/lib/validations/schemas';

// POST /api/savings/:id/transactions — deposit or withdraw
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id: goalId } = await params;
    const body = await request.json();
    const validated = savingsTransactionInputSchema.parse(body);
    const userId = (session.user as { id: string }).id;

    const goal = await prisma.savingsGoal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 });
    }

    const account = await prisma.account.findFirst({ where: { id: validated.accountId, userId } });
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (validated.type === 'WITHDRAWAL') {
      const existing = await prisma.savingsTransaction.findMany({
        where: { savingsGoalId: goalId },
        select: { type: true, amount: true },
      });
      let balance = 0;
      for (const t of existing) {
        balance += t.type === 'DEPOSIT' ? parseFloat(t.amount.toString()) : -parseFloat(t.amount.toString());
      }
      if (validated.amount > balance) {
        return NextResponse.json(
          { error: `Withdrawal amount (${validated.amount}) exceeds current savings balance (${balance.toFixed(2)})` },
          { status: 400 }
        );
      }
    }

    const txDate = validated.transactionDate ? new Date(validated.transactionDate) : new Date();

    const result = await prisma.$transaction(async (tx: any) => {
      const savingsTx = await tx.savingsTransaction.create({
        data: {
          savingsGoalId: goalId,
          accountId: validated.accountId,
          type: validated.type,
          amount: validated.amount,
          transactionDate: txDate,
          notes: validated.notes,
        },
      });

      // Create linked financial transaction
      // DEPOSIT = money leaves account (source), WITHDRAWAL = money returns to account (dest)
      const financialTxType = validated.type === 'DEPOSIT' ? 'SAVINGS_DEPOSIT' : 'SAVINGS_WITHDRAWAL';
      const accountField = validated.type === 'DEPOSIT'
        ? { sourceAccountId: validated.accountId }
        : { destAccountId: validated.accountId };
      await tx.transaction.create({
        data: {
          userId,
          ...accountField,
          type: financialTxType,
          amount: validated.amount,
          description: `Savings ${validated.type.toLowerCase()}: ${goal.name}`,
          transactionDate: txDate,
          savingsTransId: savingsTx.id,
        },
      });

      return savingsTx;
    });

    return NextResponse.json({ data: result }, { status: 201 });
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
