import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { personSchema } from '@/lib/validations/schemas';

// GET /api/persons
export async function GET() {
  try {
    const session = await requireAuth();

    const persons = await prisma.person.findMany({
      where: { userId: (session.user as { id: string }).id },
      include: {
        _count: { select: { loans: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: persons });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/persons
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validated = personSchema.parse(body);

    const person = await prisma.person.create({
      data: { ...validated, userId: (session.user as { id: string }).id },
    });

    return NextResponse.json({ data: person }, { status: 201 });
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
