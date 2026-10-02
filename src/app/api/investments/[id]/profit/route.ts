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

    const isLoss = validated.type === 'LOSS';
    if (!isLoss && validated.netAmount > validated.grossAmount) {
      return NextResponse.json({ error: 'Net amount cannot exceed gross amount' }, { status: 400 });
    }

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

    // DEF-083: Validate transaction date is not before investment purchase date
    if (txDate < new Date(investment.investmentDate)) {
      return NextResponse.json(
        { error: 'Transaction date cannot be before the investment purchase date' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const effectiveNet = isLoss ? -Math.abs(validated.netAmount) : Math.abs(validated.netAmount);

      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'INVESTMENT_RETURN',
          amount: Math.abs(effectiveNet),
          destAccountId: isLoss ? undefined : investment.accountId,
          sourceAccountId: isLoss ? investment.accountId : undefined,
          taxAmount: validated.taxAmount || null,
          taxPercent: validated.taxPercent || null,
          expectedAmount: Math.abs(validated.grossAmount),
          description: isLoss ? `Investment loss: ${investment.name}` : `Investment profit: ${investment.name}`,
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
      const newValue = currentValue.plus(new Decimal(effectiveNet));

      // DEF-092: Ensure resulting currentValue doesn't go below 0
      if (newValue.lt(0)) {
        throw new Error('Resulting investment value cannot be negative');
      }

      await tx.investment.update({
        where: { id },
        data: { currentValue: parseFloat(newValue.toDecimalPlaces(2).toString()) },
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
    if (error instanceof Error && error.message === 'Resulting investment value cannot be negative') {
      return NextResponse.json({ error: error.message }, { status: 400 });
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

// DELETE /api/investments/:id/profit?txId=... — soft-delete a profit/loss entry
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = (session.user as { id: string }).id;
    const txId = request.nextUrl.searchParams.get('txId');

    if (!txId) {
      return NextResponse.json({ error: 'txId query parameter is required' }, { status: 400 });
    }

    const investment = await prisma.investment.findFirst({ where: { id, userId } });
    if (!investment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id: txId, investmentId: id, type: 'INVESTMENT_RETURN', isDeleted: false, userId },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Profit entry not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.transaction.update({
        where: { id: txId },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      const isLoss = transaction.sourceAccountId && !transaction.destAccountId;
      const amount = parseFloat(transaction.amount.toString());
      const delta = isLoss ? amount : -amount;

      const currentValue = new Decimal(investment.currentValue?.toString() || investment.amountInvested.toString());
      const newValue = Decimal.max(currentValue.plus(new Decimal(delta)), 0);

      await tx.investment.update({
        where: { id },
        data: { currentValue: parseFloat(newValue.toDecimalPlaces(2).toString()) },
      });
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/investments/:id/profit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/investments/:id/profit — edit a profit/loss entry
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const userId = (session.user as { id: string }).id;
    const txId = body.txId;

    if (!txId) {
      return NextResponse.json({ error: 'txId is required in request body' }, { status: 400 });
    }

    const validated = investmentProfitSchema.parse(body);

    const investment = await prisma.investment.findFirst({ where: { id, userId } });
    if (!investment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    const existing = await prisma.transaction.findFirst({
      where: { id: txId, investmentId: id, type: 'INVESTMENT_RETURN', isDeleted: false, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Profit entry not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const wasLoss = existing.sourceAccountId && !existing.destAccountId;
      const oldAmount = parseFloat(existing.amount.toString());
      const oldDelta = wasLoss ? -oldAmount : oldAmount;

      const isLoss = validated.type === 'LOSS';
      const effectiveNet = isLoss ? -Math.abs(validated.netAmount) : Math.abs(validated.netAmount);

      const updated = await tx.transaction.update({
        where: { id: txId },
        data: {
          amount: Math.abs(effectiveNet),
          destAccountId: isLoss ? null : investment.accountId,
          sourceAccountId: isLoss ? investment.accountId : null,
          taxAmount: validated.taxAmount || null,
          taxPercent: validated.taxPercent || null,
          expectedAmount: Math.abs(validated.grossAmount),
          description: isLoss ? `Investment loss: ${investment.name}` : `Investment profit: ${investment.name}`,
          transactionDate: new Date(validated.transactionDate),
          notes: validated.notes,
        },
      });

      const currentValue = new Decimal(investment.currentValue?.toString() || investment.amountInvested.toString());
      const newValue = currentValue.minus(new Decimal(oldDelta)).plus(new Decimal(effectiveNet));

      await tx.investment.update({
        where: { id },
        data: { currentValue: parseFloat(Decimal.max(newValue, 0).toDecimalPlaces(2).toString()) },
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
    console.error('PUT /api/investments/:id/profit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
