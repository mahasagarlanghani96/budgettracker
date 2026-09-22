import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import Decimal from 'decimal.js';

// GET /api/loans/:id
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const loan = await prisma.loan.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
      include: {
        person: true,
        account: true,
        repayments: {
          orderBy: { transactionDate: 'desc' },
        },
      },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const totalRepaid = loan.repayments.reduce(
      (sum: Decimal, r: { amount: { toString(): string } }) => sum.plus(r.amount.toString()),
      new Decimal(0)
    );
    const outstanding = Decimal.max(new Decimal(loan.amount.toString()).minus(totalRepaid), 0);

    return NextResponse.json({
      data: {
        ...loan,
        totalRepaid: totalRepaid.toString(),
        remainingAmount: outstanding.toString(),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/loans/:id — update status or details
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.loan.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const loan = await prisma.loan.update({
      where: { id },
      data: {
        status: body.status,
        notes: body.notes,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        interestRate: body.interestRate,
      },
    });

    return NextResponse.json({ data: loan });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
