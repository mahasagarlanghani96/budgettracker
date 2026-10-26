import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sportsMatchFeeSchema } from '@/lib/validations/schemas';
import { softDeleteLedgerEntry } from '@/lib/ledger';

type Params = { params: Promise<{ id: string; feeId: string }> };

// PUT /api/sports/matches/:id/fees/:feeId
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: matchId, feeId } = await params;
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const validated = sportsMatchFeeSchema.parse(body);
    const isHistorical = body.isHistorical === true;

    const match = await prisma.sportsMatch.findFirst({
      where: { id: matchId, userId },
      include: { team: { select: { name: true } } },
    });
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    const fee = await prisma.sportsMatchFee.findFirst({ where: { id: feeId, matchId } });
    if (!fee) return NextResponse.json({ error: 'Fee not found' }, { status: 404 });

    const player = await prisma.sportsPlayer.findFirst({
      where: { id: validated.playerId, teamId: match.teamId },
    });
    if (!player) return NextResponse.json({ error: 'Player not found in this team' }, { status: 404 });

    if (validated.accountId) {
      const account = await prisma.account.findFirst({ where: { id: validated.accountId, userId } });
      if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const wasPaid = fee.isPaid;
    const nowPaid = validated.isPaid;
    const txDate = validated.paidDate ? new Date(validated.paidDate) : new Date();

    const result = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.sportsMatchFee.update({
        where: { id: feeId },
        data: {
          playerId: validated.playerId,
          amount: validated.amount,
          accountId: validated.accountId || null,
          isPaid: validated.isPaid,
          paidDate: validated.paidDate ? new Date(validated.paidDate) : null,
          notes: validated.notes,
        },
      });

      // Was paid → now unpaid: soft-delete the ledger entry
      if (wasPaid && !nowPaid) {
        await softDeleteLedgerEntry(tx, {
          link: { sportsMatchFeeId: feeId },
          userId,
          type: 'SPORTS_FEE_RECEIVED',
          amount: fee.amount,
          accountId: fee.accountId || undefined,
          accountField: 'destAccountId',
          transactionDate: fee.paidDate || new Date(),
        });
      }

      // Was not paid → now paid: create ledger entry
      if (!wasPaid && nowPaid && validated.accountId) {
        await tx.transaction.create({
          data: {
            userId,
            destAccountId: validated.accountId,
            type: 'SPORTS_FEE_RECEIVED',
            amount: validated.amount,
            description: `Match fee: ${player.name} — ${match.team.name}${match.opponent ? ` vs ${match.opponent}` : ''}`,
            transactionDate: txDate,
            sportsMatchFeeId: feeId,
            isHistorical,
          },
        });
      }

      // Was paid → still paid but amount/account changed: update ledger
      if (wasPaid && nowPaid) {
        const existing = await tx.transaction.findFirst({
          where: { sportsMatchFeeId: feeId, isDeleted: false },
        });
        if (existing) {
          await tx.transaction.update({
            where: { id: existing.id },
            data: {
              destAccountId: validated.accountId || null,
              amount: validated.amount,
              transactionDate: txDate,
              isHistorical,
            },
          });
        } else if (validated.accountId) {
          await tx.transaction.create({
            data: {
              userId,
              destAccountId: validated.accountId,
              type: 'SPORTS_FEE_RECEIVED',
              amount: validated.amount,
              description: `Match fee: ${player.name} — ${match.team.name}${match.opponent ? ` vs ${match.opponent}` : ''}`,
              transactionDate: txDate,
              sportsMatchFeeId: feeId,
              isHistorical,
            },
          });
        }
      }

      return updated;
    });

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'This player already has a fee for this match' }, { status: 409 });
    }
    console.error('PUT /api/sports/matches/[id]/fees/[feeId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/sports/matches/:id/fees/:feeId
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: matchId, feeId } = await params;
    const userId = (session.user as { id: string }).id;

    const match = await prisma.sportsMatch.findFirst({ where: { id: matchId, userId } });
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    const fee = await prisma.sportsMatchFee.findFirst({ where: { id: feeId, matchId } });
    if (!fee) return NextResponse.json({ error: 'Fee not found' }, { status: 404 });

    await prisma.$transaction(async (tx: any) => {
      // Soft-delete any linked transaction
      if (fee.isPaid) {
        await softDeleteLedgerEntry(tx, {
          link: { sportsMatchFeeId: feeId },
          userId,
          type: 'SPORTS_FEE_RECEIVED',
          amount: fee.amount,
          accountId: fee.accountId || undefined,
          accountField: 'destAccountId',
          transactionDate: fee.paidDate || new Date(),
        });
      }
      await tx.sportsMatchFee.delete({ where: { id: feeId } });
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/sports/matches/[id]/fees/[feeId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
