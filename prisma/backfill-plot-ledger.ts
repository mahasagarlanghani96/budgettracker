import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Backfilling missing ledger entries...\n');

  // ─── Plot Payments ───
  console.log('=== Plot Payments ===');
  const plotPayments = await prisma.plotPayment.findMany({
    include: {
      plot: { select: { userId: true, name: true } },
      transactions: { where: { isDeleted: false }, select: { id: true } },
    },
    orderBy: { transactionDate: 'asc' },
  });

  let plotCreated = 0;
  for (const payment of plotPayments) {
    if (payment.transactions.length > 0) continue;
    await prisma.transaction.create({
      data: {
        userId: payment.plot.userId,
        sourceAccountId: payment.accountId,
        type: 'PLOT_PAYMENT',
        amount: payment.amount,
        description: `Plot payment: ${payment.plot.name}`,
        transactionDate: payment.transactionDate,
        plotPaymentId: payment.id,
        isHistorical: true,
      },
    });
    plotCreated++;
    console.log(`  ${payment.plot.name} — Rs. ${payment.amount} on ${payment.transactionDate.toISOString().split('T')[0]}`);
  }
  console.log(`  Created: ${plotCreated}, Skipped: ${plotPayments.length - plotCreated}\n`);

  // ─── Savings Transactions ───
  console.log('=== Savings Transactions ===');
  const savingsTxs = await prisma.savingsTransaction.findMany({
    include: {
      savingsGoal: { select: { userId: true, name: true } },
      transactions: { where: { isDeleted: false }, select: { id: true } },
    },
    orderBy: { transactionDate: 'asc' },
  });

  let savingsCreated = 0;
  for (const stx of savingsTxs) {
    if (stx.transactions.length > 0) continue;
    const txType = stx.type === 'DEPOSIT' ? 'SAVINGS_DEPOSIT' : 'SAVINGS_WITHDRAWAL';
    const accountField = stx.type === 'DEPOSIT'
      ? { sourceAccountId: stx.accountId }
      : { destAccountId: stx.accountId };
    await prisma.transaction.create({
      data: {
        userId: stx.savingsGoal.userId,
        ...accountField,
        type: txType,
        amount: stx.amount,
        description: `Savings ${stx.type.toLowerCase()}: ${stx.savingsGoal.name}`,
        transactionDate: stx.transactionDate,
        savingsTransId: stx.id,
        isHistorical: true,
      },
    });
    savingsCreated++;
    console.log(`  ${stx.savingsGoal.name} — ${stx.type} Rs. ${stx.amount} on ${stx.transactionDate.toISOString().split('T')[0]}`);
  }
  console.log(`  Created: ${savingsCreated}, Skipped: ${savingsTxs.length - savingsCreated}\n`);

  // ─── Loan Repayments ───
  console.log('=== Loan Repayments ===');
  const repayments = await prisma.loanRepayment.findMany({
    include: {
      loan: { select: { userId: true, direction: true, person: { select: { name: true } } } },
      transactions: { where: { isDeleted: false }, select: { id: true } },
    },
    orderBy: { transactionDate: 'asc' },
  });

  let repayCreated = 0;
  for (const rep of repayments) {
    if (rep.transactions.length > 0) continue;
    if (!rep.loan) continue;
    const loan = rep.loan;
    const txType = loan.direction === 'GIVEN' ? 'LOAN_REPAYMENT_RECEIVED' : 'LOAN_REPAYMENT_MADE';
    const accountField = loan.direction === 'GIVEN'
      ? { destAccountId: rep.accountId }
      : { sourceAccountId: rep.accountId };
    await prisma.transaction.create({
      data: {
        userId: loan.userId,
        ...accountField,
        type: txType,
        amount: rep.amount,
        description: `Loan repayment: ${loan.person?.name || 'Unknown'}`,
        transactionDate: rep.transactionDate,
        loanRepaymentId: rep.id,
        isHistorical: true,
      },
    });
    repayCreated++;
    console.log(`  ${loan.person?.name} — Rs. ${rep.amount} on ${rep.transactionDate.toISOString().split('T')[0]}`);
  }
  console.log(`  Created: ${repayCreated}, Skipped: ${repayments.length - repayCreated}\n`);

  // ─── Committee Contributions ───
  console.log('=== Committee Contributions ===');
  const contribs = await prisma.committeeContribution.findMany({
    include: {
      committee: { select: { userId: true, name: true } },
      transactions: { where: { isDeleted: false }, select: { id: true } },
    },
    orderBy: { transactionDate: 'asc' },
  });

  let contribCreated = 0;
  for (const c of contribs) {
    if (c.transactions.length > 0) continue;
    await prisma.transaction.create({
      data: {
        userId: c.committee.userId,
        sourceAccountId: c.accountId,
        type: 'COMMITTEE_CONTRIBUTION',
        amount: c.actualAmount,
        description: `Committee contribution: ${c.committee.name}`,
        transactionDate: c.transactionDate,
        committeeContribId: c.id,
        isHistorical: true,
      },
    });
    contribCreated++;
    console.log(`  ${c.committee.name} — Rs. ${c.actualAmount} on ${c.transactionDate.toISOString().split('T')[0]}`);
  }
  console.log(`  Created: ${contribCreated}, Skipped: ${contribs.length - contribCreated}\n`);

  // ─── Committee Receivings ───
  console.log('=== Committee Receivings ===');
  const receivings = await prisma.committeeReceiving.findMany({
    include: {
      committee: { select: { userId: true, name: true } },
      transactions: { where: { isDeleted: false }, select: { id: true } },
    },
    orderBy: { transactionDate: 'asc' },
  });

  let recvCreated = 0;
  for (const r of receivings) {
    if (r.transactions.length > 0) continue;
    await prisma.transaction.create({
      data: {
        userId: r.committee.userId,
        destAccountId: r.accountId,
        type: 'COMMITTEE_RECEIVING',
        amount: r.actualAmount,
        description: `Committee receiving: ${r.committee.name}`,
        transactionDate: r.transactionDate,
        committeeRecvId: r.id,
        isHistorical: true,
      },
    });
    recvCreated++;
    console.log(`  ${r.committee.name} — Rs. ${r.actualAmount} on ${r.transactionDate.toISOString().split('T')[0]}`);
  }
  console.log(`  Created: ${recvCreated}, Skipped: ${receivings.length - recvCreated}\n`);

  // ─── Summary ───
  const total = plotCreated + savingsCreated + repayCreated + contribCreated + recvCreated;
  console.log(`=== TOTAL: ${total} ledger entries created (all marked isHistorical=true) ===`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
