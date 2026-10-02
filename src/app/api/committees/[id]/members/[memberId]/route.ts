import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { committeeMemberSchema } from '@/lib/validations/schemas';

type Params = { params: Promise<{ id: string; memberId: string }> };

// PUT /api/committees/:id/members/:memberId
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: committeeId, memberId } = await params;
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const validated = committeeMemberSchema.parse(body);

    const committee = await prisma.committee.findFirst({ where: { id: committeeId, userId } });
    if (!committee) return NextResponse.json({ error: 'Committee not found' }, { status: 404 });

    const member = await prisma.committeeMember.findFirst({ where: { id: memberId, committeeId } });
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    if (validated.personId) {
      const person = await prisma.person.findFirst({ where: { id: validated.personId, userId } });
      if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    // Check slots capacity if slots increased
    if (validated.slots > member.slots) {
      const currentEntries = await prisma.committeeEntry.count({ where: { committeeId } });
      const diff = validated.slots - member.slots;
      if (currentEntries + diff > committee.memberCount) {
        return NextResponse.json(
          { error: `Increasing to ${validated.slots} slot(s) would exceed capacity. ${committee.memberCount - currentEntries} slot(s) remaining.` },
          { status: 400 }
        );
      }
    }

    await prisma.committeeMember.update({
      where: { id: memberId },
      data: {
        name: validated.name,
        personId: validated.personId || null,
        slots: validated.slots,
        isUser: validated.isUser,
        notes: validated.notes,
      },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('PUT /api/committees/[id]/members/[memberId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/committees/:id/members/:memberId
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: committeeId, memberId } = await params;
    const userId = (session.user as { id: string }).id;

    const committee = await prisma.committee.findFirst({ where: { id: committeeId, userId } });
    if (!committee) return NextResponse.json({ error: 'Committee not found' }, { status: 404 });

    const member = await prisma.committeeMember.findFirst({ where: { id: memberId, committeeId } });
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    // Check if entries from this member have contributions or receivings
    // (we find matching entries by their slot count range — entries are owned
    // by the committee, and the member's `slots` count is how many were created).
    // A safer check: refuse if the committee has ANY contributions/receivings;
    // fine-grained membership tracking is complex.
    const usageCount = await prisma.committeeContribution.count({ where: { committeeId } })
      + await prisma.committeeReceiving.count({ where: { committeeId } });

    if (usageCount > 0) {
      return NextResponse.json(
        { error: 'Cannot remove a member from a committee that has recorded contributions or receivings.' },
        { status: 400 }
      );
    }

    // Delete entries belonging to this member's userId (if isUser) or that were
    // created for this member's slot range. Since CommitteeEntry has no direct FK
    // to CommitteeMember, we identify them by the userId that matches and the
    // slot numbers that belong to this member.
    // Find all entries, determine which belong to this member by matching the
    // member's userId (for isUser members) or by finding the entries that were
    // created when this member was added (highest slot numbers matching member.slots).
    const allEntries = await prisma.committeeEntry.findMany({
      where: { committeeId },
      orderBy: { slotNumber: 'asc' },
    });

    // For isUser members, match by userId; for others, take the last N entries
    // that were added for this member (identified by matching slot count from the end)
    let entriesToDelete: typeof allEntries;
    if (member.isUser) {
      entriesToDelete = allEntries.filter(e => e.userId === userId).slice(-member.slots);
    } else {
      // Find entries that belong to this specific member by looking at the entries
      // that were created for their person. Since entries store userId (the committee
      // owner), we must match by slot position. Get the highest N slot numbers.
      const maxSlot = allEntries.length > 0 ? Math.max(...allEntries.map(e => e.slotNumber)) : 0;
      const memberSlotStart = maxSlot - member.slots + 1;
      entriesToDelete = allEntries.filter(e => e.slotNumber >= memberSlotStart);
    }

    if (entriesToDelete.length === 0) {
      entriesToDelete = [];
    }

    await prisma.$transaction(async (tx: any) => {
      for (const entry of entriesToDelete) {
        await tx.committeeEntry.delete({ where: { id: entry.id } });
      }
      await tx.committeeMember.delete({ where: { id: memberId } });
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/committees/[id]/members/[memberId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
