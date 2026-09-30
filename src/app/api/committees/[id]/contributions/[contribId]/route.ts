import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { committeeContributionSchema } from '@/lib/validations/schemas';

// PUT /api/committees/:id/contributions/:contribId
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contribId: string }> },
) {
  try {
    const session = await requireAuth();
    const { id: committeeId, contribId } = await params;
    const body = await request.json();
    const validated = committeeContributionSchema.parse({ ...body, committeeId });
    const userId = (session.user as { id: string }).id;

    const committee = await prisma.committee.findFirst({
      where: { id: committeeId, userId },
    });
    if (!committee) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 });
    }

    const existing = await prisma.committeeContribution.findFirst({
      where: { id: contribId, committeeId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Contribution not found' }, { status: 404 });
    }

    const contribution = await prisma.committeeContribution.update({
      where: { id: contribId },
      data: {
        entryId: validated.entryId,
        roundId: validated.roundId || null,
        accountId: validated.accountId,
        expectedAmount: validated.expectedAmount,
        actualAmount: validated.actualAmount,
        profitDeduction: validated.profitDeduction ?? 0,
        status: validated.status ?? 'PAID',
        transactionDate: new Date(validated.transactionDate),
        notes: validated.notes,
      },
      include: { entry: true, account: true, round: true },
    });

    return NextResponse.json({ data: contribution });
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

// DELETE /api/committees/:id/contributions/:contribId
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; contribId: string }> },
) {
  try {
    const session = await requireAuth();
    const { id: committeeId, contribId } = await params;
    const userId = (session.user as { id: string }).id;

    const committee = await prisma.committee.findFirst({
      where: { id: committeeId, userId },
    });
    if (!committee) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 });
    }

    const existing = await prisma.committeeContribution.findFirst({
      where: { id: contribId, committeeId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Contribution not found' }, { status: 404 });
    }

    await prisma.committeeContribution.delete({ where: { id: contribId } });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
