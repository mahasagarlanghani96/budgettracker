import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { categorySchema } from '@/lib/validations/schemas';

// GET /api/categories
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // INCOME or EXPENSE
    const userOnly = searchParams.get('userOnly') === 'true';

    const userId = (session.user as { id: string }).id;
    const groupFilter: Record<string, unknown> = {};
    if (type === 'INCOME' || type === 'EXPENSE') {
      groupFilter.group = type;
    }

    const ownerFilter = userOnly
      ? { userId }
      : { OR: [{ userId }, { isSystem: true }] };

    const categories = await prisma.category.findMany({
      where: {
        ...groupFilter,
        ...ownerFilter,
      },
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ data: categories });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/categories
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validated = categorySchema.parse(body);

    const userId = (session.user as { id: string }).id;

    // DEF-090: Check for duplicate category names for the same user and group
    const existing = await prisma.category.findFirst({
      where: {
        userId,
        name: { equals: validated.name, mode: 'insensitive' },
        group: validated.group,
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A ${validated.group.toLowerCase()} category named "${validated.name}" already exists` },
        { status: 409 }
      );
    }

    const category = await prisma.category.create({
      data: { ...validated, userId },
    });

    return NextResponse.json({ data: category }, { status: 201 });
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
