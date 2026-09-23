import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { loanRepaymentInputSchema } from '@/lib/validations/schemas';
import { softDeleteLedgerEntry, recalculateLoan } from '@/lib/ledger';

type Params = { params: Promise<{ id: string; repaymentId: string }> };

// PUT /api/loans/:id/repayments/:repaymentId
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: loanId, repaymentId } = await params;
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const validated = loanRepaymentInputSchema.parse(body);

    const loan = await prisma.loan.findFirst({ where: { id: loanId, userId }, include: { person: true } });
    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

    const repayment = await prisma.loanRepayment.findFirst({ where: { id: repaymentId, loanId, userId } });
    if (!repayment) return NextResponse.json({ error: 'Repayment not found' }, { status: 404 });

    const account = await prisma.account.findFirst({ where: { id: validated.accountId, userId } });
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    const repDate = validated.transactionDate ? new Date(validated.transactionDate) : repayment.transactionDate;
    const txType = loan.direction === 'GIVEN' ? 'LOAN_REPAYMENT_RECEIVED' : 'LOAN_REPAYMENT_MADE';

    await prisma.$transaction(async (tx: any) => {
      // Soft-delete old ledger row
      await softDeleteLedgerEntry(tx, {
        link: { loanRepaymentId: repaymentId },
        userId,
        type: txType,
        amount: repayment.amount,
        sourceAccountId: repayment.accountId,
        transactionDate: repayment.transactionDate,
        personId: loan.personId,
      });

      // Update the repayment
      await tx.loanRepayment.update({
        where: { id: repaymentId },
        data: {
          amount: validated.amount,
          accountId: validated.accountId,
          transactionDate: repDate,
          notes: validated.notes,
        },
      });

      // Write new ledger row
      await tx.transaction.create({
        data: {
          userId,
          sourceAccountId: validated.accountId,
          type: txType,
          amount: validated.amount,
          description: `Loan repayment ${loan.direction === 'GIVEN' ? 'from' : 'to'} ${loan.person.name}`,
          transactionDate: repDate,
          personId: loan.personId,
          loanRepaymentId: repaymentId,
        },
      });

      await recalculateLoan(tx, loanId);
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('PUT /api/loans/[id]/repayments/[repaymentId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/loans/:id/repayments/:repaymentId
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: loanId, repaymentId } = await params;
    const userId = (session.user as { id: string }).id;

    const loan = await prisma.loan.findFirst({ where: { id: loanId, userId } });
    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

    const repayment = await prisma.loanRepayment.findFirst({ where: { id: repaymentId, loanId, userId } });
    if (!repayment) return NextResponse.json({ error: 'Repayment not found' }, { status: 404 });

    const txType = loan.direction === 'GIVEN' ? 'LOAN_REPAYMENT_RECEIVED' : 'LOAN_REPAYMENT_MADE';

    await prisma.$transaction(async (tx: any) => {
      await softDeleteLedgerEntry(tx, {
        link: { loanRepaymentId: repaymentId },
        userId,
        type: txType,
        amount: repayment.amount,
        sourceAccountId: repayment.accountId,
        transactionDate: repayment.transactionDate,
        personId: loan.personId,
      });
      await tx.loanRepayment.delete({ where: { id: repaymentId } });
      await recalculateLoan(tx, loanId);
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/loans/[id]/repayments/[repaymentId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
