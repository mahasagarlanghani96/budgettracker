import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// POST /api/committees/:id/members — add member(s)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id: committeeId } = await params;
    const body = await request.json();
    const userId = (session.user as { id: string }).id;

    const committee = await prisma.committee.findFirst({
      where: { id: committeeId, userId },
      include: { _count: { select: { members: true } } },
    });

    if (!committee) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 });
    }

    // Verify person exists if personId provided
    if (body.personId) {
      const person = await prisma.person.findFirst({
        where: { id: body.personId, userId },
      });
      if (!person) {
        return NextResponse.json({ error: 'Person not found' }, { status: 404 });
      }
    }

    const slots = body.slots || 1;

    // Check capacity
    const currentEntries = await prisma.committeeEntry.count({
      where: { committeeId },
    });

    if (currentEntries + slots > committee.memberCount) {
      return NextResponse.json(
        { error: `Adding ${slots} slot(s) would exceed total slots (${committee.memberCount}). ${committee.memberCount - currentEntries} slot(s) remaining.` },
        { status: 400 }
      );
    }

    if (!body.name) {
      return NextResponse.json({ error: 'Member name is required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // Create the member
      const member = await tx.committeeMember.create({
        data: {
          committeeId,
          personId: body.personId || null,
          name: body.name,
          slots,
          isUser: body.isUser || false,
          notes: body.notes,
        },
      });

      // Create entries (slots) for the user
      const entries = [];
      const nextSlot = currentEntries + 1;
      for (let i = 0; i < slots; i++) {
        const entry = await tx.committeeEntry.create({
          data: {
            committeeId,
            userId,
            slotNumber: nextSlot + i,
          },
        });
        entries.push(entry);
      }

      return { member, entries };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('POST /api/committees/[id]/members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
