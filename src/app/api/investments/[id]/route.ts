import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { investmentUpdateSchema } from '@/lib/validations/schemas';

// PUT /api/investments/:id — update all editable fields
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = investmentUpdateSchema.parse(body);
    const userId = (session.user as { id: string }).id;

    const existing = await prisma.investment.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    // Verify account if changed
    if (validated.accountId && validated.accountId !== existing.accountId) {
      const account = await prisma.account.findFirst({ where: { id: validated.accountId, userId } });
      if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const investment = await prisma.investment.update({
      where: { id },
      data: {
        name: validated.name,
        investmentType: validated.investmentType,
        amountInvested: validated.amountInvested,
        currentValue: validated.currentValue,
        accountId: validated.accountId,
        investmentDate: validated.investmentDate ? new Date(validated.investmentDate) : undefined,
        notes: validated.notes,
        isActive: validated.isActive,
      },
    });

    return NextResponse.json({ data: investment });
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
