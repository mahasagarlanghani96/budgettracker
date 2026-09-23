import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { plotPaymentInputSchema } from '@/lib/validations/schemas';
import { softDeleteLedgerEntry } from '@/lib/ledger';

type Params = { params: Promise<{ id: string; paymentId: string }> };

// PUT /api/plots/:id/payments/:paymentId
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: plotId, paymentId } = await params;
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const validated = plotPaymentInputSchema.parse(body);

    const plot = await prisma.plot.findFirst({ where: { id: plotId, userId } });
    if (!plot) return NextResponse.json({ error: 'Plot not found' }, { status: 404 });

    const payment = await prisma.plotPayment.findFirst({ where: { id: paymentId, plotId } });
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const account = await prisma.account.findFirst({ where: { id: validated.accountId, userId } });
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    const payDate = validated.transactionDate ? new Date(validated.transactionDate) : payment.transactionDate;

    await prisma.$transaction(async (tx: any) => {
      await softDeleteLedgerEntry(tx, {
        link: { plotPaymentId: paymentId },
        userId,
        type: 'PLOT_PAYMENT',
        amount: payment.amount,
        sourceAccountId: payment.accountId,
        transactionDate: payment.transactionDate,
      });

      await tx.plotPayment.update({
        where: { id: paymentId },
        data: {
          amount: validated.amount,
          accountId: validated.accountId,
          transactionDate: payDate,
          dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
          notes: validated.notes,
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          sourceAccountId: validated.accountId,
          type: 'PLOT_PAYMENT',
          amount: validated.amount,
          description: `Plot payment: ${plot.name}`,
          transactionDate: payDate,
          plotPaymentId: paymentId,
        },
      });
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('PUT /api/plots/[id]/payments/[paymentId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/plots/:id/payments/:paymentId
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: plotId, paymentId } = await params;
    const userId = (session.user as { id: string }).id;

    const plot = await prisma.plot.findFirst({ where: { id: plotId, userId } });
    if (!plot) return NextResponse.json({ error: 'Plot not found' }, { status: 404 });

    const payment = await prisma.plotPayment.findFirst({ where: { id: paymentId, plotId } });
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    await prisma.$transaction(async (tx: any) => {
      await softDeleteLedgerEntry(tx, {
        link: { plotPaymentId: paymentId },
        userId,
        type: 'PLOT_PAYMENT',
        amount: payment.amount,
        sourceAccountId: payment.accountId,
        transactionDate: payment.transactionDate,
      });
      await tx.plotPayment.delete({ where: { id: paymentId } });
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/plots/[id]/payments/[paymentId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
