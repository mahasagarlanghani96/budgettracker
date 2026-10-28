import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { categoryUpdateSchema } from '@/lib/validations/schemas';

type Params = { params: Promise<{ id: string }> };

// GET /api/categories/:id — category detail with transactions
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = (session.user as { id: string }).id;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const skip = (page - 1) * limit;

    const category = await prisma.category.findFirst({
      where: { id, OR: [{ userId }, { isSystem: true }] },
    });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const txWhere = { categoryId: id, userId, isDeleted: false };

    const [transactions, totalTransactions, totals] = await Promise.all([
      prisma.transaction.findMany({
        where: txWhere,
        include: { sourceAccount: true, destAccount: true, person: true },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where: txWhere }),
      prisma.transaction.aggregate({
        where: txWhere,
        _sum: { amount: true },
      }),
    ]);

    return NextResponse.json({
      data: {
        ...category,
        transactions,
        totalTransactions,
        totalAmount: totals._sum.amount ?? 0,
        pagination: {
          page,
          limit,
          total: totalTransactions,
          totalPages: Math.ceil(totalTransactions / limit),
        },
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /api/categories/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/categories/:id
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const validated = categoryUpdateSchema.parse(body);

    const existing = await prisma.category.findFirst({
      where: { id, OR: [{ userId }, { isSystem: true }] },
    });
    if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    if (existing.isSystem) return NextResponse.json({ error: 'System categories cannot be edited' }, { status: 403 });
    // Check duplicate name against both user's own and system categories
    const dup = await prisma.category.findFirst({
      where: {
        name: { equals: validated.name, mode: 'insensitive' },
        group: validated.group,
        id: { not: id },
        OR: [{ userId }, { isSystem: true }],
      },
    });
    if (dup) return NextResponse.json({ error: 'A category with this name already exists in this group' }, { status: 409 });

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: validated.name,
        group: validated.group,
        icon: validated.icon,
        isActive: validated.isActive,
      },
    });

    return NextResponse.json({ data: category });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('PUT /api/categories/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/categories/:id
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = (session.user as { id: string }).id;

    const existing = await prisma.category.findFirst({
      where: { id, OR: [{ userId }, { isSystem: true }] },
    });
    if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    if (existing.isSystem) return NextResponse.json({ error: 'System categories cannot be deleted' }, { status: 403 });
    const txCount = await prisma.transaction.count({ where: { categoryId: id, isDeleted: false } });
    if (txCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category used by ${txCount} transaction(s). Reassign them first.` },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/categories/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
