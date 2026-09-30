import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { committeeReceivingSchema } from '@/lib/validations/schemas';

// POST /api/committees/:id/receivings
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id: committeeId } = await params;
    const body = await request.json();
    const validated = committeeReceivingSchema.parse({ ...body, committeeId });
    const userId = (session.user as { id: string }).id;

    const committee = await prisma.committee.findFirst({
      where: { id: committeeId, userId },
    });
    if (!committee) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 });
    }

    const entry = await prisma.committeeEntry.findFirst({
      where: { id: validated.entryId, committeeId },
    });
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const account = await prisma.account.findFirst({
      where: { id: validated.accountId, userId },
    });
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const receiving = await prisma.committeeReceiving.create({
      data: {
        committeeId,
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

    return NextResponse.json({ data: receiving }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('POST receivings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
