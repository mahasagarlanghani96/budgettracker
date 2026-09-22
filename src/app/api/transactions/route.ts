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
    const search = searchParams.get('search');

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
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validated = transactionSchema.parse(body);
    const userId = (session.user as { id: string }).id;

    // Verify source account ownership
    if (validated.sourceAccountId) {
      const account = await prisma.account.findFirst({
        where: { id: validated.sourceAccountId, userId },
      });
      if (!account) {
        return NextResponse.json({ error: 'Source account not found' }, { status: 404 });
      }
    }

    // For transfers, verify destination account
    if (validated.type === 'TRANSFER' && validated.destAccountId) {
      const destAccount = await prisma.account.findFirst({
        where: { id: validated.destAccountId, userId },
      });
      if (!destAccount) {
        return NextResponse.json({ error: 'Destination account not found' }, { status: 404 });
      }
    }

    // Verify category if provided
    if (validated.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: validated.categoryId, userId },
      });
      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
    }

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
        transactionDate: new Date(validated.transactionDate),
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
