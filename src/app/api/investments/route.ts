import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { investmentSchema } from '@/lib/validations/schemas';
import Decimal from 'decimal.js';

// GET /api/investments
export async function GET() {
  try {
    const session = await requireAuth();
    const userId = (session.user as { id: string }).id;

    const [investments, returnTxns] = await Promise.all([
      prisma.investment.findMany({
        where: { userId },
        include: { account: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transaction.findMany({
        where: { userId, type: 'INVESTMENT_RETURN', isDeleted: false },
        select: {
          investmentId: true,
          amount: true,
          taxAmount: true,
          sourceAccountId: true,
          destAccountId: true,
        },
      }),
    ]);

    const returnsByInv = new Map<string, { totalReturned: Decimal; totalTax: Decimal }>();
    for (const tx of returnTxns) {
      if (!tx.investmentId) continue;
      const entry = returnsByInv.get(tx.investmentId) || { totalReturned: new Decimal(0), totalTax: new Decimal(0) };
      const isLoss = tx.sourceAccountId && !tx.destAccountId;
      const amt = new Decimal(tx.amount.toString());
      entry.totalReturned = isLoss ? entry.totalReturned.minus(amt) : entry.totalReturned.plus(amt);
      if (tx.taxAmount) entry.totalTax = entry.totalTax.plus(new Decimal(tx.taxAmount.toString()));
      returnsByInv.set(tx.investmentId, entry);
    }

    const investmentsWithPL = investments.map((inv: Record<string, unknown>) => {
      const invested = new Decimal(String(inv.amountInvested));
      const current = new Decimal(String(inv.currentValue ?? inv.amountInvested));
      const returns = returnsByInv.get(inv.id as string) || { totalReturned: new Decimal(0), totalTax: new Decimal(0) };

      // For closed investments: P/L = total returned - amount invested
      // For active investments: P/L = current value - amount invested
      const isActive = inv.isActive as boolean;
      const pl = isActive ? current.minus(invested) : returns.totalReturned.minus(invested);
      const plPercent = invested.gt(0) ? pl.div(invested).times(100).toNumber() : 0;

      return {
        ...inv,
        profitLoss: pl.toString(),
        profitLossPercent: Math.round(plPercent * 100) / 100,
        totalReturned: returns.totalReturned.toString(),
        totalTax: returns.totalTax.toString(),
      };
    });

    return NextResponse.json({ data: investmentsWithPL });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/investments
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validated = investmentSchema.parse(body);

    const userId = (session.user as { id: string }).id;
    const isHistorical = validated.isHistorical ?? false;
    const investmentDate = validated.investmentDate ? new Date(validated.investmentDate) : new Date();

    const result = await prisma.$transaction(async (tx: any) => {
      const investment = await tx.investment.create({
        data: {
          userId,
          name: validated.name.trim(),
          investmentType: validated.investmentType,
          amountInvested: validated.amountInvested,
          currentValue: validated.currentValue || validated.amountInvested,
          investmentDate,
          accountId: validated.accountId,
          isHistorical,
          notes: validated.notes,
        },
      });

      // Create ledger transaction so account balances reflect the investment outflow
      await tx.transaction.create({
        data: {
          userId,
          sourceAccountId: validated.accountId,
          type: 'INVESTMENT',
          amount: validated.amountInvested,
          description: `Investment: ${validated.name}`,
          transactionDate: investmentDate,
          investmentId: investment.id,
          isHistorical,
        },
      });

      return investment;
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
