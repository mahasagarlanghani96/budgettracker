import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sportsMatchSchema } from '@/lib/validations/schemas';
import Decimal from 'decimal.js';

// GET /api/sports/matches
export async function GET() {
  try {
    const session = await requireAuth();

    const matches = await prisma.sportsMatch.findMany({
      where: { userId: (session.user as { id: string }).id },
      include: {
        team: { select: { id: true, name: true, sport: true } },
        expenses: true,
        fees: true,
      },
      orderBy: { matchDate: 'desc' },
    });

    const matchesWithTotals = matches.map((match: any) => {
      const totalExpenses = match.expenses.reduce(
        (sum: Decimal, e: any) => sum.plus(e.amount.toString()),
        new Decimal(0)
      );
      const totalFees = match.fees.reduce(
        (sum: Decimal, f: any) => sum.plus(f.amount.toString()),
        new Decimal(0)
      );
      const collectedFees = match.fees
        .filter((f: any) => f.isPaid)
        .reduce((sum: Decimal, f: any) => sum.plus(f.amount.toString()), new Decimal(0));
      const totalFeeCount = match.fees.length;
      const paidFeeCount = match.fees.filter((f: any) => f.isPaid).length;
      return {
        ...match,
        totalExpenses: totalExpenses.toString(),
        totalFees: totalFees.toString(),
        collectedFees: collectedFees.toString(),
        pendingFees: totalFees.minus(collectedFees).toString(),
        totalFeeCount,
        paidFeeCount,
      };
    });

    return NextResponse.json({ data: matchesWithTotals });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sports/matches
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validated = sportsMatchSchema.parse(body);
    const userId = (session.user as { id: string }).id;
    const playerIds: string[] = Array.isArray(body.playerIds) ? body.playerIds : [];

    // Verify team ownership and fetch selected players
    const team = await prisma.sportsTeam.findFirst({
      where: { id: validated.teamId, userId },
      include: {
        players: {
          where: { isActive: true, ...(playerIds.length > 0 ? { id: { in: playerIds } } : {}) },
          select: { id: true, matchFee: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const match = await prisma.sportsMatch.create({
      data: {
        userId,
        teamId: validated.teamId,
        opponent: validated.opponent || null,
        venue: validated.venue || null,
        matchDate: new Date(validated.matchDate),
        notes: validated.notes,
      },
    });

    // Auto-generate fees for selected players
    if (playerIds.length > 0 && team.players.length > 0) {
      await prisma.sportsMatchFee.createMany({
        data: team.players.map((p) => ({
          matchId: match.id,
          playerId: p.id,
          amount: p.matchFee,
        })),
      });
    }

    return NextResponse.json({ data: match }, { status: 201 });
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
