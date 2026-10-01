import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Mark all LOAN_GIVEN and LOAN_TAKEN transactions as historical
  const historicalResult = await prisma.transaction.updateMany({
    where: {
      type: { in: ['LOAN_GIVEN', 'LOAN_TAKEN'] },
      isDeleted: false,
      isHistorical: false,
    },
    data: { isHistorical: true },
  });
  console.log(`Marked ${historicalResult.count} loan creation transactions as historical`);

  // 2. Fix LOAN_TAKEN transactions: move sourceAccountId → destAccountId
  const takenTxns = await prisma.transaction.findMany({
    where: {
      type: 'LOAN_TAKEN',
      isDeleted: false,
      sourceAccountId: { not: null },
      destAccountId: null,
    },
    select: { id: true, sourceAccountId: true },
  });

  for (const tx of takenTxns) {
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { destAccountId: tx.sourceAccountId, sourceAccountId: null },
    });
  }
  console.log(`Fixed ${takenTxns.length} LOAN_TAKEN transactions (sourceAccountId → destAccountId)`);

  // 3. Fix LOAN_REPAYMENT_RECEIVED transactions: move sourceAccountId → destAccountId
  const repReceivedTxns = await prisma.transaction.findMany({
    where: {
      type: 'LOAN_REPAYMENT_RECEIVED',
      isDeleted: false,
      sourceAccountId: { not: null },
      destAccountId: null,
    },
    select: { id: true, sourceAccountId: true },
  });

  for (const tx of repReceivedTxns) {
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { destAccountId: tx.sourceAccountId, sourceAccountId: null },
    });
  }
  console.log(`Fixed ${repReceivedTxns.length} LOAN_REPAYMENT_RECEIVED transactions (sourceAccountId → destAccountId)`);

  console.log('Done.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
