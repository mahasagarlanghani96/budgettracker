import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { categoryUpdateSchema } from '@/lib/validations/schemas';

type Params = { params: Promise<{ id: string }> };

// PUT /api/categories/:id
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const validated = categoryUpdateSchema.parse(body);

    const existing = await prisma.category.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    if (existing.isSystem) return NextResponse.json({ error: 'System categories cannot be edited' }, { status: 403 });

    // Check duplicate name within the same group
    const dup = await prisma.category.findFirst({
      where: { userId, name: validated.name, group: validated.group, id: { not: id } },
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

    const existing = await prisma.category.findFirst({ where: { id, userId } });
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
