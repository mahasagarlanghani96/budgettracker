import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { committeeReceivingSchema } from '@/lib/validations/schemas';
import { softDeleteLedgerEntry } from '@/lib/ledger';

type Params = { params: Promise<{ id: string; recId: string }> };

// PUT /api/committees/:id/receivings/:recId
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: committeeId, recId } = await params;
    const body = await request.json();
    const validated = committeeReceivingSchema.parse({ ...body, committeeId });
    const userId = (session.user as { id: string }).id;

    const committee = await prisma.committee.findFirst({
      where: { id: committeeId, userId },
    });
    if (!committee) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 });
    }

    const existing = await prisma.committeeReceiving.findFirst({
      where: { id: recId, committeeId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Receiving not found' }, { status: 404 });
    }

    const txDate = new Date(validated.transactionDate);

    const isHistorical = body.isHistorical ?? false;

    const result = await prisma.$transaction(async (tx: any) => {
      // Use destAccountId (not sourceAccountId) since receivings credit the account
      await softDeleteLedgerEntry(tx, {
        link: { committeeRecvId: recId },
        userId,
        type: 'COMMITTEE_RECEIVING',
        amount: existing.actualAmount,
        accountField: 'destAccountId',
        accountId: existing.accountId,
        transactionDate: existing.transactionDate,
      });

      // Verify the old entry was actually soft-deleted before creating replacement
      const orphanCheck = await tx.transaction.findFirst({
        where: {
          committeeRecvId: recId,
          userId,
          isDeleted: false,
        },
      });
      if (orphanCheck) {
        await tx.transaction.update({
          where: { id: orphanCheck.id },
          data: { isDeleted: true, deletedAt: new Date() },
        });
      }

      const receiving = await tx.committeeReceiving.update({
        where: { id: recId },
        data: {
          entryId: validated.entryId,
          roundId: validated.roundId || null,
          accountId: validated.accountId,
          expectedAmount: validated.expectedAmount ?? null,
          actualAmount: validated.actualAmount,
          transactionDate: txDate,
          notes: validated.notes,
        },
        include: { entry: true, account: true, round: true },
      });

      await tx.transaction.create({
        data: {
          userId,
          destAccountId: validated.accountId,
          type: 'COMMITTEE_RECEIVING',
          amount: validated.actualAmount,
          description: `Committee receiving: ${committee.name}`,
          transactionDate: txDate,
          committeeRecvId: recId,
          isHistorical,
        },
      });

      return receiving;
    });

    return NextResponse.json({ data: result });
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

// DELETE /api/committees/:id/receivings/:recId
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: committeeId, recId } = await params;
    const userId = (session.user as { id: string }).id;

    const committee = await prisma.committee.findFirst({
      where: { id: committeeId, userId },
    });
    if (!committee) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 });
    }

    const existing = await prisma.committeeReceiving.findFirst({
      where: { id: recId, committeeId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Receiving not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx: any) => {
      // Use destAccountId (not sourceAccountId) since receivings credit the account
      await softDeleteLedgerEntry(tx, {
        link: { committeeRecvId: recId },
        userId,
        type: 'COMMITTEE_RECEIVING',
        amount: existing.actualAmount,
        accountField: 'destAccountId',
        accountId: existing.accountId,
        transactionDate: existing.transactionDate,
      });
      await tx.committeeReceiving.delete({ where: { id: recId } });
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
