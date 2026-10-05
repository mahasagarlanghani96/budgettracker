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

    const userId = (session.user as { id: string }).id;
    const groupFilter: Record<string, unknown> = {};
    if (type === 'INCOME' || type === 'EXPENSE') {
      groupFilter.group = type;
    }

    const categories = await prisma.category.findMany({
      where: {
        ...groupFilter,
        OR: [{ userId }, { isSystem: true }],
      },
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
    });

    // Deduplicate: if a user category has the same name+group as a system one,
    // keep only the system version (it has the icon and is the canonical default).
    const seen = new Map<string, typeof categories[number]>();
    for (const cat of categories) {
      const key = `${cat.name.toLowerCase()}::${cat.group}`;
      const existing = seen.get(key);
      if (!existing || (!existing.isSystem && cat.isSystem)) {
        seen.set(key, cat);
      }
    }
    const deduped = Array.from(seen.values()).sort((a, b) => {
      if (a.group !== b.group) return a.group < b.group ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ data: deduped });
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

    // Check for duplicate against both user's own and system categories
    const existing = await prisma.category.findFirst({
      where: {
        name: { equals: validated.name, mode: 'insensitive' },
        group: validated.group,
        OR: [{ userId }, { isSystem: true }],
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
