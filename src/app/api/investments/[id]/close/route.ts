import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { investmentCloseSchema } from '@/lib/validations/schemas';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = investmentCloseSchema.parse(body);
    const userId = (session.user as { id: string }).id;

    const investment = await prisma.investment.findFirst({
      where: { id, userId },
    });

    if (!investment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    if (!investment.isActive) {
      return NextResponse.json({ error: 'Investment is already closed' }, { status: 400 });
    }

    const account = await prisma.account.findFirst({
      where: { id: investment.accountId, userId },
    });

    if (!account) {
      return NextResponse.json({ error: 'Linked account not found' }, { status: 404 });
    }

    const txDate = new Date(validated.transactionDate);

    if (txDate < new Date(investment.investmentDate)) {
      return NextResponse.json(
        { error: 'Close date cannot be before the investment date' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx: any) => {
      if (validated.netAmount > 0) {
        await tx.transaction.create({
          data: {
            userId,
            type: 'INVESTMENT_RETURN',
            amount: validated.netAmount,
            destAccountId: investment.accountId,
            taxAmount: validated.taxAmount || null,
            taxPercent: validated.taxPercent || null,
            expectedAmount: validated.returnAmount,
            description: `Investment closed: ${investment.name}`,
            transactionDate: txDate,
            investmentId: investment.id,
            isPrivate: true,
            notes: validated.notes,
          },
        });
      }

      const updated = await tx.investment.update({
        where: { id },
        data: {
          isActive: false,
          currentValue: 0,
        },
      });

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
    console.error('POST /api/investments/:id/close error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
