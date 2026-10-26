import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sportsPlayerUpdateSchema } from '@/lib/validations/schemas';

type Params = { params: Promise<{ id: string; playerId: string }> };

// PUT /api/sports/teams/:id/players/:playerId
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: teamId, playerId } = await params;
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const validated = sportsPlayerUpdateSchema.parse(body);

    const team = await prisma.sportsTeam.findFirst({ where: { id: teamId, userId } });
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const player = await prisma.sportsPlayer.findFirst({ where: { id: playerId, teamId } });
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    if (validated.personId) {
      const person = await prisma.person.findFirst({ where: { id: validated.personId, userId } });
      if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    const updated = await prisma.sportsPlayer.update({
      where: { id: playerId },
      data: {
        name: validated.name.trim(),
        personId: validated.personId || null,
        phone: validated.phone || null,
        role: validated.role || null,
        matchFee: validated.matchFee,
        isActive: validated.isActive,
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
    console.error('PUT /api/sports/teams/[id]/players/[playerId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/sports/teams/:id/players/:playerId — refuse if match fees exist
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: teamId, playerId } = await params;
    const userId = (session.user as { id: string }).id;

    const team = await prisma.sportsTeam.findFirst({ where: { id: teamId, userId } });
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const player = await prisma.sportsPlayer.findFirst({
      where: { id: playerId, teamId },
      include: { _count: { select: { fees: true } } },
    });
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    if (player._count.fees > 0) {
      return NextResponse.json(
        { error: `Cannot delete a player with ${player._count.fees} match fee record(s). Remove all fee records first.` },
        { status: 400 }
      );
    }

    await prisma.sportsPlayer.delete({ where: { id: playerId } });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/sports/teams/[id]/players/[playerId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
