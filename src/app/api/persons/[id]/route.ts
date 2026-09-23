import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { personUpdateSchema } from '@/lib/validations/schemas';

type Params = { params: Promise<{ id: string }> };

// PUT /api/persons/:id
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const validated = personUpdateSchema.parse(body);

    const existing = await prisma.person.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: 'Person not found' }, { status: 404 });

    const person = await prisma.person.update({
      where: { id },
      data: {
        name: validated.name,
        phone: validated.phone,
        email: validated.email || null,
        relationship: validated.relationship,
        notes: validated.notes,
        isActive: validated.isActive,
      },
    });

    return NextResponse.json({ data: person });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('PUT /api/persons/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/persons/:id
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = (session.user as { id: string }).id;

    const existing = await prisma.person.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: 'Person not found' }, { status: 404 });

    const loanCount = await prisma.loan.count({ where: { personId: id } });
    const memberCount = await prisma.committeeMember.count({ where: { personId: id } });
    const txCount = await prisma.transaction.count({ where: { personId: id, isDeleted: false } });

    const uses: string[] = [];
    if (loanCount > 0) uses.push(`${loanCount} loan(s)`);
    if (memberCount > 0) uses.push(`${memberCount} committee membership(s)`);
    if (txCount > 0) uses.push(`${txCount} transaction(s)`);

    if (uses.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete person used by ${uses.join(', ')}. Remove those records first or mark the person as inactive.` },
        { status: 400 }
      );
    }

    await prisma.person.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/persons/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
