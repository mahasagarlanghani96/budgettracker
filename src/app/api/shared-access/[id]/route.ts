import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const updateSchema = z.object({
  accessLevel: z.enum(['VIEW', 'EDIT', 'ADMIN']),
});

// PUT /api/shared-access/:id — update access level
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = updateSchema.parse(body);

    const existing = await prisma.sharedAccess.findFirst({
      where: { id, sharedById: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    const share = await prisma.sharedAccess.update({
      where: { id },
      data: { accessLevel: validated.accessLevel },
      include: { sharedWith: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ data: share });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('PUT /api/shared-access error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/shared-access/:id — revoke access
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const existing = await prisma.sharedAccess.findFirst({
      where: { id, sharedById: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    await prisma.sharedAccess.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/shared-access error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
