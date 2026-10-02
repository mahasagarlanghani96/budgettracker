import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { committeeContributionSchema } from '@/lib/validations/schemas';
import { softDeleteLedgerEntry } from '@/lib/ledger';

type Params = { params: Promise<{ id: string; contribId: string }> };

// PUT /api/committees/:id/contributions/:contribId
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: committeeId, contribId } = await params;
    const body = await request.json();
    const validated = committeeContributionSchema.parse({ ...body, committeeId });
    const userId = (session.user as { id: string }).id;

    const committee = await prisma.committee.findFirst({
      where: { id: committeeId, userId },
    });
    if (!committee) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 });
    }

    const existing = await prisma.committeeContribution.findFirst({
      where: { id: contribId, committeeId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Contribution not found' }, { status: 404 });
    }

    const txDate = new Date(validated.transactionDate);

    const isHistorical = body.isHistorical ?? false;

    const result = await prisma.$transaction(async (tx: any) => {
      // Soft-delete old ledger entry first
      await softDeleteLedgerEntry(tx, {
        link: { committeeContribId: contribId },
        userId,
        type: 'COMMITTEE_CONTRIBUTION',
        amount: existing.actualAmount,
        sourceAccountId: existing.accountId,
        transactionDate: existing.transactionDate,
      });

      // Verify the old entry was actually soft-deleted before creating replacement
      const orphanCheck = await tx.transaction.findFirst({
        where: {
          committeeContribId: contribId,
          userId,
          isDeleted: false,
        },
      });
      if (orphanCheck) {
        // Force soft-delete the specific linked entry to prevent double-counting
        await tx.transaction.update({
          where: { id: orphanCheck.id },
          data: { isDeleted: true, deletedAt: new Date() },
        });
      }

      const contribution = await tx.committeeContribution.update({
        where: { id: contribId },
        data: {
          entryId: validated.entryId,
          roundId: validated.roundId || null,
          accountId: validated.accountId,
          expectedAmount: validated.expectedAmount,
          actualAmount: validated.actualAmount,
          profitDeduction: validated.profitDeduction ?? 0,
          status: validated.status ?? 'PAID',
          transactionDate: txDate,
          notes: validated.notes,
        },
        include: { entry: true, account: true, round: true },
      });

      await tx.transaction.create({
        data: {
          userId,
          sourceAccountId: validated.accountId,
          type: 'COMMITTEE_CONTRIBUTION',
          amount: validated.actualAmount,
          description: `Committee contribution: ${committee.name}`,
          transactionDate: txDate,
          committeeContribId: contribId,
          isHistorical,
        },
      });

      return contribution;
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

// DELETE /api/committees/:id/contributions/:contribId
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: committeeId, contribId } = await params;
    const userId = (session.user as { id: string }).id;

    const committee = await prisma.committee.findFirst({
      where: { id: committeeId, userId },
    });
    if (!committee) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 });
    }

    const existing = await prisma.committeeContribution.findFirst({
      where: { id: contribId, committeeId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Contribution not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx: any) => {
      await softDeleteLedgerEntry(tx, {
        link: { committeeContribId: contribId },
        userId,
        type: 'COMMITTEE_CONTRIBUTION',
        amount: existing.actualAmount,
        sourceAccountId: existing.accountId,
        transactionDate: existing.transactionDate,
      });
      await tx.committeeContribution.delete({ where: { id: contribId } });
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
