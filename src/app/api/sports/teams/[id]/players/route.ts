import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sportsPlayerSchema } from '@/lib/validations/schemas';

// POST /api/sports/teams/:id/players
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id: teamId } = await params;
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const validated = sportsPlayerSchema.parse(body);

    const team = await prisma.sportsTeam.findFirst({
      where: { id: teamId, userId },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Verify person exists if personId provided
    if (validated.personId) {
      const person = await prisma.person.findFirst({
        where: { id: validated.personId, userId },
      });
      if (!person) {
        return NextResponse.json({ error: 'Person not found' }, { status: 404 });
      }
    }

    const player = await prisma.sportsPlayer.create({
      data: {
        teamId,
        name: validated.name.trim(),
        personId: validated.personId || null,
        phone: validated.phone || null,
        role: validated.role || null,
        matchFee: validated.matchFee,
      },
    });

    return NextResponse.json({ data: player }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('POST /api/sports/teams/[id]/players error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
