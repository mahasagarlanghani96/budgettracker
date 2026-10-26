import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sportsMatchFeeSchema } from '@/lib/validations/schemas';

type Params = { params: Promise<{ id: string; feeId: string }> };

// PUT /api/sports/matches/:id/fees/:feeId
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: matchId, feeId } = await params;
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const validated = sportsMatchFeeSchema.parse(body);

    const match = await prisma.sportsMatch.findFirst({ where: { id: matchId, userId } });
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    const fee = await prisma.sportsMatchFee.findFirst({ where: { id: feeId, matchId } });
    if (!fee) return NextResponse.json({ error: 'Fee not found' }, { status: 404 });

    // Verify player belongs to the match's team
    const player = await prisma.sportsPlayer.findFirst({
      where: { id: validated.playerId, teamId: match.teamId },
    });
    if (!player) return NextResponse.json({ error: 'Player not found in this team' }, { status: 404 });

    if (validated.accountId) {
      const account = await prisma.account.findFirst({ where: { id: validated.accountId, userId } });
      if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const updated = await prisma.sportsMatchFee.update({
      where: { id: feeId },
      data: {
        playerId: validated.playerId,
        amount: validated.amount,
        accountId: validated.accountId || null,
        isPaid: validated.isPaid,
        paidDate: validated.paidDate ? new Date(validated.paidDate) : null,
        notes: validated.notes,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'This player already has a fee for this match' }, { status: 409 });
    }
    console.error('PUT /api/sports/matches/[id]/fees/[feeId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/sports/matches/:id/fees/:feeId
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: matchId, feeId } = await params;
    const userId = (session.user as { id: string }).id;

    const match = await prisma.sportsMatch.findFirst({ where: { id: matchId, userId } });
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    const fee = await prisma.sportsMatchFee.findFirst({ where: { id: feeId, matchId } });
    if (!fee) return NextResponse.json({ error: 'Fee not found' }, { status: 404 });

    await prisma.sportsMatchFee.delete({ where: { id: feeId } });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/sports/matches/[id]/fees/[feeId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
