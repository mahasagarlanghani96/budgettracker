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

    const where: Record<string, unknown> = { userId: (session.user as { id: string }).id };
    if (type === 'INCOME' || type === 'EXPENSE') {
      where.group = type;
    }

    const categories = await prisma.category.findMany({
      where,
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

    const category = await prisma.category.create({
      data: { ...validated, userId: (session.user as { id: string }).id },
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
