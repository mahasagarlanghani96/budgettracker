import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { transactionSchema } from '@/lib/validations/schemas';

// GET /api/transactions/:id
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: (session.user as { id: string }).id, isDeleted: false },
      include: {
        category: true,
        sourceAccount: true,
        destAccount: true,
        person: true,
        attachments: { orderBy: { createdAt: 'desc' } },
        committeeContrib: { include: { committee: true, entry: true } },
        committeeRecv: { include: { committee: true, entry: true } },
        plotPayment: { include: { plot: true } },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ data: transaction });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/transactions/:id
// For linked committee/plot transactions, also updates the module record.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = transactionSchema.parse(body);
    const userId = (session.user as { id: string }).id;

    const existing = await prisma.transaction.findFirst({
      where: { id, userId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const txDate = new Date(validated.transactionDate);

    // --- Linked committee contribution ---
    if (existing.committeeContribId) {
      const accountId = validated.sourceAccountId || validated.destAccountId;
      if (!accountId) return NextResponse.json({ error: 'Account is required' }, { status: 400 });

      const result = await prisma.$transaction(async (tx: any) => {
        await tx.committeeContribution.update({
          where: { id: existing.committeeContribId },
          data: {
            accountId,
            actualAmount: validated.amount,
            expectedAmount: validated.expectedAmount ?? validated.amount,
            profitDeduction: body.profitDeduction ?? undefined,
            transactionDate: txDate,
            notes: validated.notes,
          },
        });

        return tx.transaction.update({
          where: { id },
          data: {
            amount: validated.amount,
            sourceAccountId: accountId,
            description: validated.description,
            transactionDate: txDate,
            notes: validated.notes,
            isPrivate: validated.isPrivate,
          },
          include: { category: true, sourceAccount: true, destAccount: true },
        });
      });

      return NextResponse.json({ data: result });
    }

    // --- Linked committee receiving ---
    if (existing.committeeRecvId) {
      const accountId = validated.destAccountId || validated.sourceAccountId;
      if (!accountId) return NextResponse.json({ error: 'Account is required' }, { status: 400 });

      const result = await prisma.$transaction(async (tx: any) => {
        await tx.committeeReceiving.update({
          where: { id: existing.committeeRecvId },
          data: {
            accountId,
            actualAmount: validated.amount,
            expectedAmount: validated.expectedAmount ?? null,
            transactionDate: txDate,
            notes: validated.notes,
          },
        });

        return tx.transaction.update({
          where: { id },
          data: {
            amount: validated.amount,
            destAccountId: accountId,
            description: validated.description,
            transactionDate: txDate,
            notes: validated.notes,
            isPrivate: validated.isPrivate,
          },
          include: { category: true, sourceAccount: true, destAccount: true },
        });
      });

      return NextResponse.json({ data: result });
    }

    // --- Linked plot payment ---
    if (existing.plotPaymentId) {
      const accountId = validated.sourceAccountId || validated.destAccountId;
      if (!accountId) return NextResponse.json({ error: 'Account is required' }, { status: 400 });

      const result = await prisma.$transaction(async (tx: any) => {
        await tx.plotPayment.update({
          where: { id: existing.plotPaymentId },
          data: {
            accountId,
            amount: validated.amount,
            transactionDate: txDate,
            dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
            notes: validated.notes,
          },
        });

        return tx.transaction.update({
          where: { id },
          data: {
            amount: validated.amount,
            sourceAccountId: accountId,
            description: validated.description,
            transactionDate: txDate,
            notes: validated.notes,
            isPrivate: validated.isPrivate,
          },
          include: { category: true, sourceAccount: true, destAccount: true },
        });
      });

      return NextResponse.json({ data: result });
    }

    // --- Standard transaction ---
    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        type: validated.type,
        amount: validated.amount,
        sourceAccountId: validated.sourceAccountId,
        destAccountId: validated.destAccountId,
        categoryId: validated.categoryId,
        personId: validated.personId,
        description: validated.description,
        notes: validated.notes,
        transactionDate: txDate,
        transactionTime: validated.transactionTime,
        taxAmount: validated.taxAmount,
        taxPercent: validated.taxPercent,
        expectedAmount: validated.expectedAmount,
        isPrivate: validated.isPrivate,
      },
      include: { category: true, sourceAccount: true, destAccount: true },
    });

    return NextResponse.json({ data: transaction });
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

// DELETE /api/transactions/:id (soft delete)
// For linked committee/plot transactions, also removes the module record.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = (session.user as { id: string }).id;

    const existing = await prisma.transaction.findFirst({
      where: { id, userId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx: any) => {
      if (existing.committeeContribId) {
        await tx.committeeContribution.delete({ where: { id: existing.committeeContribId } });
      }
      if (existing.committeeRecvId) {
        await tx.committeeReceiving.delete({ where: { id: existing.committeeRecvId } });
      }
      if (existing.plotPaymentId) {
        await tx.plotPayment.delete({ where: { id: existing.plotPaymentId } });
      }

      await tx.transaction.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
