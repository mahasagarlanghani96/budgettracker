import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { plotSchema } from '@/lib/validations/schemas';
import Decimal from 'decimal.js';

// GET /api/plots
export async function GET() {
  try {
    const session = await requireAuth();

    const plots = await prisma.plot.findMany({
      where: { userId: (session.user as { id: string }).id },
      include: {
        payments: { orderBy: { transactionDate: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const plotsWithProgress = plots.map((plot: Record<string, unknown> & { totalPrice: { toString(): string }; payments: { amount: { toString(): string } }[] }) => {
      const totalPaid = plot.payments.reduce(
        (sum: Decimal, p: { amount: { toString(): string } }) => sum.plus(p.amount.toString()),
        new Decimal(0)
      );
      const totalPrice = new Decimal(plot.totalPrice.toString());
      const remaining = Decimal.max(totalPrice.minus(totalPaid), 0);
      const progress = totalPrice.gt(0)
        ? totalPaid.div(totalPrice).times(100).toNumber()
        : 0;

      return {
        ...plot,
        paidAmount: totalPaid.toString(),
        remainingAmount: remaining.toString(),
        progress: Math.min(Math.round(progress * 100) / 100, 100),
      };
    });

    return NextResponse.json({ data: plotsWithProgress });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/plots
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validated = plotSchema.parse(body);

    const plot = await prisma.plot.create({
      data: {
        userId: (session.user as { id: string }).id,
        name: validated.name,
        location: validated.location,
        totalPrice: validated.totalPrice,
        notes: validated.notes,
      },
    });

    return NextResponse.json({ data: plot }, { status: 201 });
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
