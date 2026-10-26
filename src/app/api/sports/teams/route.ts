import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sportsTeamSchema } from '@/lib/validations/schemas';

// GET /api/sports/teams
export async function GET() {
  try {
    const session = await requireAuth();

    const teams = await prisma.sportsTeam.findMany({
      where: { userId: (session.user as { id: string }).id },
      include: {
        _count: { select: { players: true, matches: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: teams });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sports/teams
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validated = sportsTeamSchema.parse(body);

    const team = await prisma.sportsTeam.create({
      data: {
        userId: (session.user as { id: string }).id,
        name: validated.name.trim(),
        sport: validated.sport,
        notes: validated.notes,
      },
    });

    return NextResponse.json({ data: team }, { status: 201 });
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
