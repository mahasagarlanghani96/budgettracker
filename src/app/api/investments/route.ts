import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { investmentSchema } from '@/lib/validations/schemas';
import Decimal from 'decimal.js';

// GET /api/investments
export async function GET() {
  try {
    const session = await requireAuth();

    const investments = await prisma.investment.findMany({
      where: { userId: (session.user as { id: string }).id },
      include: { account: true },
      orderBy: { createdAt: 'desc' },
    });

    const investmentsWithPL = investments.map((inv: Record<string, unknown>) => {
      const invested = new Decimal(String(inv.amountInvested));
      const current = new Decimal(String(inv.currentValue ?? inv.amountInvested));
      const pl = current.minus(invested);
      const plPercent = invested.gt(0) ? pl.div(invested).times(100).toNumber() : 0;
      return {
        ...inv,
        profitLoss: pl.toString(),
        profitLossPercent: Math.round(plPercent * 100) / 100,
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

    const investment = await prisma.investment.create({
      data: {
        userId: (session.user as { id: string }).id,
        name: validated.name,
        investmentType: validated.investmentType,
        amountInvested: validated.amountInvested,
        currentValue: validated.currentValue || validated.amountInvested,
        investmentDate: validated.investmentDate ? new Date(validated.investmentDate) : new Date(),
        accountId: validated.accountId,
        notes: validated.notes,
      },
    });

    return NextResponse.json({ data: investment }, { status: 201 });
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
