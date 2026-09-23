import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { committeeRoundUpdateSchema } from '@/lib/validations/schemas';
import { calculateProfitShare } from '@/lib/calculations/waiyk';
import Decimal from 'decimal.js';

type Params = { params: Promise<{ id: string; roundId: string }> };

// PUT /api/committees/:id/rounds/:roundId
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: committeeId, roundId } = await params;
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const validated = committeeRoundUpdateSchema.parse(body);

    const committee = await prisma.committee.findFirst({
      where: { id: committeeId, userId },
      include: { entries: true },
    });
    if (!committee) return NextResponse.json({ error: 'Committee not found' }, { status: 404 });

    const round = await prisma.committeeRound.findFirst({ where: { id: roundId, committeeId } });
    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });

    const totalEntries = committee.entries.length || committee.memberCount;
    let payoutAmount = committee.totalAmount
      ? new Decimal(committee.totalAmount.toString())
      : new Decimal(committee.monthlyContribution.toString()).times(committee.memberCount);
    let profitAmount: Decimal | undefined;
    let profitPerMember: Decimal | undefined;

    if (committee.type === 'WAIYK' && validated.winningBid) {
      const totalForCalc = committee.totalAmount
        ? new Decimal(committee.totalAmount.toString())
        : new Decimal(committee.monthlyContribution.toString()).times(committee.memberCount);
      const ps = calculateProfitShare(totalForCalc.toString(), String(validated.winningBid), totalEntries);
      profitAmount = ps.profitTotal;
      profitPerMember = ps.profitPerMember;
      payoutAmount = new Decimal(String(validated.winningBid));
    }

    await prisma.committeeRound.update({
      where: { id: roundId },
      data: {
        roundDate: new Date(validated.roundDate),
        winningBid: validated.winningBid ?? undefined,
        winningMember: validated.winningMember ?? undefined,
        payoutAmount,
        profitAmount,
        profitPerMember,
        notes: validated.notes,
      },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('PUT /api/committees/[id]/rounds/[roundId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/committees/:id/rounds/:roundId — only latest round
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: committeeId, roundId } = await params;
    const userId = (session.user as { id: string }).id;

    const committee = await prisma.committee.findFirst({ where: { id: committeeId, userId } });
    if (!committee) return NextResponse.json({ error: 'Committee not found' }, { status: 404 });

    const round = await prisma.committeeRound.findFirst({ where: { id: roundId, committeeId } });
    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });

    const latest = await prisma.committeeRound.findFirst({
      where: { committeeId },
      orderBy: { roundNumber: 'desc' },
    });

    if (latest?.id !== roundId) {
      return NextResponse.json({ error: 'Only the latest round can be deleted.' }, { status: 400 });
    }

    // Check for contributions or receivings linked to this round
    const linkedCount =
      (await prisma.committeeContribution.count({ where: { roundId } })) +
      (await prisma.committeeReceiving.count({ where: { roundId } }));

    if (linkedCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete round with ${linkedCount} contribution/receiving record(s).` },
        { status: 400 }
      );
    }

    await prisma.committeeRound.delete({ where: { id: roundId } });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/committees/[id]/rounds/[roundId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
