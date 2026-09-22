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
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = transactionSchema.parse(body);

    const existing = await prisma.transaction.findFirst({
      where: { id, userId: (session.user as { id: string }).id, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

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
        transactionDate: new Date(validated.transactionDate),
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
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const existing = await prisma.transaction.findFirst({
      where: { id, userId: (session.user as { id: string }).id, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    await prisma.transaction.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
