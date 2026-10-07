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
      return NextResponse.json({ data: { transactions: [], accounts: [], persons: [], loans: [], investments: [], categories: [], committees: [], savingsGoals: [], plots: [] } });
    }
    if (q.length > 200) {
      return NextResponse.json({ error: 'Search query too long' }, { status: 400 });
    }

    const userId = (session.user as { id: string }).id;
    const search = { contains: q, mode: 'insensitive' as const };

    const isNumeric = /^\d+(\.\d+)?$/.test(q);
    const numericValue = isNumeric ? parseFloat(q) : null;

    const [transactions, accounts, persons, loans, investments, categories, committees, savingsGoals, plots] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId,
          isDeleted: false,
          OR: [
            { description: search },
            { notes: search },
            { category: { name: search } },
            { sourceAccount: { name: search } },
            { destAccount: { name: search } },
            { person: { name: search } },
            ...(numericValue ? [{ amount: numericValue }] : []),
          ],
        },
        include: { category: true, sourceAccount: true, destAccount: true, person: true },
        orderBy: { transactionDate: 'desc' },
        take: 15,
      }),
      prisma.account.findMany({
        where: {
          userId,
          OR: [
            { name: search },
            { notes: search },
          ],
        },
        take: 10,
      }),
      prisma.person.findMany({
        where: {
          userId,
          OR: [
            { name: search },
            { phone: search },
            { email: search },
            { relationship: search },
            { notes: search },
          ],
        },
        take: 10,
      }),
      prisma.loan.findMany({
        where: {
          userId,
          OR: [
            { notes: search },
            { person: { name: search } },
            { account: { name: search } },
          ],
        },
        include: { person: true, account: { select: { name: true } } },
        take: 10,
      }),
      prisma.investment.findMany({
        where: {
          userId,
          OR: [
            { name: search },
            { investmentType: search },
            { notes: search },
            { account: { name: search } },
          ],
        },
        include: { account: { select: { name: true } } },
        take: 10,
      }),
      prisma.category.findMany({
        where: {
          OR: [
            { userId, name: search },
            { isSystem: true, name: search },
          ],
        },
        take: 10,
      }),
      prisma.committee.findMany({
        where: {
          userId,
          OR: [
            { name: search },
            { notes: search },
          ],
        },
        take: 10,
      }),
      prisma.savingsGoal.findMany({
        where: {
          userId,
          OR: [
            { name: search },
            { notes: search },
          ],
        },
        take: 10,
      }),
      prisma.plot.findMany({
        where: {
          userId,
          OR: [
            { name: search },
            { location: search },
            { notes: search },
          ],
        },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      data: { transactions, accounts, persons, loans, investments, categories, committees, savingsGoals, plots },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
