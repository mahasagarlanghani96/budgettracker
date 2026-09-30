import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { committeeReceivingSchema } from '@/lib/validations/schemas';

// PUT /api/committees/:id/receivings/:recId
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recId: string }> },
) {
  try {
    const session = await requireAuth();
    const { id: committeeId, recId } = await params;
    const body = await request.json();
    const validated = committeeReceivingSchema.parse({ ...body, committeeId });
    const userId = (session.user as { id: string }).id;

    const committee = await prisma.committee.findFirst({
      where: { id: committeeId, userId },
    });
    if (!committee) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 });
    }

    const existing = await prisma.committeeReceiving.findFirst({
      where: { id: recId, committeeId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Receiving not found' }, { status: 404 });
    }

    const receiving = await prisma.committeeReceiving.update({
      where: { id: recId },
      data: {
        entryId: validated.entryId,
        roundId: validated.roundId || null,
        accountId: validated.accountId,
        expectedAmount: validated.expectedAmount ?? null,
        actualAmount: validated.actualAmount,
        transactionDate: new Date(validated.transactionDate),
        notes: validated.notes,
      },
      include: { entry: true, account: true, round: true },
    });

    return NextResponse.json({ data: receiving });
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

// DELETE /api/committees/:id/receivings/:recId
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; recId: string }> },
) {
  try {
    const session = await requireAuth();
    const { id: committeeId, recId } = await params;
    const userId = (session.user as { id: string }).id;

    const committee = await prisma.committee.findFirst({
      where: { id: committeeId, userId },
    });
    if (!committee) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 });
    }

    const existing = await prisma.committeeReceiving.findFirst({
      where: { id: recId, committeeId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Receiving not found' }, { status: 404 });
    }

    await prisma.committeeReceiving.delete({ where: { id: recId } });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
