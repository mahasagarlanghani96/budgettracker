import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { personUpdateSchema } from '@/lib/validations/schemas';
import Decimal from 'decimal.js';

type Params = { params: Promise<{ id: string }> };

// GET /api/persons/:id — full person detail with transactions, loans, committees
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = (session.user as { id: string }).id;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10) || 0;

    const person = await prisma.person.findFirst({
      where: { id, userId },
    });

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    const txWhere = { personId: id, userId, isDeleted: false };

    const [transactions, totalTransactions, loans, committeeMemberships] = await Promise.all([
      prisma.transaction.findMany({
        where: txWhere,
        include: { category: true, sourceAccount: true, destAccount: true },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where: txWhere }),
      prisma.loan.findMany({
        where: { personId: id, userId },
        include: { account: true, _count: { select: { repayments: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.committeeMember.findMany({
        where: { personId: id },
        include: { committee: { select: { id: true, name: true, type: true, status: true, monthlyContribution: true } } },
      }),
    ]);

    const allTxAmounts = await prisma.transaction.groupBy({
      by: ['type'],
      where: txWhere,
      _sum: { amount: true },
      _count: true,
    });

    let totalInflow = new Decimal(0);
    let totalOutflow = new Decimal(0);
    for (const g of allTxAmounts) {
      const amt = new Decimal(g._sum.amount?.toString() || '0');
      if (['INCOME', 'LOAN_REPAYMENT_RECEIVED', 'COMMITTEE_RECEIVING'].includes(g.type)) {
        totalInflow = totalInflow.plus(amt);
      } else {
        totalOutflow = totalOutflow.plus(amt);
      }
    }

    const loanSummary = {
      totalGiven: loans.filter(l => l.direction === 'GIVEN').reduce((s, l) => s.plus(l.amount.toString()), new Decimal(0)).toString(),
      totalTaken: loans.filter(l => l.direction === 'TAKEN').reduce((s, l) => s.plus(l.amount.toString()), new Decimal(0)).toString(),
      outstandingGiven: loans.filter(l => l.direction === 'GIVEN' && l.status === 'ACTIVE').reduce((s, l) => s.plus(l.remainingAmount.toString()), new Decimal(0)).toString(),
      outstandingTaken: loans.filter(l => l.direction === 'TAKEN' && l.status === 'ACTIVE').reduce((s, l) => s.plus(l.remainingAmount.toString()), new Decimal(0)).toString(),
      count: loans.length,
    };

    return NextResponse.json({
      data: {
        ...person,
        transactions,
        totalTransactions,
        loans,
        committeeMemberships,
        summary: {
          totalTransactions,
          totalInflow: totalInflow.toString(),
          totalOutflow: totalOutflow.toString(),
          net: totalInflow.minus(totalOutflow).toString(),
          byType: allTxAmounts.map(g => ({
            type: g.type,
            count: g._count,
            total: g._sum.amount?.toString() || '0',
          })),
        },
        loanSummary,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /api/persons/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
        phone: validated.phone || null,
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
