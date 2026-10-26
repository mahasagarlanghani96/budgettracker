import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sportsMatchSchema } from '@/lib/validations/schemas';
import Decimal from 'decimal.js';

// GET /api/sports/matches/:id
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const match = await prisma.sportsMatch.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
      include: {
        team: { select: { id: true, name: true, sport: true } },
        expenses: {
          orderBy: { createdAt: 'desc' },
        },
        fees: {
          include: {
            player: { select: { id: true, name: true, phone: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Calculate summary
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
    const pendingFees = totalFees.minus(collectedFees);

    return NextResponse.json({
      data: {
        ...match,
        summary: {
          totalExpenses: totalExpenses.toString(),
          totalFees: totalFees.toString(),
          collectedFees: collectedFees.toString(),
          pendingFees: pendingFees.toString(),
        },
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/sports/matches/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = sportsMatchSchema.parse(body);
    const userId = (session.user as { id: string }).id;

    const existing = await prisma.sportsMatch.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Verify team ownership if teamId changed
    if (validated.teamId !== existing.teamId) {
      const team = await prisma.sportsTeam.findFirst({
        where: { id: validated.teamId, userId },
      });
      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
    }

    const match = await prisma.sportsMatch.update({
      where: { id },
      data: {
        teamId: validated.teamId,
        opponent: validated.opponent || null,
        venue: validated.venue || null,
        matchDate: new Date(validated.matchDate),
        notes: validated.notes,
      },
    });

    return NextResponse.json({ data: match });
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

// DELETE /api/sports/matches/:id
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = (session.user as { id: string }).id;

    const existing = await prisma.sportsMatch.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Cascade deletes expenses and fees (onDelete: Cascade in schema)
    await prisma.sportsMatch.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/sports/matches/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
