import Decimal from 'decimal.js';

// Module records (loans, repayments, plot payments, savings transactions) each
// write one ledger row to `transactions`, and account balances are derived from
// those rows. Editing or deleting the record must therefore edit or soft-delete
// its ledger row too.
//
// New rows point back at their record through a link column (loanId,
// plotPaymentId, ...). Rows written before those links existed have them all
// null, so fall back to matching the fields the create handler copied over.

const LINK_FIELDS = [
  'loanId',
  'loanRepaymentId',
  'committeeContribId',
  'committeeRecvId',
  'savingsTransId',
  'investmentId',
  'plotPaymentId',
] as const;

type LinkField = (typeof LINK_FIELDS)[number];

interface LedgerLookup {
  link: Partial<Record<LinkField, string>>;
  userId: string;
  type: string;
  amount: { toString(): string };
  sourceAccountId: string;
  transactionDate: Date;
  personId?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function findLedgerEntry(tx: any, lookup: LedgerLookup) {
  const { link, userId, type } = lookup;

  const linked = await tx.transaction.findFirst({
    where: { userId, type, isDeleted: false, ...link },
  });
  if (linked) return linked;

  const unlinked = Object.fromEntries(LINK_FIELDS.map((f) => [f, null]));
  return tx.transaction.findFirst({
    where: {
      ...unlinked,
      userId,
      type,
      isDeleted: false,
      amount: lookup.amount.toString(),
      sourceAccountId: lookup.sourceAccountId,
      transactionDate: lookup.transactionDate,
      ...(lookup.personId ? { personId: lookup.personId } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function softDeleteLedgerEntry(tx: any, lookup: LedgerLookup) {
  const entry = await findLedgerEntry(tx, lookup);
  if (!entry) return;
  await tx.transaction.update({
    where: { id: entry.id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
}

// Recompute a loan's remaining amount from its repayments. A loan that was
// auto-settled by reaching zero reopens if a repayment is reduced or removed;
// a loan settled manually (with a balance left) or written off keeps its status.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recalculateLoan(tx: any, loanId: string) {
  const loan = await tx.loan.findUnique({ where: { id: loanId }, include: { repayments: true } });
  if (!loan) return;

  const repaid = loan.repayments.reduce(
    (sum: Decimal, r: { amount: { toString(): string } }) => sum.plus(r.amount.toString()),
    new Decimal(0)
  );
  const remaining = Decimal.max(new Decimal(loan.amount.toString()).minus(repaid), 0);
  const wasAutoSettled = loan.status === 'SETTLED' && new Decimal(loan.remainingAmount.toString()).lte(0);

  let status = loan.status;
  if (loan.status === 'ACTIVE' && remaining.lte(0)) status = 'SETTLED';
  else if (wasAutoSettled && remaining.gt(0)) status = 'ACTIVE';

  await tx.loan.update({
    where: { id: loanId },
    data: { remainingAmount: remaining.toString(), status },
  });
}
