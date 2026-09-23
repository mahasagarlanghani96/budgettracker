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

    // Delete entries for the member's slots (last N entries by slot number)
    const entries = await prisma.committeeEntry.findMany({
      where: { committeeId },
      orderBy: { slotNumber: 'desc' },
      take: member.slots,
    });

    await prisma.$transaction(async (tx: any) => {
      for (const entry of entries) {
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
