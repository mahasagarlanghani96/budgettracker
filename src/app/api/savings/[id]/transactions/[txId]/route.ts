import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { savingsTransactionInputSchema } from '@/lib/validations/schemas';
import { softDeleteLedgerEntry } from '@/lib/ledger';

type Params = { params: Promise<{ id: string; txId: string }> };

// PUT /api/savings/:id/transactions/:txId
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: goalId, txId } = await params;
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const validated = savingsTransactionInputSchema.parse(body);

    const goal = await prisma.savingsGoal.findFirst({ where: { id: goalId, userId } });
    if (!goal) return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 });

    const stx = await prisma.savingsTransaction.findFirst({ where: { id: txId, savingsGoalId: goalId } });
    if (!stx) return NextResponse.json({ error: 'Savings transaction not found' }, { status: 404 });

    const account = await prisma.account.findFirst({ where: { id: validated.accountId, userId } });
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    const txDate = validated.transactionDate ? new Date(validated.transactionDate) : stx.transactionDate;
    const oldLedgerType = stx.type === 'DEPOSIT' ? 'SAVINGS_DEPOSIT' : 'SAVINGS_WITHDRAWAL';
    const newLedgerType = validated.type === 'DEPOSIT' ? 'SAVINGS_DEPOSIT' : 'SAVINGS_WITHDRAWAL';

    await prisma.$transaction(async (tx: any) => {
      await softDeleteLedgerEntry(tx, {
        link: { savingsTransId: txId },
        userId,
        type: oldLedgerType,
        amount: stx.amount,
        sourceAccountId: stx.accountId,
        transactionDate: stx.transactionDate,
      });

      await tx.savingsTransaction.update({
        where: { id: txId },
        data: {
          type: validated.type,
          amount: validated.amount,
          accountId: validated.accountId,
          transactionDate: txDate,
          notes: validated.notes,
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          sourceAccountId: validated.accountId,
          type: newLedgerType,
          amount: validated.amount,
          description: `Savings ${validated.type.toLowerCase()}: ${goal.name}`,
          transactionDate: txDate,
          savingsTransId: txId,
        },
      });
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('PUT /api/savings/[id]/transactions/[txId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/savings/:id/transactions/:txId
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: goalId, txId } = await params;
    const userId = (session.user as { id: string }).id;

    const goal = await prisma.savingsGoal.findFirst({ where: { id: goalId, userId } });
    if (!goal) return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 });

    const stx = await prisma.savingsTransaction.findFirst({ where: { id: txId, savingsGoalId: goalId } });
    if (!stx) return NextResponse.json({ error: 'Savings transaction not found' }, { status: 404 });

    const ledgerType = stx.type === 'DEPOSIT' ? 'SAVINGS_DEPOSIT' : 'SAVINGS_WITHDRAWAL';

    await prisma.$transaction(async (tx: any) => {
      await softDeleteLedgerEntry(tx, {
        link: { savingsTransId: txId },
        userId,
        type: ledgerType,
        amount: stx.amount,
        sourceAccountId: stx.accountId,
        transactionDate: stx.transactionDate,
      });
      await tx.savingsTransaction.delete({ where: { id: txId } });
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/savings/[id]/transactions/[txId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
