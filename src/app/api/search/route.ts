import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/search?q=
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ data: { transactions: [], accounts: [], persons: [], loans: [] } });
    }

    const userId = (session.user as { id: string }).id;
    const search = { contains: q, mode: 'insensitive' as const };

    const [transactions, accounts, persons, loans] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId,
          isDeleted: false,
          OR: [
            { description: search },
            { notes: search },
          ],
        },
        include: { category: true, sourceAccount: true, destAccount: true, person: true },
        orderBy: { transactionDate: 'desc' },
        take: 10,
      }),
      prisma.account.findMany({
        where: { userId, name: search },
        take: 5,
      }),
      prisma.person.findMany({
        where: { userId, OR: [{ name: search }, { phone: search }, { email: search }] },
        take: 5,
      }),
      prisma.loan.findMany({
        where: {
          userId,
          OR: [
            { notes: search },
            { person: { name: search } },
          ],
        },
        include: { person: true },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      data: { transactions, accounts, persons, loans },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
