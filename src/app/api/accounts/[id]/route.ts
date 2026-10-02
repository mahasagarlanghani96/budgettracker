import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { accountUpdateSchema } from '@/lib/validations/schemas';
import { calculateAccountBalance } from '@/lib/calculations/balance';

// GET /api/accounts/:id
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10) || 0;

    const account = await prisma.account.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const balance = await calculateAccountBalance(account.id);
    const txWhere = {
      OR: [{ sourceAccountId: id }, { destAccountId: id }] as any,
      userId: (session.user as { id: string }).id,
      isDeleted: false,
    };
    const [recentTransactions, totalTransactions] = await Promise.all([
      prisma.transaction.findMany({
        where: txWhere,
        include: { category: true, sourceAccount: true, destAccount: true, person: true },
        orderBy: { transactionDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where: txWhere }),
    ]);

    return NextResponse.json({
      data: { ...account, currentBalance: balance.toString(), recentTransactions, totalTransactions },
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
    const validated = accountUpdateSchema.parse(body);

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
        isActive: validated.isActive,
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

    const balance = await calculateAccountBalance(id);
    if (parseFloat(balance.toString()) !== 0) {
      return NextResponse.json(
        { error: `Cannot delete account with non-zero balance (${balance}). Transfer or withdraw funds first.` },
        { status: 400 }
      );
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

    // Check for other FK references (loans, investments, savings, plots, committees)
    const [loanCount, investmentCount, savingsCount, plotCount, contribCount, recvCount] = await Promise.all([
      prisma.loan.count({ where: { accountId: id } }),
      prisma.investment.count({ where: { accountId: id } }),
      prisma.savingsTransaction.count({ where: { accountId: id } }),
      prisma.plotPayment.count({ where: { accountId: id } }),
      prisma.committeeContribution.count({ where: { accountId: id } }),
      prisma.committeeReceiving.count({ where: { accountId: id } }),
    ]);

    const refCount = loanCount + investmentCount + savingsCount + plotCount + contribCount + recvCount;
    if (refCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete account that is referenced by ${refCount} record(s) (loans, investments, savings, plots, or committees).` },
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
