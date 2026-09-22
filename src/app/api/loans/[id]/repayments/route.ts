import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { loanRepaymentSchema } from '@/lib/validations/schemas';

// POST /api/loans/:id/repayments — record repayment for a specific loan
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id: loanId } = await params;
    const body = await request.json();
    const validated = loanRepaymentSchema.parse(body);

    const userId = (session.user as { id: string }).id;

    // Verify loan ownership
    const loan = await prisma.loan.findFirst({
      where: { id: loanId, userId },
      include: { person: true },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    if (loan.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Can only add repayments to active loans' }, { status: 400 });
    }

    // Verify account
    const account = await prisma.account.findFirst({
      where: { id: validated.accountId, userId },
    });
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const repaymentDate = validated.transactionDate ? new Date(validated.transactionDate) : new Date();

    const result = await prisma.$transaction(async (tx: any) => {
      // Create repayment record
      const repayment = await tx.loanRepayment.create({
        data: {
          userId,
          loanId,
          personId: loan.personId,
          amount: validated.amount,
          accountId: validated.accountId,
          transactionDate: repaymentDate,
          notes: validated.notes,
        },
      });

      // Create corresponding transaction
      const txType = loan.direction === 'GIVEN' ? 'LOAN_REPAYMENT_RECEIVED' : 'LOAN_REPAYMENT_MADE';
      await tx.transaction.create({
        data: {
          userId,
          sourceAccountId: validated.accountId,
          type: txType,
          amount: validated.amount,
          description: `Loan repayment ${loan.direction === 'GIVEN' ? 'from' : 'to'} ${loan.person.name}`,
          transactionDate: repaymentDate,
          personId: loan.personId,
        },
      });

      // Update loan remaining amount
      const newRemaining = loan.remainingAmount.toNumber() - validated.amount;
      await tx.loan.update({
        where: { id: loanId },
        data: {
          remainingAmount: Math.max(0, newRemaining),
          status: newRemaining <= 0 ? 'SETTLED' : 'ACTIVE',
        },
      });

      return repayment;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('POST /api/loans/[id]/repayments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
