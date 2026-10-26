import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sportsTeamUpdateSchema } from '@/lib/validations/schemas';
import Decimal from 'decimal.js';

// GET /api/sports/teams/:id
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const team = await prisma.sportsTeam.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
      include: {
        players: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            matchFee: true,
            isActive: true,
            personId: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        matches: {
          include: {
            expenses: true,
            fees: true,
          },
          orderBy: { matchDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Compute expense/fee totals for each match
    const matchesWithTotals = team.matches.map((match: any) => {
      const totalExpenses = match.expenses.reduce(
        (sum: Decimal, e: any) => sum.plus(e.amount.toString()),
        new Decimal(0)
      );
      const totalFees = match.fees.reduce(
        (sum: Decimal, f: any) => sum.plus(f.amount.toString()),
        new Decimal(0)
      );
      return {
        ...match,
        totalExpenses: totalExpenses.toString(),
        totalFees: totalFees.toString(),
      };
    });

    return NextResponse.json({ data: { ...team, matches: matchesWithTotals } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/sports/teams/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = sportsTeamUpdateSchema.parse(body);

    const existing = await prisma.sportsTeam.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const team = await prisma.sportsTeam.update({
      where: { id },
      data: {
        name: validated.name.trim(),
        sport: validated.sport,
        notes: validated.notes,
        isActive: validated.isActive,
      },
    });

    return NextResponse.json({ data: team });
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

// DELETE /api/sports/teams/:id — refuse if matches exist
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = (session.user as { id: string }).id;

    const existing = await prisma.sportsTeam.findFirst({
      where: { id, userId },
      include: {
        _count: { select: { matches: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (existing._count.matches > 0) {
      return NextResponse.json(
        { error: `Cannot delete a team with ${existing._count.matches} match(es). Remove all matches first.` },
        { status: 400 }
      );
    }

    await prisma.sportsTeam.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/sports/teams/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
