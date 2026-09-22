import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { plotPaymentSchema } from '@/lib/validations/schemas';

// POST /api/plots/:id/payments
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id: plotId } = await params;
    const body = await request.json();
    const validated = plotPaymentSchema.parse(body);
    const userId = (session.user as { id: string }).id;

    const plot = await prisma.plot.findFirst({
      where: { id: plotId, userId },
    });

    if (!plot) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    }

    const paymentDate = validated.transactionDate ? new Date(validated.transactionDate) : new Date();

    const result = await prisma.$transaction(async (tx: any) => {
      const payment = await tx.plotPayment.create({
        data: {
          plotId,
          accountId: validated.accountId,
          amount: validated.amount,
          transactionDate: paymentDate,
          dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
          notes: validated.notes,
        },
      });

      // Create corresponding financial transaction
      await tx.transaction.create({
        data: {
          userId,
          sourceAccountId: validated.accountId,
          type: 'PLOT_PAYMENT',
          amount: validated.amount,
          description: `Plot payment: ${plot.name}`,
          transactionDate: paymentDate,
        },
      });

      return payment;
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
