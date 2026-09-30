import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { accountSchema } from '@/lib/validations/schemas';
import { calculateAccountBalance } from '@/lib/calculations/balance';

// GET /api/accounts — list all accounts for the user (own + shared with me)
export async function GET() {
  try {
    const session = await requireAuth();
    const userId = (session.user as { id: string }).id;

    const [ownAccounts, sharedEntries] = await Promise.all([
      prisma.account.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sharedAccess.findMany({
        where: { sharedWithId: userId, resourceType: 'account' },
        select: { resourceId: true, accessLevel: true },
      }),
    ]);

    const sharedAccountIds = sharedEntries.map((s) => s.resourceId);
    const sharedAccounts = sharedAccountIds.length > 0
      ? await prisma.account.findMany({
          where: { id: { in: sharedAccountIds } },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const accessMap = Object.fromEntries(sharedEntries.map((s) => [s.resourceId, s.accessLevel]));

    const ownWithBalance = await Promise.all(
      ownAccounts.map(async (account: { id: string; [key: string]: unknown }) => {
        const balance = await calculateAccountBalance(account.id);
        return { ...account, currentBalance: balance.toString() };
      })
    );

    const sharedWithBalance = await Promise.all(
      sharedAccounts.map(async (account) => {
        const balance = await calculateAccountBalance(account.id);
        return {
          ...account,
          currentBalance: balance.toString(),
          sharedByOwner: (account as any).user?.name,
          sharedAccessLevel: accessMap[account.id],
        };
      })
    );

    return NextResponse.json({ data: ownWithBalance, shared: sharedWithBalance });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /api/accounts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/accounts — create a new account
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validated = accountSchema.parse(body);

    const account = await prisma.account.create({
      data: {
        ...validated,
        userId: (session.user as { id: string }).id,
      },
    });

    return NextResponse.json({ data: account }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('POST /api/accounts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
