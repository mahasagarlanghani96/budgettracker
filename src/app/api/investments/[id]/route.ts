import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// PUT /api/investments/:id — update current value or details
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.investment.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    const investment = await prisma.investment.update({
      where: { id },
      data: {
        name: body.name,
        currentValue: body.currentValue,
        isActive: body.isActive,
        notes: body.notes,
      },
    });

    return NextResponse.json({ data: investment });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/investments/:id
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const existing = await prisma.investment.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    await prisma.investment.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
