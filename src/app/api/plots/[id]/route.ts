import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { plotSchema } from '@/lib/validations/schemas';
import Decimal from 'decimal.js';

// GET /api/plots/:id
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const plot = await prisma.plot.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
      include: { payments: { orderBy: { transactionDate: 'desc' } } },
    });

    if (!plot) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    }

    const totalPaid = plot.payments.reduce(
      (sum: Decimal, p: { amount: { toString(): string } }) => sum.plus(p.amount.toString()),
      new Decimal(0)
    );
    const totalPrice = new Decimal(plot.totalPrice.toString());
    const remaining = Decimal.max(totalPrice.minus(totalPaid), 0);
    const progress = totalPrice.gt(0) ? totalPaid.div(totalPrice).times(100).toNumber() : 0;

    return NextResponse.json({
      data: {
        ...plot,
        paidAmount: totalPaid.toString(),
        remainingAmount: remaining.toString(),
        progress: Math.min(Math.round(progress * 100) / 100, 100),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/plots/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = plotSchema.parse(body);

    const existing = await prisma.plot.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    }

    const plot = await prisma.plot.update({
      where: { id },
      data: {
        name: validated.name,
        totalPrice: validated.totalPrice,
        location: validated.location,
        notes: validated.notes,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
      },
    });

    return NextResponse.json({ data: plot });
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

// DELETE /api/plots/:id (blocked if it has payment history)
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const existing = await prisma.plot.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    }

    const paymentCount = await prisma.plotPayment.count({ where: { plotId: id } });
    if (paymentCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete a plot with ${paymentCount} recorded payment(s). Mark it inactive instead.` },
        { status: 400 }
      );
    }

    await prisma.plot.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
