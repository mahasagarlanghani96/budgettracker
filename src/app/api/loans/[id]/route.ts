import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { loanUpdateSchema } from '@/lib/validations/schemas';
import { softDeleteLedgerEntry } from '@/lib/ledger';
import Decimal from 'decimal.js';

// GET /api/loans/:id
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const loan = await prisma.loan.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
      include: {
        person: true,
        account: true,
        repayments: {
          orderBy: { transactionDate: 'desc' },
        },
      },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const totalRepaid = loan.repayments.reduce(
      (sum: Decimal, r: { amount: { toString(): string } }) => sum.plus(r.amount.toString()),
      new Decimal(0)
    );
    const outstanding = Decimal.max(new Decimal(loan.amount.toString()).minus(totalRepaid), 0);

    return NextResponse.json({
      data: {
        ...loan,
        totalRepaid: totalRepaid.toString(),
        remainingAmount: outstanding.toString(),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/loans/:id — update status or details
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = loanUpdateSchema.parse(body);

    const userId = (session.user as { id: string }).id;

    const existing = await prisma.loan.findFirst({
      where: { id, userId },
      include: { person: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    if (validated.personId) {
      const person = await prisma.person.findFirst({ where: { id: validated.personId, userId } });
      if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }
    if (validated.accountId) {
      const account = await prisma.account.findFirst({ where: { id: validated.accountId, userId } });
      if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const newAmount = validated.amount ?? parseFloat(existing.amount.toString());

    if (validated.status === 'SETTLED') {
      const repayments = await prisma.transaction.findMany({
        where: { loanId: id, isDeleted: false, type: { in: ['LOAN_REPAYMENT_RECEIVED', 'LOAN_REPAYMENT_MADE'] } },
        select: { amount: true },
      });
      const totalRepaid = repayments.reduce((sum, r) => sum.plus(r.amount.toString()), new Decimal(0));
      const outstanding = new Decimal(newAmount).minus(totalRepaid);
      if (outstanding.greaterThan(0)) {
        return NextResponse.json(
          { error: `Cannot settle loan with outstanding balance of ${outstanding.toFixed(2)}. Record all repayments first.` },
          { status: 400 }
        );
      }
    }

    const amountChanged = validated.amount !== undefined;
    const directionChanged = validated.direction !== undefined && validated.direction !== existing.direction;
    const accountChanged = validated.accountId !== undefined && validated.accountId !== existing.accountId;
    const dateChanged = validated.transactionDate !== undefined;
    const personChanged = validated.personId !== undefined && validated.personId !== existing.personId;
    const needsTxUpdate = amountChanged || directionChanged || accountChanged || dateChanged || personChanged || validated.isHistorical !== undefined;

    const result = await prisma.$transaction(async (tx: any) => {
      const finalDirection = validated.direction ?? existing.direction;
      const finalAccountId = validated.accountId ?? existing.accountId;
      const finalPersonId = validated.personId ?? existing.personId;
      const finalDate = validated.transactionDate ? new Date(validated.transactionDate) : existing.transactionDate;

      const totalRepaid = (await tx.loanRepayment.aggregate({
        where: { loanId: id },
        _sum: { amount: true },
      }))._sum.amount || 0;
      const remainingAmount = Math.max(newAmount - parseFloat(totalRepaid.toString()), 0);

      const loan = await tx.loan.update({
        where: { id },
        data: {
          status: validated.status,
          amount: validated.amount,
          direction: validated.direction,
          personId: validated.personId,
          accountId: validated.accountId,
          transactionDate: validated.transactionDate ? new Date(validated.transactionDate) : undefined,
          notes: validated.notes,
          dueDate: validated.dueDate ? new Date(validated.dueDate) : validated.dueDate === null ? null : undefined,
          interestRate: validated.interestRate,
          isPrivate: validated.isPrivate,
          remainingAmount: amountChanged ? remainingAmount : undefined,
        },
      });

      if (needsTxUpdate) {
        const oldType = existing.direction === 'GIVEN' ? 'LOAN_GIVEN' : 'LOAN_TAKEN';
        const oldIsInflow = existing.direction === 'TAKEN';
        await softDeleteLedgerEntry(tx, {
          link: { loanId: id },
          userId,
          type: oldType,
          amount: existing.amount,
          accountId: existing.accountId,
          accountField: oldIsInflow ? 'destAccountId' : 'sourceAccountId',
          transactionDate: existing.transactionDate,
          personId: existing.personId,
        });

        const newType = finalDirection === 'GIVEN' ? 'LOAN_GIVEN' : 'LOAN_TAKEN';
        const newIsInflow = finalDirection === 'TAKEN';
        const person = finalPersonId !== existing.personId
          ? await tx.person.findFirst({ where: { id: finalPersonId } })
          : existing.person;

        await tx.transaction.create({
          data: {
            userId,
            ...(newIsInflow
              ? { destAccountId: finalAccountId }
              : { sourceAccountId: finalAccountId }),
            type: newType,
            amount: newAmount,
            description: `Loan ${finalDirection === 'GIVEN' ? 'given to' : 'taken from'} ${person.name}`,
            transactionDate: finalDate,
            personId: finalPersonId,
            loanId: id,
            isHistorical: validated.isHistorical ?? true,
          },
        });
      }

      return loan;
    });

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/loans/:id — refuse if any repayments exist; soft-delete linked ledger rows
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const userId = (session.user as { id: string }).id;

    const existing = await prisma.loan.findFirst({
      where: { id, userId },
      include: { _count: { select: { repayments: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    if (existing._count.repayments > 0) {
      return NextResponse.json(
        { error: `Cannot delete a loan with ${existing._count.repayments} repayment(s). Remove all repayments first.` },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx: any) => {
      // Soft-delete all transactions linked to this loan (both linked and unlinked legacy)
      await tx.transaction.updateMany({
        where: { loanId: id, userId, isDeleted: false },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      // Also catch unlinked legacy transactions by matching type + account + person
      const type = existing.direction === 'GIVEN' ? 'LOAN_GIVEN' : 'LOAN_TAKEN';
      const acctField = existing.direction === 'TAKEN' ? 'destAccountId' : 'sourceAccountId';
      await tx.transaction.updateMany({
        where: {
          userId, type, loanId: null, isDeleted: false,
          [acctField]: existing.accountId,
          personId: existing.personId,
        },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      await tx.loan.delete({ where: { id } });
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/loans/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
