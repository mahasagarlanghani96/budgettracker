import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { accountSchema } from '@/lib/validations/schemas';
import { calculateAccountBalance } from '@/lib/calculations/balance';

// GET /api/accounts/:id
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const account = await prisma.account.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const balance = await calculateAccountBalance(account.id);
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        OR: [{ sourceAccountId: id }, { destAccountId: id }],
        isDeleted: false,
      },
      include: { category: true, sourceAccount: true, destAccount: true, person: true },
      orderBy: { transactionDate: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      data: { ...account, currentBalance: balance.toString(), recentTransactions },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /api/accounts/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/accounts/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = accountSchema.parse(body);

    const existing = await prisma.account.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const account = await prisma.account.update({
      where: { id },
      data: {
        name: validated.name,
        accountType: validated.accountType,
        openingBalance: validated.openingBalance,
        openingDate: validated.openingDate ? new Date(validated.openingDate) : undefined,
        currency: validated.currency,
        isShared: validated.isShared,
        notes: validated.notes,
      },
    });

    return NextResponse.json({ data: account });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('PUT /api/accounts/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/accounts/:id (soft-check: prevent if transactions exist)
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const existing = await prisma.account.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const txCount = await prisma.transaction.count({
      where: {
        OR: [{ sourceAccountId: id }, { destAccountId: id }],
        isDeleted: false,
      },
    });

    if (txCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete account with ${txCount} active transaction(s). Delete or reassign transactions first.` },
        { status: 400 }
      );
    }

    await prisma.account.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/accounts/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
