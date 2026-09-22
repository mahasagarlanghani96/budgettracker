import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { committeeSchema } from '@/lib/validations/schemas';

// GET /api/committees
export async function GET() {
  try {
    const session = await requireAuth();

    const committees = await prisma.committee.findMany({
      where: { userId: (session.user as { id: string }).id },
      include: {
        members: {
          include: { person: true },
        },
        rounds: {
          orderBy: { roundNumber: 'asc' },
        },
        _count: { select: { members: true, rounds: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: committees });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/committees
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validated = committeeSchema.parse(body);

    const committee = await prisma.committee.create({
      data: {
        userId: (session.user as { id: string }).id,
        name: validated.name,
        type: validated.type,
        memberCount: validated.memberCount,
        monthlyContribution: validated.monthlyContribution,
        totalAmount: validated.totalAmount,
        startDate: validated.startDate ? new Date(validated.startDate) : new Date(),
        notes: validated.notes,
        isPrivate: validated.isPrivate,
      },
    });

    return NextResponse.json({ data: committee }, { status: 201 });
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
