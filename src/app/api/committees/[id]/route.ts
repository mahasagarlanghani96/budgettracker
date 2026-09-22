import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

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

    const existing = await prisma.committee.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 });
    }

    const committee = await prisma.committee.update({
      where: { id },
      data: {
        name: body.name,
        status: body.status,
        notes: body.notes,
      },
    });

    return NextResponse.json({ data: committee });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
