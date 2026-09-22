import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { calculateProfitShare } from '@/lib/calculations/waiyk';
import Decimal from 'decimal.js';

// POST /api/committees/:id/rounds — create a new round
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id: committeeId } = await params;
    const body = await request.json();

    const committee = await prisma.committee.findFirst({
      where: { id: committeeId, userId: (session.user as { id: string }).id },
      include: {
        rounds: { orderBy: { roundNumber: 'desc' }, take: 1 },
        entries: true,
      },
    });

    if (!committee) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 });
    }

    if (committee.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Committee is not active' }, { status: 400 });
    }

    const nextRound = (committee.rounds[0]?.roundNumber || 0) + 1;
    if (nextRound > committee.memberCount) {
      return NextResponse.json({ error: 'All rounds completed' }, { status: 400 });
    }

    // Count total entry slots
    const totalEntries = committee.entries.length || committee.memberCount;

    let profitAmount: Decimal | undefined;
    let profitPerMember: Decimal | undefined;
    let payoutAmount = committee.totalAmount
      ? new Decimal(committee.totalAmount.toString())
      : new Decimal(committee.monthlyContribution.toString()).times(committee.memberCount);

    // Waiyk-specific calculations
    if (committee.type === 'WAIYK' && body.winningBid) {
      const totalForCalc = committee.totalAmount
        ? new Decimal(committee.totalAmount.toString())
        : new Decimal(committee.monthlyContribution.toString()).times(committee.memberCount);

      const profitShare = calculateProfitShare(
        totalForCalc.toString(),
        String(body.winningBid),
        totalEntries
      );
      profitAmount = profitShare.profitTotal;
      profitPerMember = profitShare.profitPerMember;
      payoutAmount = new Decimal(String(body.winningBid));
    }

    const round = await prisma.committeeRound.create({
      data: {
        committeeId,
        roundNumber: nextRound,
        roundDate: body.roundDate ? new Date(body.roundDate) : new Date(),
        totalAmount: payoutAmount,
        winningBid: body.winningBid || undefined,
        winningMember: body.winningMember || undefined,
        payoutAmount,
        profitAmount,
        profitPerMember,
        memberCount: totalEntries,
        notes: body.notes,
      },
    });

    return NextResponse.json({ data: round }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('POST /api/committees/[id]/rounds error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
