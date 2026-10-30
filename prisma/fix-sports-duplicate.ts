import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const feeId = 'cmvp33udn0009jq08r8wusw71';

  // Find all SPORTS_FEE_RECEIVED transactions linked to this fee
  const txns = await prisma.transaction.findMany({
    where: {
      type: 'SPORTS_FEE_RECEIVED',
      isDeleted: false,
      OR: [
        { sportsMatchFeeId: feeId },
        {
          sportsMatchFeeId: null,
          destAccountId: 'cmupc6cqc000sjr049xg69gmj',
          personId: null,
        },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${txns.length} transactions for fee ${feeId}:`);
  for (const tx of txns) {
    console.log(`  ${tx.id} | amount: ${tx.amount} | date: ${tx.transactionDate.toISOString().split('T')[0]} | linked: ${tx.sportsMatchFeeId ? 'yes' : 'no'} | historical: ${tx.isHistorical}`);
  }

  // Keep the one with sportsMatchFeeId set (the correct one), soft-delete the old unlinked one
  const duplicates = txns.filter(tx => tx.sportsMatchFeeId !== feeId);
  if (duplicates.length > 0) {
    for (const dup of duplicates) {
      await prisma.transaction.update({
        where: { id: dup.id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      console.log(`Soft-deleted duplicate: ${dup.id} (amount: ${dup.amount})`);
    }
  } else {
    console.log('No unlinked duplicates found. Listing all SPORTS_FEE_RECEIVED for this account:');
    const all = await prisma.transaction.findMany({
      where: {
        type: 'SPORTS_FEE_RECEIVED',
        isDeleted: false,
        destAccountId: 'cmupc6cqc000sjr049xg69gmj',
      },
      orderBy: { createdAt: 'asc' },
    });
    for (const tx of all) {
      console.log(`  ${tx.id} | amount: ${tx.amount} | date: ${tx.transactionDate.toISOString().split('T')[0]} | feeId: ${tx.sportsMatchFeeId || 'null'} | desc: ${tx.description}`);
    }
  }

  console.log('Done.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
