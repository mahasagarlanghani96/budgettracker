import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { investmentProfitSchema } from '@/lib/validations/schemas';
import Decimal from 'decimal.js';

// POST /api/investments/:id/profit — record a profit entry
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = investmentProfitSchema.parse(body);
    const userId = (session.user as { id: string }).id;

    const investment = await prisma.investment.findFirst({
      where: { id, userId },
    });

    if (!investment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    const account = await prisma.account.findFirst({
      where: { id: investment.accountId, userId },
    });

    if (!account) {
      return NextResponse.json({ error: 'Investment account not found' }, { status: 404 });
    }

    const txDate = new Date(validated.transactionDate);

    const result = await prisma.$transaction(async (tx: any) => {
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'INVESTMENT_RETURN',
          amount: validated.netAmount,
          destAccountId: investment.accountId,
          taxAmount: validated.taxAmount || null,
          taxPercent: validated.taxPercent || null,
          expectedAmount: validated.grossAmount,
          description: `Investment profit: ${investment.name}`,
          transactionDate: txDate,
          investmentId: investment.id,
          isPrivate: true,
          notes: validated.notes,
        },
        include: {
          destAccount: { select: { name: true } },
        },
      });

      const currentValue = new Decimal(investment.currentValue?.toString() || investment.amountInvested.toString());
      const newValue = currentValue.plus(new Decimal(validated.netAmount));

      await tx.investment.update({
        where: { id },
        data: { currentValue: newValue.toNumber() },
      });

      return transaction;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('POST /api/investments/:id/profit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/investments/:id/profit — list profit history
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = (session.user as { id: string }).id;

    const investment = await prisma.investment.findFirst({
      where: { id, userId },
    });

    if (!investment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        investmentId: id,
        type: 'INVESTMENT_RETURN',
        isDeleted: false,
      },
      orderBy: { transactionDate: 'desc' },
      select: {
        id: true,
        amount: true,
        taxAmount: true,
        taxPercent: true,
        expectedAmount: true,
        transactionDate: true,
        notes: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: transactions });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
