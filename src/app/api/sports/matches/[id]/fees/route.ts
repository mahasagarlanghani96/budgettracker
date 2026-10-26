import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sportsMatchFeeSchema } from '@/lib/validations/schemas';

// POST /api/sports/matches/:id/fees
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id: matchId } = await params;
    const userId = (session.user as { id: string }).id;
    const body = await request.json();

    const match = await prisma.sportsMatch.findFirst({
      where: { id: matchId, userId },
      include: { team: { include: { players: { where: { isActive: true } } } } },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Auto-generate fees for all active players who don't have one yet
    if (body.autoGenerate) {
      const existingFees = await prisma.sportsMatchFee.findMany({
        where: { matchId },
        select: { playerId: true },
      });
      const existingPlayerIds = new Set(existingFees.map((f) => f.playerId));
      const playersToAdd = match.team.players.filter(
        (p) => !existingPlayerIds.has(p.id) && Number(p.matchFee) > 0
      );

      if (playersToAdd.length === 0) {
        return NextResponse.json(
          { error: 'No new fees to generate. All active players already have fees or have no default fee set.' },
          { status: 400 }
        );
      }

      await prisma.sportsMatchFee.createMany({
        data: playersToAdd.map((p) => ({
          matchId,
          playerId: p.id,
          amount: p.matchFee,
        })),
      });

      return NextResponse.json({ data: { created: playersToAdd.length } }, { status: 201 });
    }

    // Manual add
    const validated = sportsMatchFeeSchema.parse(body);

    // Verify player belongs to the match's team
    const player = await prisma.sportsPlayer.findFirst({
      where: { id: validated.playerId, teamId: match.teamId },
    });
    if (!player) {
      return NextResponse.json({ error: 'Player not found in this team' }, { status: 404 });
    }

    if (validated.accountId) {
      const account = await prisma.account.findFirst({
        where: { id: validated.accountId, userId },
      });
      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
    }

    const fee = await prisma.sportsMatchFee.create({
      data: {
        matchId,
        playerId: validated.playerId,
        amount: validated.amount,
        accountId: validated.accountId || null,
        isPaid: validated.isPaid,
        paidDate: validated.paidDate ? new Date(validated.paidDate) : null,
        notes: validated.notes,
      },
    });

    return NextResponse.json({ data: fee }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    // Unique constraint violation (player already has fee for this match)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'This player already has a fee for this match' }, { status: 409 });
    }
    console.error('POST /api/sports/matches/[id]/fees error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
