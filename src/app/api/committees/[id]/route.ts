import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { committeeUpdateSchema } from '@/lib/validations/schemas';

// GET /api/committees/:id
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const committee = await prisma.committee.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
      include: {
        members: {
          include: {
            person: true,
          },
        },
        entries: true,
        rounds: {
          include: {
            contributions: {
              include: { entry: true },
            },
            receivings: {
              include: { entry: true },
            },
          },
          orderBy: { roundNumber: 'asc' },
        },
        contributions: {
          orderBy: { transactionDate: 'desc' },
        },
        receivings: {
          orderBy: { transactionDate: 'desc' },
        },
      },
    });

    if (!committee) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 });
    }

    return NextResponse.json({ data: committee });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/committees/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = committeeUpdateSchema.parse(body);

    const existing = await prisma.committee.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 });
    }

    const committee = await prisma.committee.update({
      where: { id },
      data: {
        name: validated.name,
        type: validated.type,
        status: validated.status,
        startDate: validated.startDate ? new Date(validated.startDate) : undefined,
        endDate: validated.endDate ? new Date(validated.endDate) : validated.endDate === null ? null : undefined,
        memberCount: validated.memberCount,
        monthlyContribution: validated.monthlyContribution,
        totalAmount: validated.totalAmount,
        notes: validated.notes,
        isPrivate: validated.isPrivate,
      },
    });

    return NextResponse.json({ data: committee });
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

// DELETE /api/committees/:id — refuse if contributions/receivings/rounds exist
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = (session.user as { id: string }).id;

    const existing = await prisma.committee.findFirst({
      where: { id, userId },
      include: {
        _count: { select: { rounds: true, contributions: true, receivings: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 });
    }

    const total = existing._count.rounds + existing._count.contributions + existing._count.receivings;
    if (total > 0) {
      return NextResponse.json(
        { error: `Cannot delete a committee with ${existing._count.rounds} round(s) and ${existing._count.contributions + existing._count.receivings} contribution/receiving record(s). Remove them first or mark the committee as cancelled.` },
        { status: 400 }
      );
    }

    // Cascade deletes members and entries (onDelete: Cascade in schema)
    await prisma.committee.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/committees/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
