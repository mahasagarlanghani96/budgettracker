import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { transactionSchema } from '@/lib/validations/schemas';

// GET /api/transactions — list with filters & pagination
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const skip = (page - 1) * limit;

    const accountId = searchParams.get('accountId');
    const categoryId = searchParams.get('categoryId');
    const type = searchParams.get('type');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search')?.slice(0, 200);

    const where: Record<string, unknown> = {
      userId: (session.user as { id: string }).id,
      isDeleted: false,
    };

    if (accountId) {
      where.OR = [
        { sourceAccountId: accountId },
        { destAccountId: accountId },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (type) where.type = type;
    if (from || to) {
      where.transactionDate = {};
      if (from) (where.transactionDate as Record<string, unknown>).gte = new Date(from);
      if (to) (where.transactionDate as Record<string, unknown>).lte = new Date(to);
    }
    if (search) {
      // Merge with any existing OR
      const searchOr = [
        { description: { contains: search, mode: 'insensitive' as const } },
        { notes: { contains: search, mode: 'insensitive' as const } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR as Record<string, unknown>[] }, { OR: searchOr }];
        delete where.OR;
      } else {
        where.OR = searchOr;
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: true,
          sourceAccount: true,
          destAccount: true,
          person: true,
        },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /api/transactions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/transactions — create transaction
// For COMMITTEE_CONTRIBUTION, COMMITTEE_RECEIVING, and PLOT_PAYMENT types,
// also creates the linked module record (contribution/receiving/payment).
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validated = transactionSchema.parse(body);
    const userId = (session.user as { id: string }).id;

    const accountId = validated.sourceAccountId || validated.destAccountId;

    // Verify source account ownership
    if (validated.sourceAccountId) {
      const account = await prisma.account.findFirst({
        where: { id: validated.sourceAccountId, userId },
      });
      if (!account) {
        return NextResponse.json({ error: 'Source account not found' }, { status: 404 });
      }
    }

    // For transfers, verify destination account and ensure different accounts
    if (validated.type === 'TRANSFER') {
      if (validated.sourceAccountId && validated.destAccountId && validated.sourceAccountId === validated.destAccountId) {
        return NextResponse.json({ error: 'Source and destination accounts must be different' }, { status: 400 });
      }
      if (validated.destAccountId) {
        const destAccount = await prisma.account.findFirst({
          where: { id: validated.destAccountId, userId },
        });
        if (!destAccount) {
          return NextResponse.json({ error: 'Destination account not found' }, { status: 404 });
        }
      }
    }

    // Verify category if provided (user-owned or system)
    if (validated.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: validated.categoryId, OR: [{ userId }, { isSystem: true }] },
      });
      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
    }

    const txDate = new Date(validated.transactionDate);
    const isHistorical = body.isHistorical === true;
    const isCommitteeType = validated.type === 'COMMITTEE_CONTRIBUTION' || validated.type === 'COMMITTEE_RECEIVING';
    const isPlotType = validated.type === 'PLOT_PAYMENT';

    // --- Committee contribution / receiving ---
    if (isCommitteeType) {
      const { committeeId, entryId, roundId, profitDeduction } = body;
      if (!committeeId || !entryId) {
        return NextResponse.json({ error: 'committeeId and entryId are required' }, { status: 400 });
      }

      const committee = await prisma.committee.findFirst({ where: { id: committeeId, userId } });
      if (!committee) return NextResponse.json({ error: 'Committee not found' }, { status: 404 });

      const entry = await prisma.committeeEntry.findFirst({ where: { id: entryId, committeeId } });
      if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

      if (!accountId) return NextResponse.json({ error: 'Account is required' }, { status: 400 });

      const result = await prisma.$transaction(async (tx: any) => {
        if (validated.type === 'COMMITTEE_CONTRIBUTION') {
          const contribution = await tx.committeeContribution.create({
            data: {
              committeeId,
              entryId,
              roundId: roundId || null,
              accountId,
              expectedAmount: validated.expectedAmount ?? validated.amount,
              actualAmount: validated.amount,
              profitDeduction: profitDeduction ?? 0,
              status: 'PAID',
              transactionDate: txDate,
              notes: validated.notes,
            },
          });

          const transaction = await tx.transaction.create({
            data: {
              userId,
              sourceAccountId: accountId,
              type: 'COMMITTEE_CONTRIBUTION',
              amount: validated.amount,
              description: validated.description || `Committee contribution: ${committee.name}`,
              transactionDate: txDate,
              committeeContribId: contribution.id,
              isHistorical,
              isPrivate: validated.isPrivate,
              notes: validated.notes,
            },
            include: { sourceAccount: true, destAccount: true, category: true },
          });

          return transaction;
        } else {
          const receiving = await tx.committeeReceiving.create({
            data: {
              committeeId,
              entryId,
              roundId: roundId || null,
              accountId,
              expectedAmount: validated.expectedAmount ?? null,
              actualAmount: validated.amount,
              transactionDate: txDate,
              notes: validated.notes,
            },
          });

          const transaction = await tx.transaction.create({
            data: {
              userId,
              destAccountId: accountId,
              type: 'COMMITTEE_RECEIVING',
              amount: validated.amount,
              description: validated.description || `Committee receiving: ${committee.name}`,
              transactionDate: txDate,
              committeeRecvId: receiving.id,
              isHistorical,
              isPrivate: validated.isPrivate,
              notes: validated.notes,
            },
            include: { sourceAccount: true, destAccount: true, category: true },
          });

          return transaction;
        }
      });

      return NextResponse.json({ data: result }, { status: 201 });
    }

    // --- Plot payment ---
    if (isPlotType) {
      const { plotId, dueDate } = body;
      if (!plotId) {
        return NextResponse.json({ error: 'plotId is required' }, { status: 400 });
      }

      const plot = await prisma.plot.findFirst({ where: { id: plotId, userId } });
      if (!plot) return NextResponse.json({ error: 'Plot not found' }, { status: 404 });

      if (!accountId) return NextResponse.json({ error: 'Account is required' }, { status: 400 });

      const result = await prisma.$transaction(async (tx: any) => {
        const payment = await tx.plotPayment.create({
          data: {
            plotId,
            accountId,
            amount: validated.amount,
            transactionDate: txDate,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            notes: validated.notes,
          },
        });

        const transaction = await tx.transaction.create({
          data: {
            userId,
            sourceAccountId: accountId,
            type: 'PLOT_PAYMENT',
            amount: validated.amount,
            description: validated.description || `Plot payment: ${plot.name}`,
            transactionDate: txDate,
            plotPaymentId: payment.id,
            isHistorical,
            isPrivate: validated.isPrivate,
            notes: validated.notes,
          },
          include: { sourceAccount: true, destAccount: true, category: true },
        });

        return transaction;
      });

      return NextResponse.json({ data: result }, { status: 201 });
    }

    // --- Standard transaction (INCOME, EXPENSE, TRANSFER, etc.) ---
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: validated.type,
        amount: validated.amount,
        sourceAccountId: validated.sourceAccountId,
        destAccountId: validated.destAccountId,
        categoryId: validated.categoryId,
        personId: validated.personId,
        description: validated.description,
        notes: validated.notes,
        transactionDate: txDate,
        transactionTime: validated.transactionTime,
        taxAmount: validated.taxAmount,
        taxPercent: validated.taxPercent,
        expectedAmount: validated.expectedAmount,
        isPrivate: validated.isPrivate,
        relatedTransId: validated.relatedTransId,
      },
      include: {
        category: true,
        sourceAccount: true,
        destAccount: true,
      },
    });

    return NextResponse.json({ data: transaction }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('POST /api/transactions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
