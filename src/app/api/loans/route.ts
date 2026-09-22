import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { loanSchema } from '@/lib/validations/schemas';
import Decimal from 'decimal.js';

// GET /api/loans
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const direction = searchParams.get('direction'); // GIVEN or TAKEN
    const status = searchParams.get('status');
    const personId = searchParams.get('personId');

    const where: Record<string, unknown> = { userId: (session.user as { id: string }).id };
    if (direction === 'GIVEN' || direction === 'TAKEN') where.direction = direction;
    if (status) where.status = status;
    if (personId) where.personId = personId;

    const loans = await prisma.loan.findMany({
      where,
      include: {
        person: true,
        account: true,
        repayments: {
          orderBy: { transactionDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate outstanding for each loan
    const loansWithBalance = loans.map((loan: Record<string, unknown> & { amount: { toString(): string }; repayments: { amount: { toString(): string } }[]; remainingAmount: { toString(): string } }) => {
      const totalRepaid = loan.repayments.reduce(
        (sum: Decimal, r: { amount: { toString(): string } }) => sum.plus(r.amount.toString()),
        new Decimal(0)
      );
      const outstanding = new Decimal(loan.amount.toString()).minus(totalRepaid);
      return {
        ...loan,
        totalRepaid: totalRepaid.toString(),
        remainingAmount: Decimal.max(outstanding, 0).toString(),
      };
    });

    return NextResponse.json({ data: loansWithBalance });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /api/loans error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/loans — create loan + optional transaction
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validated = loanSchema.parse(body);
    const userId = (session.user as { id: string }).id;

    // Verify person and account ownership
    const [person, account] = await Promise.all([
      prisma.person.findFirst({ where: { id: validated.personId, userId } }),
      prisma.account.findFirst({ where: { id: validated.accountId, userId } }),
    ]);

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const loanDate = validated.transactionDate ? new Date(validated.transactionDate) : new Date();

    // Create loan and initial transaction in a DB transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const loan = await tx.loan.create({
        data: {
          userId,
          personId: validated.personId,
          accountId: validated.accountId,
          direction: validated.direction,
          amount: validated.amount,
          remainingAmount: validated.amount,
          transactionDate: loanDate,
          dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
          interestRate: validated.interestRate,
          notes: validated.notes,
          isPrivate: validated.isPrivate,
        },
      });

      // Create corresponding transaction
      const txType = validated.direction === 'GIVEN' ? 'LOAN_GIVEN' : 'LOAN_TAKEN';
      await tx.transaction.create({
        data: {
          userId,
          sourceAccountId: validated.accountId,
          type: txType,
          amount: validated.amount,
          description: `Loan ${validated.direction === 'GIVEN' ? 'given to' : 'taken from'} ${person.name}`,
          transactionDate: loanDate,
          personId: validated.personId,
        },
      });

      return loan;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('POST /api/loans error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
