import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Mark all committee contribution/receiving and plot payment transactions
  // created BEFORE today as historical (tracking only, no balance impact)
  const result = await prisma.transaction.updateMany({
    where: {
      type: { in: ['COMMITTEE_CONTRIBUTION', 'COMMITTEE_RECEIVING', 'PLOT_PAYMENT'] },
      isDeleted: false,
      isHistorical: false,
      transactionDate: { lt: today },
    },
    data: { isHistorical: true },
  });

  console.log(`Marked ${result.count} old transactions as historical`);

  // Verify: show what's NOT historical (should be today's transactions only)
  const remaining = await prisma.transaction.findMany({
    where: {
      type: { in: ['COMMITTEE_CONTRIBUTION', 'COMMITTEE_RECEIVING', 'PLOT_PAYMENT'] },
      isDeleted: false,
      isHistorical: false,
    },
    select: { id: true, type: true, amount: true, description: true, transactionDate: true },
  });

  console.log(`\nNon-historical transactions (should affect balance):`);
  for (const tx of remaining) {
    console.log(`  ${tx.type} | ${tx.amount} | ${tx.description} | ${tx.transactionDate.toISOString().split('T')[0]}`);
  }
  if (remaining.length === 0) {
    console.log('  (none)');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
